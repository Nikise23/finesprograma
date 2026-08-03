/**
 * Normaliza textos en BD: sin tildes y en mayúsculas (docentes, CENS, sedes, comisiones).
 * Uso: npx ts-node prisma/normalizar-textos.ts
 */
import { PrismaClient } from '@prisma/client';
import { normalizeUpper } from './text-utils';

const prisma = new PrismaClient();

async function main() {
  let docentes = 0;
  for (const d of await prisma.docente.findMany()) {
    const apellido = normalizeUpper(d.apellido);
    const nombre = normalizeUpper(d.nombre);
    if (apellido !== d.apellido || nombre !== d.nombre) {
      await prisma.docente.update({
        where: { id: d.id },
        data: { apellido, nombre },
      });
      docentes++;
    }
  }

  let censCount = 0;
  for (const c of await prisma.cens.findMany()) {
    const data = {
      nombre: normalizeUpper(c.nombre),
      direccion: normalizeUpper(c.direccion),
      contacto: normalizeUpper(c.contacto),
      directora: normalizeUpper(c.directora),
    };
    if (
      data.nombre !== c.nombre ||
      data.direccion !== c.direccion ||
      data.contacto !== c.contacto ||
      data.directora !== c.directora
    ) {
      await prisma.cens.update({ where: { id: c.id }, data });
      censCount++;
    }
  }

  let sedes = 0;
  for (const s of await prisma.sede.findMany()) {
    const data = {
      nombre: normalizeUpper(s.nombre),
      direccion: normalizeUpper(s.direccion),
    };
    if (data.nombre !== s.nombre || data.direccion !== s.direccion) {
      await prisma.sede.update({ where: { id: s.id }, data });
      sedes++;
    }
  }

  let comisiones = 0;
  for (const c of await prisma.comision.findMany()) {
    const data = {
      direccion: normalizeUpper(c.direccion),
      referente: normalizeUpper(c.referente),
    };
    if (data.direccion !== c.direccion || data.referente !== c.referente) {
      await prisma.comision.update({ where: { id: c.id }, data });
      comisiones++;
    }
  }

  console.log('=== Normalización completada ===');
  console.log(`Docentes: ${docentes}`);
  console.log(`CENS: ${censCount}`);
  console.log(`Sedes: ${sedes}`);
  console.log(`Comisiones: ${comisiones}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
