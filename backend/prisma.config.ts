import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * En Render, DATABASE_URL viene del panel (no hay .env).
 * Prisma 6 con prisma.config.ts NO carga .env solo: usa process.env.
 * Sacamos comillas accidentalmente pegadas desde el dashboard.
 */
function databaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim() ?? "";
  const url = raw.replace(/^['"]|['"]$/g, "");
  if (!url) {
    throw new Error(
      "DATABASE_URL no está definida. En Render → Environment agregá la connection string de Neon (debe empezar con postgresql://).",
    );
  }
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error(
      `DATABASE_URL inválida (debe empezar con postgresql://). Recibido: "${url.slice(0, 24)}…"`,
    );
  }
  return url;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl(),
  },
});
