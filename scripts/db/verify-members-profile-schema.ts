import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Defina DRIZZLE_DATABASE_URL ou DATABASE_URL para verificar o schema.",
  );
}

const requiredTables = [
  "members_personal_info",
  "members_address",
  "members_contact",
  "members_relationships",
  "members_tax_infos",
  "members_financial_info",
] as const;

const legacyTables = [
  "users_personal_info",
  "users_address",
  "users_contact",
  "users_relationships",
  "users_tax_infos",
  "users_financial_info",
] as const;

const sql = postgres(connectionString, { prepare: false, max: 1 });

try {
  const rows = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ${sql([
        ...requiredTables,
        ...legacyTables,
      ])}
  `;

  const present = new Set(rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !present.has(table));
  const legacyPresent = legacyTables.filter((table) => present.has(table));

  if (missing.length === 0 && legacyPresent.length === 0) {
    console.log("OK: schema members_* esta alinhado com a API.");
    process.exit(0);
  }

  if (missing.length > 0) {
    console.error("Tabelas members_* ausentes:");
    for (const table of missing) {
      console.error(`  - ${table}`);
    }
  }

  if (legacyPresent.length > 0) {
    console.error("Tabelas legadas users_* ainda presentes:");
    for (const table of legacyPresent) {
      console.error(`  - ${table}`);
    }
  }

  console.error(
    "\nExecute: npm run db:apply:members-profile-tables (com DRIZZLE_DATABASE_URL do ambiente alvo)",
  );
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
