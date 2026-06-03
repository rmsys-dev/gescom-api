import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const drizzleDatabaseUrl =
  process.env.DRIZZLE_DATABASE_URL || process.env.DATABASE_URL;

if (!drizzleDatabaseUrl) {
  throw new Error(
    "Defina DRIZZLE_DATABASE_URL (preferencial) ou DATABASE_URL para executar o Drizzle Kit.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use DRIZZLE_DATABASE_URL para conexão direta ou session mode
    // Se não estiver definida, usa DATABASE_URL como fallback
    // IMPORTANTE: Drizzle Kit precisa de conexão direta (porta 5432) ou session mode
    // Transaction mode (porta 6543) não é recomendado para ferramentas CLI
    url: drizzleDatabaseUrl,
  },
  strict: false,
  verbose: true,
  schemaFilter: ["public"],
});
