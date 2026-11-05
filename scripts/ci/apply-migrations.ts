import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const folder = process.argv[2];
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!folder) {
  console.error("Uso: tsx scripts/ci/apply-migrations.ts <pasta-drizzle>");
  process.exit(1);
}
if (!databaseUrl) {
  console.error("Defina DATABASE_URL para aplicar as migrations no CI.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
try {
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: path.resolve(folder) });
  console.log(`[ci] Migrations aplicadas a partir de ${path.resolve(folder)}.`);
} finally {
  await sql.end();
}
