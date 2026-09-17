import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
config();

const drizzleDatabaseUrl =
  process.env.DRIZZLE_DATABASE_URL || process.env.DATABASE_URL;

if (!drizzleDatabaseUrl) {
  throw new Error(
    "Defina DRIZZLE_DATABASE_URL (preferencial) ou DATABASE_URL para executar o Drizzle Kit.",
  );
}

export default defineConfig({
  // Apenas DDL: não apontar para src/db/schema.ts (esse arquivo abre conexão postgres).
  schema: ["./src/db/enums.ts", "./src/db/entities/*.ts", "./src/db/auditoriums.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Porta 5432 (direta) ou session mode. Transaction pooler (6543) quebra migrate.
    url: drizzleDatabaseUrl,
  },
  migrations: {
    prefix: "index",
    schema: "drizzle",
    table: "__drizzle_migrations",
  },
  breakpoints: true,
  strict: true,
  verbose: true,
  schemaFilter: ["public"],
  entities: {
    roles: {
      provider: "supabase",
    },
  },
});
