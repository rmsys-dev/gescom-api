import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DRIZZLE_DATABASE_URL ou DATABASE_URL ausente.");
}

const tables = ["product_groups", "product_brands", "product_subgroups"] as const;
const expectedIndexes = [
  "product_groups_enterprise_description_unique",
  "product_brands_enterprise_description_unique",
  "product_subgroups_enterprise_description_unique",
] as const;

const sql = postgres(connectionString, { prepare: false, max: 1 });

try {
  const indexes = await sql<{ tablename: string; indexname: string }[]>`
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = ANY(${tables})
    ORDER BY tablename, indexname
  `;

  console.log("Indexes:");
  for (const row of indexes) {
    console.log(`  ${row.tablename}: ${row.indexname}`);
  }

  const indexNames = new Set(indexes.map((row) => row.indexname));
  const missing = expectedIndexes.filter((name) => !indexNames.has(name));
  console.log("\nMissing unique indexes:", missing.length ? missing : "(none)");

  for (const table of tables) {
    const dups = await sql.unsafe(`
      SELECT enterprises_id, description, COUNT(*)::int as cnt
      FROM "${table}"
      GROUP BY enterprises_id, description
      HAVING COUNT(*) > 1
    `);
    console.log(`Duplicates in ${table}:`, dups.length);
  }

  const cols = await sql<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY(${tables})
      AND column_name = 'enterprises_id'
  `;
  console.log("\nenterprises_id columns:", cols.map((c) => c.table_name));
} finally {
  await sql.end({ timeout: 5 });
}
