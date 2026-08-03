/**
 * Genera contraseñas únicas para docentes y escribe CREDENCIALES_DOCENTES.md
 * Uso: npx ts-node prisma/export-credenciales-docentes.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function generatePassword(dni: string): string {
  // Contraseña memorable: Fines + últimos 4 del DNI + 2 caracteres aleatorios
  const suffix = crypto.randomBytes(2).toString('hex');
  const dniPart = dni.slice(-4).padStart(4, '0');
  return `Fines${dniPart}${suffix}`;
}

async function main() {
  const docentes = await prisma.docente.findMany({
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    include: {
      comisiones: { include: { comision: { select: { numero: true } } } },
    },
  });

  const rows: {
    apellido: string;
    nombre: string;
    dni: string;
    email: string;
    password: string;
    comisiones: string;
  }[] = [];

  for (const d of docentes) {
    const password = generatePassword(d.dni);
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.usuario.update({
      where: { id: d.usuarioId },
      data: { passwordHash, activo: d.activo },
    });
    rows.push({
      apellido: d.apellido,
      nombre: d.nombre,
      dni: d.dni,
      email: d.email,
      password,
      comisiones: d.comisiones.map((c) => c.comision.numero).join(', ') || '—',
    });
  }

  const outPath = path.resolve(__dirname, '../../CREDENCIALES_DOCENTES.md');
  const lines = [
    '# Credenciales de docentes — FINES Adultos',
    '',
    `Generado: ${new Date().toLocaleString('es-AR')}`,
    '',
    `Total de docentes: **${rows.length}**`,
    '',
    '> **Importante:** este archivo contiene contraseñas en texto plano. No lo subas a repositorios públicos. Cámbialo o elimínalo después de entregar las credenciales.',
    '',
    '## Cómo iniciar sesión',
    '',
    '1. Ir a la app web',
    '2. Usar el **email** y la **contraseña** de la tabla',
    '3. Rol: Docente',
    '',
    '## Listado',
    '',
    '| # | Apellido | Nombre | DNI | Email | Contraseña | Comisiones |',
    '|---|----------|--------|-----|-------|------------|------------|',
    ...rows.map(
      (r, i) =>
        `| ${i + 1} | ${r.apellido} | ${r.nombre} | ${r.dni} | ${r.email} | \`${r.password}\` | ${r.comisiones} |`,
    ),
    '',
    '## Formato de contraseña',
    '',
    'Patrón: `Fines` + últimos 4 dígitos del DNI + 4 caracteres hex aleatorios.',
    '',
    'Ejemplo: DNI `39872868` → `Fines2868a3f1`',
    '',
  ];

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Escrito: ${outPath}`);
  console.log(`Docentes actualizados: ${rows.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
