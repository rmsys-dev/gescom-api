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
    "Defina DRIZZLE_DATABASE_URL ou DATABASE_URL para aplicar migracoes.",
  );
}

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const migrationFiles = [
  "drizzle/0003_easy_sabra.sql",
  "drizzle/0004_purple_titania.sql",
  "drizzle/0005_acoustic_ogun.sql",
  "drizzle/0006_members_profile_tables.sql",
  "drizzle/0007_tenant_products_stock_sales_sync.sql",
] as const;

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

const hashFile = (relativePath: string): string => {
  const content = readFileSync(join(root, relativePath), "utf8");
  return createHash("sha256").update(content).digest("hex");
};

const sql = postgres(connectionString, { prepare: false, max: 1 });

const isBenignError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("already exists") ||
    message.includes("duplicate key") ||
    message.includes("duplicate_object") ||
    message.includes("enumlabel") ||
    message.includes("does not exist") && message.includes("drop")
  );
};

try {
  for (const relativePath of migrationFiles) {
    const rawSql = readFileSync(join(root, relativePath), "utf8");
    const statements = parseStatements(rawSql);
    const fileHash = hashFile(relativePath);

    const alreadyApplied = await sql<{ exists: boolean }[]>`
      select exists (
        select 1
        from drizzle.__drizzle_migrations
        where hash = ${fileHash}
      ) as exists
    `;

    if (alreadyApplied[0]?.exists) {
      console.log(`SKIP: ${relativePath} (hash ja registrado)`);
      continue;
    }

    console.log(`\nAplicando ${relativePath}...`);
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
      values (${fileHash}, ${Date.now()})
    `;
    console.log(`Registrado hash de ${relativePath}`);
  }

  console.log("\nMigracoes pendentes aplicadas com sucesso.");
} finally {
  await sql.end({ timeout: 5 });
}
