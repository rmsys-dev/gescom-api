import "dotenv/config";
import { spawnSync } from "node:child_process";
import postgres from "postgres";
import { assertDestructiveDbAllowed } from "../seed/lib/safety.js";

const connectionString = assertDestructiveDbAllowed();

if (!process.env.DRIZZLE_DATABASE_URL) {
  console.warn(
    "[reset] DRIZZLE_DATABASE_URL nao definida; usando DATABASE_URL. " +
      "Para DDL no Supabase, prefira a porta 5432.",
  );
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

try {
  console.log("[reset] Removendo schemas public e drizzle...");
  await sql.begin(async (tx) => {
    await tx`DROP SCHEMA IF EXISTS public CASCADE`;
    await tx`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await tx`CREATE SCHEMA public`;
    await tx`GRANT ALL ON SCHEMA public TO postgres`;
    await tx`GRANT ALL ON SCHEMA public TO public`;
  });
  console.log("[reset] Schemas recriados.");

  console.log("[reset] Executando drizzle-kit push (schema completo)...");
  const result = spawnSync("npx", ["drizzle-kit", "push", "--force"], {
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      DRIZZLE_DATABASE_URL: connectionString,
      DATABASE_URL: process.env.DATABASE_URL ?? connectionString,
    },
  });

  if (result.status !== 0) {
    throw new Error("drizzle-kit push falhou.");
  }

  console.log("[reset] Banco de teste recriado com sucesso.");
} finally {
  await sql.end({ timeout: 5 });
}
