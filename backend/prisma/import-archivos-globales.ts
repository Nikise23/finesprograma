/**
 * Importa comisiones + docentes/materias desde "Archivos Globales" (texto o .xls HTML).
 *
 * Uso:
 *   npx ts-node prisma/import-archivos-globales.ts "C:/ruta/Archivos Globales.txt"
 *   npx ts-node prisma/import-archivos-globales.ts "C:/ruta/Archivos Globales.xls"
 */
import { PrismaClient, Rol } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { normalizeUpper } from './text-utils';
import { seedMaterias } from './seed-materias';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Docente1234';

/** Alias cortos del archivo global → nombre oficial del plan */
const MATERIA_ALIASES: Record<string, string> = {
  'QUIM TEC Y SOCIEDAD': 'QUÍMICA, TECNOLOGÍAS Y SOCIEDAD',
  'QUIMICA TEC Y SOCIEDAD': 'QUÍMICA, TECNOLOGÍAS Y SOCIEDAD',
  'PRACT DEL LENG 3': 'PRÁCTICAS DEL LENGUAJE 3',
  'PRACT DEL LENGUAJE 2': 'PRÁCTICAS DEL LENGUAJE 2',
  'PRACTICAS DEL LENGUAJE 1': 'PRÁCTICAS DEL LENGUAJE 1',
  'PRACTICAS DEL LENG 3': 'PRÁCTICAS DEL LENGUAJE 3',
  'TEC Y PRACT DIGIT 3': 'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 3',
  'TEC Y PRACT DIGIT 1': 'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 1',
  'TEC Y PRACT DIGIT 2': 'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 2',
  'TEC Y PRACT DIGITALES 2': 'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 2',
  'TECNOLOGIAS Y PRACTICAS DIGITALES 1': 'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 1',
  'TECNOLOGIAS Y PRACTICAS DIGITALES 3': 'TECNOLOGÍAS Y PRÁCTICAS DIGITALES 3',
  'EDUCAC FISICA 3': 'EDUCACIÓN FÍSICA 3',
  'EDUCACION FISICA 1': 'EDUCACIÓN FÍSICA 1',
  'EDUCACION FISICA 2': 'EDUCACIÓN FÍSICA 2',
  'EDUCACION FISICA 3': 'EDUCACIÓN FÍSICA 3',
  'EDUCAC FISICA 1': 'EDUCACIÓN FÍSICA 1',
  'EDUCAC FISICA 2': 'EDUCACIÓN FÍSICA 2',
  'PROBL SOC ARGENTINA': 'PROBLEMÁTICA SOCIAL ARGENTINA',
  'PROBLEMATICA SOCIAL ARGENTINA': 'PROBLEMÁTICA SOCIAL ARGENTINA',
  'PRACT DEL LENG 1': 'PRÁCTICAS DEL LENGUAJE 1',
  'PRACT DEL LENG 2': 'PRÁCTICAS DEL LENGUAJE 2',
  'EDUCAC ARTISTICA 1': 'EDUCACIÓN ARTÍSTICA 1',
  'EDUCAC ARTISTICA 2': 'EDUCACIÓN ARTÍSTICA 2',
  'EDUCAC ARTISTICA 3': 'EDUCACIÓN ARTÍSTICA 3',
  'EDUCACION ARTISTICA 1': 'EDUCACIÓN ARTÍSTICA 1',
  'EDUCACION ARTISTICA 2': 'EDUCACIÓN ARTÍSTICA 2',
  'EDUCACION ARTISTICA 3': 'EDUCACIÓN ARTÍSTICA 3',
  'CIENCIAS SOCIALES 1': 'CIENCIAS SOCIALES 1',
  'CIENCIAS SOCIALES 2': 'CIENCIAS SOCIALES 2',
  'MATEMATICA 1': 'MATEMÁTICA 1',
  'MATEMATICA 2': 'MATEMÁTICA 2',
  'MATEMATICA 3': 'MATEMÁTICA 3',
  'LENGUAJE ADICIONAL 1': 'LENGUAJE ADICIONAL 1',
  'LENGUAJE ADICIONAL 2': 'LENGUAJE ADICIONAL 2',
  'LENGUA ADICIONAL 1': 'LENGUAJE ADICIONAL 1',
  'LENGUA ADICIONAL 2': 'LENGUAJE ADICIONAL 2',
  'LENGUA ADICIONAL 3': 'LENGUA ADICIONAL 3',
  'BIOLOGIA AMBIENTE Y SALUD': 'BIOLOGÍA, AMBIENTE Y SALUD',
  'DERECHOS HUMANOS': 'DERECHOS HUMANOS',
  'SOCIOLOGIA': 'SOCIOLOGÍA',
  'FILOSOFIA': 'FILOSOFÍA',
  'COMUNICACION Y CULTURA': 'COMUNICACIÓN Y CULTURA',
  'METOD DE LA INVESTIGACION': 'METODOLOGÍA DE LA INVESTIGACIÓN',
  'METODOLOGIA DE LA INVESTIGACION': 'METODOLOGÍA DE LA INVESTIGACIÓN',
  'FISICA Y FEN NAT Y PROC PRODUC': 'FÍSICA, FENÓMENOS NATURALES Y PROCESO PRODUCTIVOS',
  'FISICA Y FEN NAT Y PROC PROD': 'FÍSICA, FENÓMENOS NATURALES Y PROCESO PRODUCTIVOS',
  'CIUDADANIA SOC Y CULT Y REL LAB': 'CIUDADANÍA, SOCIEDAD, CULTURA Y RELACIONES LABORALES',
  'PSICOLOGIA DEL DES SOCIAL E INST': 'PSICOLOGÍA DEL DESARROLLO, SOCIAL E INSTITUCIONAL',
};

interface MateriaSlot {
  codigo: string;
  materiaAlias: string;
  horario: string;
  docenteApellido: string;
  docenteNombre: string;
  cuil: string;
}

interface ComisionBlock {
  numero: string;
  cens: string;
  sede: string;
  cohorte: string;
  anioCursada: string;
  modulo: number;
  turno: string;
  direccion: string;
  cantidadEstudiantes?: number;
  materias: MateriaSlot[];
}

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normKey(s: string) {
  return stripAccents(normalizeUpper(s)).replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveMateriaNombre(alias: string, materias: { id: string; nombre: string; moduloId: number }[], moduloId: number) {
  const key = normKey(alias);
  const mapped = MATERIA_ALIASES[key] ?? alias;
  const mappedKey = normKey(mapped);
  const inModulo = materias.filter((m) => m.moduloId === moduloId);
  let hit = inModulo.find((m) => normKey(m.nombre) === mappedKey);
  if (!hit) hit = inModulo.find((m) => normKey(m.nombre).includes(mappedKey) || mappedKey.includes(normKey(m.nombre)));
  if (!hit) {
    // fuzzy: compare significant tokens
    const tokens = mappedKey.split(' ').filter((t) => t.length > 2);
    hit = inModulo.find((m) => {
      const n = normKey(m.nombre);
      return tokens.filter((t) => n.includes(t)).length >= Math.min(2, tokens.length);
    });
  }
  return hit ?? null;
}

function cuilToDni(cuil: string) {
  const digits = cuil.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(2, -1);
  return digits;
}

function readText(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    // Preferir .txt hermano generado, o pasar el .txt extraído
    const txtSibling = filePath.replace(/\.pdf$/i, '.txt');
    if (fs.existsSync(txtSibling)) return fs.readFileSync(txtSibling, 'utf8');
    throw new Error(
      `Para PDF usá el .txt extraído. Generá: "${txtSibling}" o pasá un .txt/.xls`,
    );
  }
  if (ext === '.xls' || ext === '.xlsx') {
    const buf = fs.readFileSync(filePath);
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buf.toString('latin1'), { type: 'string' });
    } catch {
      wb = XLSX.read(buf, { type: 'buffer' });
    }
    const parts: string[] = [];
    for (const name of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], { header: 1, defval: '' });
      for (const row of rows) {
        parts.push(row.map((c) => String(c ?? '').trim()).filter(Boolean).join(' '));
      }
      parts.push('');
    }
    return parts.join('\n');
  }
  return fs.readFileSync(filePath, 'utf8');
}

function splitMateriaHorario(rest: string): { materia: string; horario: string } {
  const m = rest.match(
    /^(.*?)\s+((?:Lunes|Martes|Miercoles|Miércoles|Jueves|Viernes|Sabado|Sábado)\b.*)$/i,
  );
  if (m) return { materia: m[1].trim(), horario: m[2].trim() };
  return { materia: rest.trim(), horario: '' };
}

export function parseArchivosGlobales(text: string): ComisionBlock[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l && !/^Plan de Finalizaci/i.test(l) && !/^-- \d+ of \d+ --$/i.test(l) && !/^Pagina \d+$/i.test(l));

  const blocks: ComisionBlock[] = [];
  let current: ComisionBlock | null = null;
  let pendingCodigo: string | null = null;
  let pendingMateria: string | null = null;
  let pendingHorario = '';

  const flushPending = () => {
    pendingCodigo = null;
    pendingMateria = null;
    pendingHorario = '';
  };

  for (const line of lines) {
    if (/DOCENTE SIN DESIGNAR/i.test(line)) {
      flushPending();
      continue;
    }

    const comMatch =
      line.match(/^\(?\s*\d+\)?\s*Comision:\s*(\d+)\s*\|\s*CENS:\s*(\d+)/i) ??
      line.match(/Comision:\s*(\d+)\s*\|\s*CENS:\s*(\d+)/i);
    if (comMatch) {
      if (current) blocks.push(current);
      current = {
        numero: comMatch[1].padStart(5, '0'),
        cens: comMatch[2],
        sede: '',
        cohorte: '',
        anioCursada: '',
        modulo: 0,
        turno: '',
        direccion: '',
        materias: [],
      };
      flushPending();
      continue;
    }
    if (!current) continue;

    const centro = line.match(/^Centro:\s*(.+)$/i);
    if (centro) {
      current.sede = centro[1].trim();
      continue;
    }

    if (/^Cohorte\b/i.test(line) || (/Ciencias Sociales/i.test(line) && /Marzo|Agosto|Julio|Diciembre/i.test(line))) {
      current.cohorte = line.replace(/^Cohorte\s+/i, '').trim();
      continue;
    }

    const anioMod =
      line.match(/Año:\s*(.+?)\s+Modulo:\s*(\d+)\s+Turno\s+(\w+)/i) ??
      line.match(/Ano:\s*(.+?)\s+Modulo:\s*(\d+)\s+Turno\s+(\w+)/i);
    if (anioMod) {
      current.anioCursada = anioMod[1].trim();
      current.modulo = parseInt(anioMod[2], 10);
      current.turno = anioMod[3].trim().toUpperCase();
      continue;
    }

    const dir = line.match(/^Direcci[oó]n:\s*(.+)$/i);
    if (dir) {
      current.direccion = dir[1].trim();
      continue;
    }

    const cant = line.match(/Cantidad de Estudiantes:\s*(\d+)/i);
    if (cant) {
      current.cantidadEstudiantes = parseInt(cant[1], 10);
      continue;
    }

    const codeOnly = line.match(/^(\d{4,5}\/[A-Z]{2,4})$/i);
    if (codeOnly) {
      pendingCodigo = codeOnly[1].toUpperCase();
      pendingMateria = null;
      pendingHorario = '';
      continue;
    }

    // Formato PDF: 00033/WQQ Quim Tec y Sociedad Martes 08:00 a 10:40
    const codeMat = line.match(/^(\d{4,5}\/[A-Z]{2,4})\s+(.+)$/i);
    if (codeMat) {
      pendingCodigo = codeMat[1].toUpperCase();
      const split = splitMateriaHorario(codeMat[2]);
      pendingMateria = split.materia;
      pendingHorario = split.horario;
      continue;
    }

    if (
      pendingCodigo &&
      !pendingMateria &&
      !/^(Lunes|Martes|Miercoles|Miércoles|Jueves|Viernes|Sabado|Sábado)/i.test(line) &&
      !/CUIL/i.test(line)
    ) {
      const split = splitMateriaHorario(line);
      pendingMateria = split.materia;
      pendingHorario = split.horario;
      continue;
    }

    if (pendingCodigo && /^(Lunes|Martes|Miercoles|Miércoles|Jueves|Viernes|Sabado|Sábado)/i.test(line)) {
      pendingHorario = (pendingHorario ? `${pendingHorario} ` : '') + line;
      continue;
    }

    const doc = line.match(/^(.+?)\s+CUIL\s+([\d-]+)\s*$/i);
    if (doc && pendingCodigo && pendingMateria) {
      const nombreCompleto = doc[1].replace(/,+\s*$/, '').trim();
      let apellido = nombreCompleto;
      let nombre = '';
      if (nombreCompleto.includes(',')) {
        const [a, ...rest] = nombreCompleto.split(',');
        apellido = a.trim();
        nombre = rest.join(',').trim();
      } else {
        const parts = nombreCompleto.split(/\s+/);
        apellido = parts[0] ?? '';
        nombre = parts.slice(1).join(' ');
      }
      // Casos tipo "VALDETTARO , 31953404" (DNI en el nombre)
      if (/^\d{7,8}$/.test(nombre.replace(/\D/g, '')) && nombre.replace(/\D/g, '').length >= 7) {
        nombre = apellido;
      }
      current.materias.push({
        codigo: pendingCodigo,
        materiaAlias: pendingMateria,
        horario: pendingHorario,
        docenteApellido: normalizeUpper(apellido),
        docenteNombre: normalizeUpper(nombre || apellido),
        cuil: doc[2].trim(),
      });
      flushPending();
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

async function ensureCensSede(censNumero: string, sedeNombre: string, direccion: string) {
  const censName = `CENS ${censNumero}`;
  let cens = await prisma.cens.findFirst({ where: { nombre: { contains: censNumero } } });
  if (!cens) {
    cens = await prisma.cens.create({
      data: {
        nombre: censName,
        direccion: direccion || 'Sin dirección',
        contacto: '',
        directora: '',
      },
    });
  }
  const sedeLabel = sedeNombre || 'Sede principal';
  let sede = await prisma.sede.findFirst({
    where: { censId: cens.id, nombre: { contains: sedeLabel.replace(/^Sede\s+/i, '') } },
  });
  if (!sede) {
    sede = await prisma.sede.findFirst({ where: { censId: cens.id, nombre: sedeLabel } });
  }
  if (!sede) {
    sede = await prisma.sede.create({
      data: {
        censId: cens.id,
        nombre: sedeLabel,
        direccion: direccion || 'Sin dirección',
      },
    });
  }
  return { cens, sede };
}

async function ensureDocente(apellido: string, nombre: string, cuil: string) {
  const dni = cuilToDni(cuil);
  const existing = await prisma.docente.findUnique({ where: { dni } });
  if (existing) {
    return existing;
  }
  const email = `d${dni}@fines.gob.ar`;
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, rol: Rol.DOCENTE },
  });
  return prisma.docente.create({
    data: {
      usuarioId: usuario.id,
      apellido,
      nombre: nombre || apellido,
      dni,
      email,
      telefono: null,
    },
  });
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: npx ts-node prisma/import-archivos-globales.ts <archivo>');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error('No existe el archivo:', filePath);
    process.exit(1);
  }

  await seedMaterias();
  const materias = await prisma.materia.findMany({ where: { activo: true } });
  const text = readText(filePath);
  const blocks = parseArchivosGlobales(text);
  console.log(`Bloques de comisión detectados: ${blocks.length}`);

  let updated = 0;
  let created = 0;
  let links = 0;
  let unmatchedMaterias = 0;

  for (const b of blocks) {
    if (!b.modulo || b.modulo < 1 || b.modulo > 6) {
      console.warn(`Comisión ${b.numero}: módulo inválido (${b.modulo}), se omite`);
      continue;
    }
    const { sede } = await ensureCensSede(b.cens, b.sede, b.direccion);
    const ciclo = b.cohorte.match(/(20\d{2})/)?.[1] ?? '2026';

    let comision = await prisma.comision.findFirst({
      where: { numero: b.numero },
    });
    if (!comision) {
      const alt = b.numero.replace(/^0+/, '') || '0';
      comision = await prisma.comision.findFirst({
        where: { OR: [{ numero: alt }, { numero: alt.padStart(5, '0') }] },
      });
    }

    const data = {
      sedeId: sede.id,
      moduloId: b.modulo,
      numero: b.numero,
      direccion: b.direccion || sede.direccion,
      referente: b.materias[0]
        ? `${b.materias[0].docenteApellido}, ${b.materias[0].docenteNombre}`
        : 'Sin referente',
      contactos: [] as string[],
      cicloLectivo: ciclo,
      cohorte: b.cohorte || null,
      anioCursada: b.anioCursada || null,
      turno: b.turno || null,
      activo: true,
    };

    if (comision) {
      comision = await prisma.comision.update({ where: { id: comision.id }, data });
      updated++;
    } else {
      comision = await prisma.comision.create({ data });
      created++;
    }

    for (const slot of b.materias) {
      const materia = resolveMateriaNombre(slot.materiaAlias, materias, b.modulo);
      if (!materia) {
        unmatchedMaterias++;
        console.warn(`  Sin match materia "${slot.materiaAlias}" en módulo ${b.modulo} (${slot.codigo})`);
        continue;
      }
      const docente = await ensureDocente(slot.docenteApellido, slot.docenteNombre, slot.cuil);
      const existing = await prisma.docenteComision.findFirst({
        where: { comisionId: comision.id, materiaId: materia.id },
      });
      if (existing) {
        await prisma.docenteComision.update({
          where: { id: existing.id },
          data: {
            docenteId: docente.id,
            codigo: slot.codigo,
            horario: slot.horario || null,
          },
        });
      } else {
        await prisma.docenteComision.create({
          data: {
            docenteId: docente.id,
            comisionId: comision.id,
            materiaId: materia.id,
            codigo: slot.codigo,
            horario: slot.horario || null,
          },
        });
      }
      links++;
    }
    console.log(
      `✓ Comisión ${b.numero} · Módulo ${b.modulo} · ${b.materias.length} materias · ${b.cohorte || ''}`,
    );
  }

  console.log('\n=== Import Archivos Globales ===');
  console.log(`Comisiones creadas: ${created}`);
  console.log(`Comisiones actualizadas: ${updated}`);
  console.log(`Asignaciones docente-materia: ${links}`);
  console.log(`Materias sin match: ${unmatchedMaterias}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
