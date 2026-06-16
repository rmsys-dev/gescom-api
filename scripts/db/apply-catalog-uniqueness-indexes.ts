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
const migrationPath = "drizzle/0008_product_catalog_enterprise_description_unique.sql";

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
  } else {
    const rawSql = readFileSync(join(root, migrationPath), "utf8");
    const statements = parseStatements(rawSql);
    console.log(`Aplicando ${migrationPath}...`);
    for (const statement of statements) {
      await sql.unsafe(statement);
      console.log(`  OK: ${statement.slice(0, 80)}...`);
    }
    await sql`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${fileHash}, ${Date.now()})
    `;
    console.log("Migracao registrada em drizzle.__drizzle_migrations.");
  }

  const indexes = await sql<{ indexname: string }[]>`
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'product_groups_enterprise_description_unique',
        'product_brands_enterprise_description_unique',
        'product_subgroups_enterprise_description_unique'
      )
    order by indexname
  `;
  console.log("Indices unicos presentes:", indexes.map((row) => row.indexname));
} finally {
  await sql.end({ timeout: 5 });
}
