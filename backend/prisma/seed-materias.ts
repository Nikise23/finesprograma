/**
 * Carga los 6 módulos y 31 materias del plan FINES Adultos.
 * Uso: npx ts-node prisma/seed-materias.ts
 */
import { PrismaClient } from '@prisma/client';
import { MODULOS_FINES } from '../src/common/constants/materias-fines';

const prisma = new PrismaClient();

export async function seedMaterias() {
  let materiasCount = 0;

  for (const mod of MODULOS_FINES) {
    await prisma.modulo.upsert({
      where: { id: mod.id },
      update: { titulo: mod.titulo, etiqueta: mod.etiqueta },
      create: { id: mod.id, titulo: mod.titulo, etiqueta: mod.etiqueta },
    });

    for (let i = 0; i < mod.materias.length; i++) {
      const nombre = mod.materias[i];
      const existing = await prisma.materia.findFirst({
        where: { moduloId: mod.id, nombre },
      });
      if (existing) {
        await prisma.materia.update({
          where: { id: existing.id },
          data: { orden: i + 1, activo: true },
        });
      } else {
        await prisma.materia.create({
          data: { moduloId: mod.id, nombre, orden: i + 1 },
        });
      }
      materiasCount++;
    }
  }

  return { modulos: MODULOS_FINES.length, materias: materiasCount };
}

async function main() {
  const result = await seedMaterias();
  console.log(`✓ ${result.modulos} módulos, ${result.materias} materias cargadas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
