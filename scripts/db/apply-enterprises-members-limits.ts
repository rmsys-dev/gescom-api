import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Defina DRIZZLE_DATABASE_URL ou DATABASE_URL para aplicar a migracao.",
  );
}

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../drizzle/0002_sync_enterprises_members_limits.sql",
);

const rawSql = readFileSync(migrationPath, "utf8");
const stripSqlComments = (sqlBlock: string): string =>
  sqlBlock
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();

const statements = rawSql
  .split("--> statement-breakpoint")
  .map(stripSqlComments)
  .filter((statement) => statement.length > 0);

const sql = postgres(connectionString, { prepare: false, max: 1 });

try {
  for (const statement of statements) {
    await sql.unsafe(statement);
    console.log(`OK: ${statement.slice(0, 72)}...`);
  }

  console.log("Migracao 0002 aplicada com sucesso.");
} finally {
  await sql.end({ timeout: 5 });
}
