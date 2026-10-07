/**
 * Importa FINES_notas_plan_viejo.xlsx → notas_historicas (+ estudiantes históricos).
 * - Sin DNI → omitido
 * - Sin materia → omitido
 * - periodo vacío → SIN_PERIODO
 */
import 'dotenv/config';
import { createReadStream } from 'fs';
import { Prisma, PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

const FILE =
  process.env.NOTAS_XLSX ??
  'C:/archivosFines/FINES_notas_plan_viejo.xlsx';
const BATCH = 500;
const FUENTE =
  process.env.NOTAS_FUENTE ??
  (FILE.replace(/^.*[\\/]/, '') || 'FINES_notas_plan_viejo.xlsx');

const prisma = new PrismaClient();

function cell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (o.result != null) return String(o.result).trim();
    if (o.text != null) return String(o.text).trim();
  }
  return String(v).trim();
}

function normalizeDni(v: string): string {
  return v.replace(/\D/g, '');
}

function normalizeNota(v: string): string {
  const t = v.trim();
  if (!t) return '';
  if (/^aus/i.test(t) || t === '—' || t === '-') return 'AUS';
  if (/^a$/i.test(t)) return 'AUS';
  return t.replace(',', '.');
}

function parseFecha(v: string): Date | null {
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

type RowIn = {
  dni: string;
  apellido: string;
  nombre: string;
  materia: string;
  nota: string | null;
  periodoLabel: string;
  comisionNumero: string;
  distrito: string | null;
  orientacion: string | null;
  libro: string | null;
  folio: string | null;
  estadoFinal: string | null;
  fechaNacimiento: Date | null;
  fuenteArchivo: string;
};

async function upsertBatch(batch: RowIn[]) {
  if (!batch.length) return;

  // Dedup within batch by unique key (last wins)
  const map = new Map<string, RowIn>();
  for (const r of batch) {
    const key = `${r.dni}|${r.comisionNumero}|${r.periodoLabel}|${r.materia}`;
    map.set(key, r);
  }
  const rows = [...map.values()];

  const values = rows.map(
    (r) => Prisma.sql`(
      gen_random_uuid()::text,
      ${r.dni},
      ${r.apellido},
      ${r.nombre},
      ${r.comisionNumero},
      ${r.distrito},
      ${r.periodoLabel},
      ${r.orientacion},
      ${r.materia},
      ${r.nota},
      ${r.libro},
      ${r.folio},
      ${r.estadoFinal},
      ${r.fuenteArchivo},
      ${r.fechaNacimiento}::date,
      NOW(),
      NOW()
    )`,
  );

  await prisma.$executeRaw`
    INSERT INTO notas_historicas (
      id, dni, apellido, nombre, comision_numero, distrito, periodo_label,
      orientacion, materia, nota, libro, folio, estado_final, fuente_archivo,
      fecha_nacimiento, created_at, updated_at
    )
    VALUES ${Prisma.join(values)}
    ON CONFLICT (dni, comision_numero, periodo_label, materia)
    DO UPDATE SET
      apellido = EXCLUDED.apellido,
      nombre = EXCLUDED.nombre,
      distrito = EXCLUDED.distrito,
      orientacion = EXCLUDED.orientacion,
      nota = EXCLUDED.nota,
      libro = EXCLUDED.libro,
      folio = EXCLUDED.folio,
      estado_final = EXCLUDED.estado_final,
      fuente_archivo = EXCLUDED.fuente_archivo,
      fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, notas_historicas.fecha_nacimiento),
      updated_at = NOW()
  `;

  return rows.length;
}

async function syncEstudiantes(dnis: string[]) {
  let creados = 0;
  let actualizados = 0;
  let omitidosActivos = 0;

  for (let i = 0; i < dnis.length; i += 500) {
    const chunk = dnis.slice(i, i + 500);

    const [notas, existentes, libros] = await Promise.all([
      prisma.notaHistorica.findMany({
        where: { dni: { in: chunk } },
        orderBy: { updatedAt: 'desc' },
        distinct: ['dni'],
        select: { dni: true, apellido: true, nombre: true, fechaNacimiento: true },
      }),
      prisma.estudiante.findMany({
        where: { dni: { in: chunk } },
        select: { dni: true, estado: true, libroMatrizId: true, fechaNacimiento: true },
      }),
      prisma.libroMatriz.findMany({
        where: { dni: { in: chunk } },
        select: { id: true, dni: true },
      }),
    ]);

    const notaByDni = new Map(notas.map((n) => [n.dni, n]));
    const estByDni = new Map(existentes.map((e) => [e.dni, e]));
    const libroByDni = new Map(
      libros.filter((l) => l.dni).map((l) => [l.dni as string, l.id]),
    );

    const toCreate: Prisma.EstudianteCreateManyInput[] = [];
    const toUpdate: {
      dni: string;
      apellido: string;
      nombre: string;
      fechaNacimiento: Date | null;
      libroMatrizId: string | null;
    }[] = [];

    for (const dni of chunk) {
      const ref = notaByDni.get(dni);
      if (!ref) continue;
      const existing = estByDni.get(dni);
      if (existing) {
        if (existing.estado === 'activo' || existing.estado === 'baja_pendiente') {
          omitidosActivos++;
          continue;
        }
        toUpdate.push({
          dni,
          apellido: ref.apellido,
          nombre: ref.nombre,
          fechaNacimiento: ref.fechaNacimiento ?? existing.fechaNacimiento,
          libroMatrizId: libroByDni.get(dni) ?? existing.libroMatrizId,
        });
      } else {
        toCreate.push({
          dni,
          apellido: ref.apellido,
          nombre: ref.nombre,
          fechaNacimiento: ref.fechaNacimiento,
          libroMatrizId: libroByDni.get(dni),
          estado: 'historico',
        });
      }
    }

    if (toCreate.length) {
      const r = await prisma.estudiante.createMany({ data: toCreate, skipDuplicates: true });
      creados += r.count;
    }

    if (toUpdate.length) {
      const values = toUpdate.map(
        (r) => Prisma.sql`(
          ${r.dni},
          ${r.apellido},
          ${r.nombre},
          ${r.fechaNacimiento}::date,
          ${r.libroMatrizId}
        )`,
      );
      const updated = await prisma.$executeRaw`
        UPDATE estudiantes AS e SET
          apellido = v.apellido,
          nombre = v.nombre,
          fecha_nacimiento = COALESCE(v.fecha_nacimiento, e.fecha_nacimiento),
          libro_matriz_id = COALESCE(v.libro_matriz_id, e.libro_matriz_id),
          estado = 'historico',
          updated_at = NOW()
        FROM (VALUES ${Prisma.join(values)}) AS v(dni, apellido, nombre, fecha_nacimiento, libro_matriz_id)
        WHERE e.dni = v.dni
      `;
      actualizados += Number(updated);
    }

    console.log(`  sync alumnos ${Math.min(i + 500, dnis.length)}/${dnis.length}`);
  }

  return { creados, actualizados, omitidosActivos };
}

async function main() {
  console.log('Leyendo', FILE);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.read(createReadStream(FILE));
  const sheet = wb.getWorksheet('notas') ?? wb.worksheets[0];
  if (!sheet) throw new Error('No hay hoja notas');

  const headerMap = new Map<string, number>();
  sheet.getRow(1).eachCell((c, i) => {
    headerMap.set(cell(c.value).toLowerCase(), i);
  });
  const col = (name: string) => headerMap.get(name.toLowerCase());

  let skippedNoDni = 0;
  let skippedNoMateria = 0;
  let skippedNoNombre = 0;
  let skippedEmpty = 0;
  let upserted = 0;
  const dnis = new Set<string>();
  let batch: RowIn[] = [];

  console.log(`Filas en hoja: ${sheet.rowCount - 1}`);

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const get = (name: string) => {
      const i = col(name);
      return i ? cell(row.getCell(i).value) : '';
    };

    const dni = normalizeDni(get('dni'));
    const apellido = get('apellido').toUpperCase();
    const nombre = get('nombre').toUpperCase();
    const materia = get('materia').toUpperCase();
    const notaRaw = normalizeNota(get('nota'));
    const periodoLabel = (get('periodo_label') || 'SIN_PERIODO').toUpperCase();
    const comisionNumero = get('comision_numero') || 'MANUAL';

    if (!dni && !apellido && !nombre && !materia) {
      skippedEmpty++;
      continue;
    }
    if (!dni || dni.length < 6) {
      skippedNoDni++;
      continue;
    }
    if (!materia) {
      skippedNoMateria++;
      continue;
    }
    if (!apellido || !nombre) {
      skippedNoNombre++;
      continue;
    }

    dnis.add(dni);
    batch.push({
      dni,
      apellido,
      nombre,
      materia,
      nota: notaRaw || null,
      periodoLabel,
      comisionNumero,
      distrito: get('distrito') || 'JOSE C PAZ',
      orientacion: get('orientacion') || 'CIENCIAS SOCIALES',
      libro: get('libro') || null,
      folio: get('folio') || null,
      estadoFinal: get('estado_final') || null,
      fechaNacimiento: parseFecha(get('fecha_nacimiento')),
      fuenteArchivo: get('fuente_archivo') || FUENTE,
    });

    if (batch.length >= BATCH) {
      const n = await upsertBatch(batch);
      upserted += n ?? 0;
      batch = [];
      if (upserted % 2500 < BATCH) {
        console.log(`… ${upserted} notas upserted | dnis ${dnis.size}`);
      }
    }
  }

  if (batch.length) {
    const n = await upsertBatch(batch);
    upserted += n ?? 0;
  }

  console.log('\n=== Notas históricas ===');
  console.log({
    upserted,
    skippedNoDni,
    skippedNoMateria,
    skippedNoNombre,
    skippedEmpty,
    dnisUnicos: dnis.size,
  });

  console.log('\nSincronizando estudiantes históricos…');
  const sync = await syncEstudiantes([...dnis]);
  console.log('Estudiantes:', sync);

  const totalHist = await prisma.notaHistorica.count();
  console.log('\nTotal notas_historicas en DB:', totalHist);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
