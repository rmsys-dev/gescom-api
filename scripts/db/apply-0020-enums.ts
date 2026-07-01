import "dotenv/config";
import { createHash } from "node:crypto";
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

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = "drizzle/0020_flawless_night_nurse.sql";
const journalCreatedAt = 1782928956386;

const stripSqlComments = (sqlBlock: string): string =>
  sqlBlock
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();

const parseStatements = (rawSql: string): string[] =>
  rawSql
    .split("--> statement-breakpoint")
    .map(stripSqlComments)
    .filter((statement) => statement.length > 0);

const fileHash = createHash("sha256")
  .update(readFileSync(join(root, migrationPath), "utf8"))
  .digest("hex");

const sql = postgres(connectionString, { prepare: false, max: 1 });

const isBenignError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("already exists") ||
    message.includes("duplicate key") ||
    message.includes("duplicate_object") ||
    message.includes("enum label")
  );
};

try {
  const alreadyApplied = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from drizzle.__drizzle_migrations
      where hash = ${fileHash}
    ) as exists
  `;

  if (alreadyApplied[0]?.exists) {
    console.log(`SKIP: ${migrationPath} (hash ja registrado)`);
    process.exit(0);
  }

  const rawSql = readFileSync(join(root, migrationPath), "utf8");
  const statements = parseStatements(rawSql);

  console.log(`Aplicando ${migrationPath}...`);
  for (const statement of statements) {
    try {
      await sql.unsafe(statement);
      console.log(`  OK: ${statement.slice(0, 80)}...`);
    } catch (error) {
      if (isBenignError(error)) {
        console.log(`  SKIP (ja aplicado): ${statement.slice(0, 80)}...`);
        continue;
      }
      throw error;
    }
  }

  await sql`
    insert into drizzle.__drizzle_migrations (hash, created_at)
    values (${fileHash}, ${journalCreatedAt})
  `;
  console.log(`Registrado hash de ${migrationPath}`);
  console.log("\nMigracao 0020 aplicada com sucesso.");
} finally {
  await sql.end({ timeout: 5 });
}
