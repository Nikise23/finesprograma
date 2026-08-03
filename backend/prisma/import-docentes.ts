/**
 * Importa docentes activos desde archivos .xls (HTML export).
 * Uso: npx ts-node prisma/import-docentes.ts
 */
import { PrismaClient, Rol } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { normalizeUpper } from './text-utils';

const prisma = new PrismaClient();

const FILES = [
  'c:/Users/nicfe/Downloads/Listado Docentes Activos.xls',
  'c:/Users/nicfe/Downloads/Listado Docentes Activos (1).xls',
  'c:/Users/nicfe/Downloads/Listado Docentes Activos (2).xls',
  'c:/Users/nicfe/Downloads/Listado Docentes Activos (3).xls',
  'c:/Users/nicfe/Downloads/Listado Docentes Activos (4).xls',
  'c:/Users/nicfe/Downloads/Listado Docentes Activos (5).xls',
];

const DEFAULT_PASSWORD = 'Docente1234';

interface RowData {
  apellido: string;
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  comision: string;
  cens: string;
  institucion: string;
  direccion: string;
  localidad: string;
}

function readWorkbook(file: string): XLSX.WorkBook {
  const buf = fs.readFileSync(file);
  // Los .xls son HTML exportado en Windows-1252 / Latin-1
  return XLSX.read(buf.toString('latin1'), { type: 'string' });
}

function cleanStr(v: unknown): string {
  if (v == null) return '';
  return normalizeUpper(String(v).trim());
}

function cleanEmail(v: unknown): string {
  if (v == null) return '';
  return String(v).trim().toLowerCase();
}

function normalizeDni(v: unknown): string {
  return cleanStr(v).replace(/\D/g, '');
}

function normalizePhone(v: string): string | undefined {
  const p = v.replace(/^0-0$/, '').trim();
  return p || undefined;
}

function parseFiles() {
  const docentes = new Map<
    string,
    {
      apellido: string;
      nombre: string;
      dni: string;
      telefono?: string;
      email?: string;
      comisiones: Set<string>;
    }
  >();
  const comisiones = new Map<
    string,
    { cens: string; numero: string; institucion: string; direccion: string; localidad: string }
  >();
  const censNames = new Map<string, string>();

  for (const file of FILES) {
    if (!fs.existsSync(file)) {
      console.warn('Archivo no encontrado:', file);
      continue;
    }
    const wb = readWorkbook(file);
    for (const sheetName of wb.SheetNames) {
      if (sheetName === 'Sheet1') continue;
      const row = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
        header: 1,
        defval: '',
      })[0];
      if (!row || cleanStr(row[0]) === 'Apellido' || !cleanStr(row[0])) continue;

      const data: RowData = {
        apellido: cleanStr(row[0]),
        nombre: cleanStr(row[1]),
        dni: normalizeDni(row[2]),
        telefono: cleanStr(row[6]),
        email: cleanEmail(row[7]),
        comision: cleanStr(row[10]),
        cens: cleanStr(row[12]),
        institucion: cleanStr(row[13]),
        direccion: cleanStr(row[14]),
        localidad: cleanStr(row[15]),
      };

      if (data.dni.length < 6) continue;

      if (!docentes.has(data.dni)) {
        docentes.set(data.dni, {
          apellido: data.apellido,
          nombre: data.nombre,
          dni: data.dni,
          telefono: normalizePhone(data.telefono),
          email: data.email.includes('@') ? data.email : undefined,
          comisiones: new Set(),
        });
      } else {
        const d = docentes.get(data.dni)!;
        if (!d.email && data.email.includes('@')) d.email = data.email;
        if (!d.telefono) d.telefono = normalizePhone(data.telefono);
      }

      if (data.comision && data.cens) {
        docentes.get(data.dni)!.comisiones.add(`${data.cens}|${data.comision}`);
        const key = `${data.cens}|${data.comision}`;
        if (!comisiones.has(key)) {
          comisiones.set(key, {
            cens: data.cens,
            numero: data.comision,
            institucion: data.institucion,
            direccion: data.direccion,
            localidad: data.localidad,
          });
        }
        if (data.institucion && !censNames.has(data.cens)) {
          censNames.set(data.cens, data.institucion);
        }
      }
    }
  }

  return { docentes, comisiones, censNames };
}

async function ensureEmail(dni: string, email?: string): Promise<string> {
  const fallback = `${dni}@docentes.fines.local`;
  if (!email || !email.includes('@')) return fallback;

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (!existing) return email;

  const docenteWithEmail = await prisma.docente.findUnique({ where: { email } });
  if (docenteWithEmail?.dni === dni) return email;

  return fallback;
}

async function main() {
  const { docentes, comisiones, censNames } = parseFiles();
  console.log(
    `Parsed: ${docentes.size} docentes, ${comisiones.size} comisiones, ${censNames.size} CENS`,
  );

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const censDbMap = new Map<string, string>();
  const sedeDbMap = new Map<string, string>();
  const comisionDbMap = new Map<string, string>();

  // Crear CENS
  for (const [censCode, nombre] of censNames) {
    const censNombre = `CENS ${censCode} — ${nombre}`;
    let cens = await prisma.cens.findFirst({
      where: { nombre: { contains: censCode } },
    });
    if (!cens) {
      cens = await prisma.cens.create({
        data: {
          nombre: censNombre,
          direccion: 'A DEFINIR',
          contacto: 'IMPORTADO DESDE LISTADO DOCENTES',
          directora: 'A DEFINIR',
        },
      });
    } else {
      cens = await prisma.cens.update({
        where: { id: cens.id },
        data: { nombre: censNombre },
      });
    }
    censDbMap.set(censCode, cens.id);

    const sedeKey = `${censCode}|${nombre}`;
    let sede = await prisma.sede.findFirst({
      where: { censId: cens.id, nombre },
    });
    if (!sede) {
      sede = await prisma.sede.create({
        data: { censId: cens.id, nombre, direccion: nombre },
      });
    } else {
      sede = await prisma.sede.update({
        where: { id: sede.id },
        data: { nombre, direccion: nombre },
      });
    }
    sedeDbMap.set(sedeKey, sede.id);
  }

  // Crear comisiones
  for (const [key, com] of comisiones) {
    const sedeKey = `${com.cens}|${com.institucion}`;
    let sedeId = sedeDbMap.get(sedeKey);
    if (!sedeId) {
      const censId = censDbMap.get(com.cens);
      if (!censId) continue;
      const sede = await prisma.sede.create({
        data: {
          censId,
          nombre: com.institucion || `SEDE ${com.cens}`,
          direccion: com.direccion || com.localidad || 'A DEFINIR',
        },
      });
      sedeId = sede.id;
      sedeDbMap.set(sedeKey, sedeId);
    }

    let comision = await prisma.comision.findFirst({
      where: { sedeId, numero: com.numero },
    });
    if (!comision) {
      comision = await prisma.comision.create({
        data: {
          sedeId,
          numero: com.numero,
          direccion: com.direccion || 'A DEFINIR',
          referente: 'IMPORTADO',
          contactos: [],
          cicloLectivo: '2026',
        },
      });
    } else {
      comision = await prisma.comision.update({
        where: { id: comision.id },
        data: {
          direccion: com.direccion || comision.direccion,
        },
      });
    }
    comisionDbMap.set(key, comision.id);
  }

  let created = 0;
  let updated = 0;
  let assigned = 0;
  let errors = 0;

  for (const doc of docentes.values()) {
    try {
      const email = await ensureEmail(doc.dni, doc.email);
      const existing = await prisma.docente.findUnique({ where: { dni: doc.dni } });

      let docenteId: string;
      if (existing) {
        await prisma.docente.update({
          where: { dni: doc.dni },
          data: {
            apellido: doc.apellido,
            nombre: doc.nombre,
            telefono: doc.telefono,
            email,
            activo: true,
          },
        });
        await prisma.usuario.update({
          where: { id: existing.usuarioId },
          data: { activo: true, email },
        });
        docenteId = existing.id;
        updated++;
      } else {
        const createdDoc = await prisma.docente.create({
          data: {
            apellido: doc.apellido,
            nombre: doc.nombre,
            dni: doc.dni,
            email,
            telefono: doc.telefono,
            usuario: {
              create: { email, passwordHash, rol: Rol.DOCENTE },
            },
          },
        });
        docenteId = createdDoc.id;
        created++;
      }

      for (const comKey of doc.comisiones) {
        const comisionId = comisionDbMap.get(comKey);
        if (!comisionId) continue;
        await prisma.docenteComision.deleteMany({
          where: { docenteId, comisionId, materiaId: null },
        });
        const link = await prisma.docenteComision.findFirst({
          where: { docenteId, comisionId },
        });
        if (!link) {
          await prisma.docenteComision.create({
            data: { docenteId, comisionId },
          });
        }
        assigned++;
      }
    } catch (e) {
      errors++;
      console.error(`Error DNI ${doc.dni}:`, (e as Error).message);
    }
  }

  console.log('\n=== Importación completada ===');
  console.log(`Docentes creados: ${created}`);
  console.log(`Docentes actualizados: ${updated}`);
  console.log(`Asignaciones docente-comisión: ${assigned}`);
  console.log(`Errores: ${errors}`);
  console.log(`Contraseña inicial: ${DEFAULT_PASSWORD}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
