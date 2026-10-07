/**
 * Sync rápido de estudiantes desde notas_historicas (bulk).
 * Las notas del Excel ya están upsertadas; esto completa el sync que iba 1-a-1.
 */
import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw<{ dni: string }[]>`
    SELECT DISTINCT dni FROM notas_historicas ORDER BY dni
  `;
  const dnis = rows.map((r) => r.dni);
  console.log(`DNIs con notas históricas: ${dnis.length}`);

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
          libroMatrizId: libroByDni.get(dni) ?? existing.libroMatrizId ?? null,
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
        (r) =>
          Prisma.sql`(${r.dni}, ${r.apellido}, ${r.nombre}, ${r.fechaNacimiento}, ${r.libroMatrizId})`,
      );
      const updated = await prisma.$executeRaw`
        UPDATE estudiantes AS e SET
          apellido = v.apellido,
          nombre = v.nombre,
          fecha_nacimiento = COALESCE(v.fecha_nacimiento::date, e.fecha_nacimiento),
          libro_matriz_id = COALESCE(v.libro_matriz_id, e.libro_matriz_id),
          estado = CAST('historico' AS "EstadoEstudiante"),
          updated_at = NOW()
        FROM (VALUES ${Prisma.join(values)}) AS v(dni, apellido, nombre, fecha_nacimiento, libro_matriz_id)
        WHERE e.dni = v.dni
      `;
      actualizados += Number(updated);
    }

    console.log(`  sync ${Math.min(i + 500, dnis.length)}/${dnis.length}`);
  }

  const [totalEst, totalNotas] = await Promise.all([
    prisma.estudiante.count(),
    prisma.notaHistorica.count(),
  ]);

  console.log({ creados, actualizados, omitidosActivos, totalEst, totalNotas });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
