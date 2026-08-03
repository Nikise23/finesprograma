import { PrismaClient, Rol } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedMaterias } from './seed-materias';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin1234', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@fines.gob.ar' },
    update: {},
    create: {
      email: 'admin@fines.gob.ar',
      passwordHash,
      rol: Rol.ADMIN,
    },
  });

  const adminPassword = await bcrypt.hash('Admin1234', 10);
  await prisma.usuario.upsert({
    where: { email: 'administrativo@fines.gob.ar' },
    update: {},
    create: {
      email: 'administrativo@fines.gob.ar',
      passwordHash: adminPassword,
      rol: Rol.ADMINISTRATIVO,
    },
  });

  const docenteUser = await prisma.usuario.upsert({
    where: { email: 'docente@fines.gob.ar' },
    update: {},
    create: {
      email: 'docente@fines.gob.ar',
      passwordHash: await bcrypt.hash('Docente1234', 10),
      rol: Rol.DOCENTE,
    },
  });

  const docente = await prisma.docente.upsert({
    where: { dni: '30123456' },
    update: {},
    create: {
      usuarioId: docenteUser.id,
      apellido: 'García',
      nombre: 'María',
      dni: '30123456',
      email: 'docente@fines.gob.ar',
      telefono: '2215550001',
    },
  });

  const cens = await prisma.cens.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      nombre: 'CENS N° 1 La Plata',
      direccion: 'Calle 50 N° 1234',
      contacto: '221-555-0100 / cens1@fines.gob.ar',
      directora: 'Dra. Ana Rodríguez',
    },
  });

  const sede = await prisma.sede.upsert({
    where: { id: '00000000-0000-4000-8000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000002',
      censId: cens.id,
      nombre: 'Sede Centro',
      direccion: 'Av. 7 entre 50 y 51',
    },
  });

  await seedMaterias();

  const comision = await prisma.comision.upsert({
    where: { id: '00000000-0000-4000-8000-000000000003' },
    update: { moduloId: 1 },
    create: {
      id: '00000000-0000-4000-8000-000000000003',
      sedeId: sede.id,
      moduloId: 1,
      numero: '101',
      direccion: 'Av. 7 entre 50 y 51 — Aula 3',
      referente: 'Prof. María García',
      contactos: ['2215550001', 'docente@fines.gob.ar'],
      cicloLectivo: '2026',
    },
  });

  const existingLink = await prisma.docenteComision.findFirst({
    where: { docenteId: docente.id, comisionId: comision.id },
  });
  if (!existingLink) {
    await prisma.docenteComision.create({
      data: { docenteId: docente.id, comisionId: comision.id },
    });
  }

  await prisma.cicloLectivo.upsert({
    where: { anio: '2026' },
    update: { activo: true },
    create: { anio: '2026', activo: true },
  });

  const estudiantes = [
    { apellido: 'López', nombre: 'Juan', dni: '40111222' },
    { apellido: 'Martínez', nombre: 'Carla', dni: '40222333' },
    { apellido: 'Fernández', nombre: 'Pedro', dni: '40333444' },
  ];

  for (const e of estudiantes) {
    await prisma.estudiante.upsert({
      where: { dni: e.dni },
      update: {},
      create: { ...e, comisionId: comision.id },
    });
  }

  console.log('Seed completado.');
  console.log('Admin: admin@fines.gob.ar / Admin1234');
  console.log('Administrativo: administrativo@fines.gob.ar / Admin1234');
  console.log('Docente: docente@fines.gob.ar / Docente1234');
  console.log('Admin user id:', admin.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
