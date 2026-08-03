/**
 * Importa informes de comisiones egresadas (notas históricas por materia).
 * Uso: npx ts-node prisma/import-comisiones-egresadas.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { normalizeUpper } from './text-utils';

const prisma = new PrismaClient();

const FILES = [
  'c:/Users/nicfe/Downloads/Comisiones_egresadas_Jos_C_Paz_Agosto_-_Diciembre_2023.xls',
  'c:/Users/nicfe/Downloads/Comisiones_egresadas_Jos_C_Paz_Marzo_-_Julio_2024.xls',
  'c:/Users/nicfe/Downloads/Comisiones_egresadas_Jos_C_Paz_Agosto_-_Diciembre_2024.xls',
  'c:/Users/nicfe/Downloads/Comisiones_egresadas_Jos_C_Paz_Agosto_-_Diciembre_2025.xls',
  'c:/Users/nicfe/Downloads/Comisiones_egresadas_Jos_C_Paz_Marzo_a_Julio_2026.xls',
];

function normalizeDni(v: string): string {
  return v.replace(/\D/g, '');
}

function normalizeComisionNumero(v: string): string {
  const digits = v.replace(/\D/g, '');
  return digits.replace(/^0+/, '') || '0';
}

function parseFecha(v: string): Date | undefined {
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return undefined;
  const [, d, mo, y] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

function parseMeta(row: string) {
  const text = row.replace(/\u00c3\u00a1/g, 'á').replace(/\u00c3\u00b3/g, 'ó').replace(/\u00c3\u00ad/g, 'í');
  const m = text.match(
    /Distrito:\s*(.+?)\s*-\s*Comisi[oó]n:\s*(\S+)\s*-\s*Per[ií]odo informado:\s*(.+?)\s*-\s*Orientaci[oó]n:\s*(.+)/i,
  );
  if (!m) return null;
  return {
    distrito: normalizeUpper(m[1]),
    comisionNumero: m[2].trim(),
    periodoLabel: normalizeUpper(m[3]),
    orientacion: normalizeUpper(m[4]),
  };
}

function readWorkbook(filePath: string): XLSX.WorkBook {
  return XLSX.read(fs.readFileSync(filePath).toString('latin1'), { type: 'string' });
}

async function main() {
  const comisiones = await prisma.comision.findMany({ select: { id: true, numero: true } });
  const comisionMap = new Map<string, string>();
  for (const c of comisiones) {
    comisionMap.set(normalizeComisionNumero(c.numero), c.id);
    comisionMap.set(c.numero, c.id);
  }

  let notasCreated = 0;
  let notasUpdated = 0;
  let alumnos = 0;
  let sheetsProcessed = 0;

  for (const filePath of FILES) {
    if (!fs.existsSync(filePath)) {
      console.warn('Archivo no encontrado:', filePath);
      continue;
    }

    const fuenteArchivo = filePath.split(/[/\\]/).pop() ?? filePath;
    const wb = readWorkbook(filePath);

    for (const sheetName of wb.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
        header: 1,
        defval: '',
      });

      const metaRow = rows.find((r) => String(r[0] ?? '').includes('Distrito:'));
      const meta = metaRow ? parseMeta(String(metaRow[0])) : null;
      if (!meta) continue;

      const headerIdx = rows.findIndex(
        (r) => normalizeUpper(String(r[0] ?? '')) === 'APELLIDO',
      );
      if (headerIdx < 0) continue;

      const header = rows[headerIdx].map((c) => String(c ?? '').trim());
      const libroIdx = header.findIndex((h) => normalizeUpper(h) === 'LIBRO');
      const folioIdx = header.findIndex((h) => normalizeUpper(h) === 'FOLIO');
      const estadoIdx = header.findIndex((h) => normalizeUpper(h) === 'ESTADO');
      const materiaStart = header.findIndex((h) =>
        normalizeUpper(h).includes('PRACTICAS DEL LENGUAJE'),
      );
      const startCol = materiaStart >= 0 ? materiaStart : 8;
      const endCol = libroIdx >= 0 ? libroIdx : header.length;

      const comisionId =
        comisionMap.get(normalizeComisionNumero(meta.comisionNumero)) ??
        comisionMap.get(meta.comisionNumero) ??
        null;

      sheetsProcessed++;

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i].map((c) => String(c ?? '').trim());
        const apellido = normalizeUpper(row[0]);
        const nombre = normalizeUpper(row[1]);
        const dni = normalizeDni(row[2] ?? row[6] ?? '');

        if (!dni || dni.length < 6 || !apellido || apellido === 'APELLIDO') continue;

        alumnos++;
        const fechaNacimiento = parseFecha(row[3]);
        const libro = libroIdx >= 0 ? row[libroIdx] : undefined;
        const folio = folioIdx >= 0 ? row[folioIdx] : undefined;
        const estadoFinal = estadoIdx >= 0 ? normalizeUpper(row[estadoIdx]) : undefined;

        for (let col = startCol; col < endCol; col++) {
          const materia = normalizeUpper(header[col]);
          const nota = row[col]?.trim();
          if (!materia || !nota) continue;

          const data = {
            dni,
            apellido,
            nombre,
            comisionNumero: meta.comisionNumero,
            comisionId,
            distrito: meta.distrito,
            periodoLabel: meta.periodoLabel,
            orientacion: meta.orientacion,
            materia,
            nota,
            libro: libro || undefined,
            folio: folio || undefined,
            estadoFinal: estadoFinal || undefined,
            fuenteArchivo,
            fechaNacimiento,
          };

          const existing = await prisma.notaHistorica.findUnique({
            where: {
              dni_comisionNumero_periodoLabel_materia: {
                dni,
                comisionNumero: meta.comisionNumero,
                periodoLabel: meta.periodoLabel,
                materia,
              },
            },
          });

          if (existing) {
            await prisma.notaHistorica.update({ where: { id: existing.id }, data });
            notasUpdated++;
          } else {
            await prisma.notaHistorica.create({ data });
            notasCreated++;
          }
        }
      }
    }

    console.log(`Archivo ${fuenteArchivo}: ${wb.SheetNames.length} hojas`);
  }

  // Sincronizar estudiantes históricos (sin comisión) desde trayectoria + notas
  const dnisTrayectoria = await prisma.trayectoriaEstudiante.groupBy({ by: ['dni'] });
  const dnisNotas = await prisma.notaHistorica.groupBy({ by: ['dni'] });
  const allDnis = new Set([...dnisTrayectoria.map((d) => d.dni), ...dnisNotas.map((d) => d.dni)]);

  let estudiantesCreados = 0;
  let estudiantesActualizados = 0;

  for (const dni of allDnis) {
    const ultimaTrayectoria = await prisma.trayectoriaEstudiante.findFirst({
      where: { dni },
      orderBy: { periodo: 'desc' },
    });
    const ultimaNota = await prisma.notaHistorica.findFirst({
      where: { dni },
      orderBy: { updatedAt: 'desc' },
    });
    const libro = await prisma.libroMatriz.findUnique({ where: { dni } });

    const apellido = ultimaTrayectoria?.apellido ?? ultimaNota?.apellido;
    const nombre = ultimaTrayectoria?.nombre ?? ultimaNota?.nombre;
    if (!apellido || !nombre) continue;

    const existing = await prisma.estudiante.findUnique({ where: { dni } });
    if (existing) {
      if (existing.estado === 'activo' || existing.estado === 'baja_pendiente') continue;
      await prisma.estudiante.update({
        where: { dni },
        data: {
          apellido,
          nombre,
          fechaNacimiento:
            ultimaTrayectoria?.fechaNacimiento ??
            ultimaNota?.fechaNacimiento ??
            existing.fechaNacimiento,
          libroMatrizId: libro?.id ?? existing.libroMatrizId,
          estado: 'historico',
        },
      });
      estudiantesActualizados++;
    } else {
      await prisma.estudiante.create({
        data: {
          dni,
          apellido,
          nombre,
          fechaNacimiento: ultimaTrayectoria?.fechaNacimiento ?? ultimaNota?.fechaNacimiento,
          libroMatrizId: libro?.id,
          estado: 'historico',
        },
      });
      estudiantesCreados++;
    }
  }

  console.log('\n=== Importación comisiones egresadas ===');
  console.log(`Hojas procesadas: ${sheetsProcessed}`);
  console.log(`Filas alumno procesadas: ${alumnos}`);
  console.log(`Notas creadas: ${notasCreated}`);
  console.log(`Notas actualizadas: ${notasUpdated}`);
  console.log(`Estudiantes históricos creados: ${estudiantesCreados}`);
  console.log(`Estudiantes históricos actualizados: ${estudiantesActualizados}`);
  console.log(`Total notas históricas: ${await prisma.notaHistorica.count()}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
