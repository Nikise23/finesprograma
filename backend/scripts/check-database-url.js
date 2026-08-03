/**
 * Valida DATABASE_URL antes de prisma db push (Render/Neon).
 * No imprime la contraseña.
 */
const raw = process.env.DATABASE_URL?.trim() ?? '';
const url = raw.replace(/^['"]|['"]$/g, '');

if (!url) {
  console.error('❌ DATABASE_URL no está definida en el entorno.');
  console.error('En Render → tu servicio fines-api → Environment:');
  console.error('  Key: DATABASE_URL');
  console.error('  Value: postgresql://USER:PASSWORD@HOST/neondb?sslmode=require');
  process.exit(1);
}

if (!/^postgres(ql)?:\/\//i.test(url)) {
  console.error('❌ DATABASE_URL no empieza con postgresql://');
  console.error('Valor (enmascarado):', url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@').slice(0, 80));
  console.error('Tip: no pongas comillas alrededor del valor en Render.');
  console.error('Tip: copiá la URI de Neon (Connection string), no solo la password.');
  process.exit(1);
}

// Normalizar por si pegaron comillas
process.env.DATABASE_URL = url;
console.log('✓ DATABASE_URL OK →', url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@').split('?')[0]);
