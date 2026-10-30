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

/** Config enxuto para `drizzle-kit migrate` no container (sem schema TypeScript). */
export default defineConfig({
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: drizzleDatabaseUrl,
  },
  migrations: {
    prefix: "index",
    schema: "drizzle",
    table: "__drizzle_migrations",
  },
});
