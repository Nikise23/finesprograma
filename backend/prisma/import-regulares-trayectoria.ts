/**
 * Importa listados de regulares por período (1-6) a trayectorias_estudiantes.
 * Uso: npx ts-node prisma/import-regulares-trayectoria.ts
 */
import { PrismaClient } from '@prisma/client';
import { normalizeUpper } from './text-utils';
import { parseHtmlTable } from '../src/common/utils/html-table.util';
import * as fs from 'fs';

const prisma = new PrismaClient();

const FILES = [
  { periodo: 1, path: 'c:/Users/nicfe/Downloads/regulares_periodo_1.xls' },
  { periodo: 2, path: 'c:/Users/nicfe/Downloads/regulares_periodo_2.xls' },
  { periodo: 3, path: 'c:/Users/nicfe/Downloads/regulares_periodo_3.xls' },
  { periodo: 4, path: 'c:/Users/nicfe/Downloads/regulares_periodo_4.xls' },
  { periodo: 5, path: 'c:/Users/nicfe/Downloads/regulares_periodo_5.xls' },
  { periodo: 6, path: 'c:/Users/nicfe/Downloads/regulares_periodo_6.xls' },
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

function readRows(filePath: string): string[][] {
  const html = fs.readFileSync(filePath, 'latin1');
  return parseHtmlTable(html);
}

async function main() {
  const comisiones = await prisma.comision.findMany({
    select: { id: true, numero: true },
  });
  const comisionMap = new Map<string, string>();
  for (const c of comisiones) {
    comisionMap.set(normalizeComisionNumero(c.numero), c.id);
    comisionMap.set(c.numero, c.id);
  }

  const libros = await prisma.libroMatriz.findMany({
    select: { id: true, dni: true },
  });
  const libroMap = new Map(libros.map((l) => [l.dni, l.id]));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let linkedComision = 0;
  let linkedLibro = 0;

  for (const { periodo, path } of FILES) {
    if (!fs.existsSync(path)) {
      console.warn('Archivo no encontrado:', path);
      continue;
    }

    const rows = readRows(path);
    const header = rows[0]?.map((h) => normalizeUpper(h)) ?? [];
    const idx = {
      tipo: header.findIndex((h) => h.includes('TIPO')),
      distrito: header.findIndex((h) => h.includes('DISTRITO')),
      comision: header.findIndex((h) => h.includes('COMISION')),
      apellido: header.findIndex((h) => h === 'APELLIDO'),
      nombre: header.findIndex((h) => h === 'NOMBRE'),
      dni: header.findIndex((h) => h === 'DNI'),
      fechaNac: header.findIndex((h) => h.includes('FECHA')),
      sexo: header.findIndex((h) => h.includes('SEXO')),
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const get = (n: number) => (n >= 0 ? String(row[n] ?? '').trim() : '');

      const dni = normalizeDni(get(idx.dni));
      const apellido = normalizeUpper(get(idx.apellido));
      const nombre = normalizeUpper(get(idx.nombre));

      if (!dni || dni.length < 6 || !apellido || !nombre) {
        skipped++;
        continue;
      }

      const comisionRaw = get(idx.comision);
      const comisionNumero = normalizeComisionNumero(comisionRaw) || comisionRaw;
      const comisionId =
        comisionMap.get(comisionNumero) ??
        comisionMap.get(comisionRaw) ??
        null;
      const libroMatrizId = libroMap.get(dni) ?? null;

      if (comisionId) linkedComision++;
      if (libroMatrizId) linkedLibro++;

      const data = {
        dni,
        apellido,
        nombre,
        periodo,
        tipo: normalizeUpper(get(idx.tipo)) || 'REGULAR',
        distrito: normalizeUpper(get(idx.distrito)) || undefined,
        comisionNumero: comisionRaw || comisionNumero,
        comisionId,
        fechaNacimiento: parseFecha(get(idx.fechaNac)),
        sexo: normalizeUpper(get(idx.sexo)) || undefined,
        libroMatrizId,
      };

      const existing = await prisma.trayectoriaEstudiante.findUnique({
        where: { dni_periodo: { dni, periodo } },
      });

      if (existing) {
        await prisma.trayectoriaEstudiante.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await prisma.trayectoriaEstudiante.create({ data });
        created++;
      }
    }

    console.log(`Período ${periodo}: ${rows.length - 1} filas procesadas`);
  }

  const total = await prisma.trayectoriaEstudiante.count();
  const uniqueDnis = await prisma.trayectoriaEstudiante.groupBy({ by: ['dni'] });

  console.log('\n=== Importación trayectorias completada ===');
  console.log(`Creados: ${created}`);
  console.log(`Actualizados: ${updated}`);
  console.log(`Omitidos: ${skipped}`);
  console.log(`Vínculos comisión en BD: ${linkedComision}`);
  console.log(`Vínculos libro matriz: ${linkedLibro}`);
  console.log(`Total registros: ${total}`);
  console.log(`Estudiantes únicos (DNI): ${uniqueDnis.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
