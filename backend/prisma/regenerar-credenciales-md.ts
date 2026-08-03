/**
 * Regenera CREDENCIALES_DOCENTES.md desde la BD sin cambiar contraseñas
 * (las toma del archivo existente por DNI).
 * Uso: npx ts-node prisma/regenerar-credenciales-md.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function parseExistingPasswords(mdPath: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(mdPath)) return map;

  const content = fs.readFileSync(mdPath, 'utf8');
  for (const line of content.split('\n')) {
    if (!line.startsWith('|') || line.startsWith('| #') || line.startsWith('|---')) continue;
    const cols = line.split('|').map((c) => c.trim());
    if (cols.length < 8) continue;
    const dni = cols[4];
    const passMatch = cols[6].match(/`([^`]+)`/);
    if (dni && passMatch) map.set(dni, passMatch[1]);
  }
  return map;
}

async function main() {
  const outPath = path.resolve(__dirname, '../../CREDENCIALES_DOCENTES.md');
  const passwords = parseExistingPasswords(outPath);

  const docentes = await prisma.docente.findMany({
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    include: {
      comisiones: { include: { comision: { select: { numero: true } } } },
    },
  });

  const rows = docentes.map((d) => ({
    apellido: d.apellido,
    nombre: d.nombre,
    dni: d.dni,
    email: d.email,
    password: passwords.get(d.dni) ?? '(sin contraseña guardada — ejecutar export-credenciales-docentes.ts)',
    comisiones: [...new Set(d.comisiones.map((c) => c.comision.numero))].join(', ') || '—',
  }));

  const missing = rows.filter((r) => r.password.startsWith('(')).length;
  if (missing > 0) {
    console.warn(`Advertencia: ${missing} docente(s) sin contraseña en el MD previo`);
  }

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
  console.log(`Docentes: ${rows.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
