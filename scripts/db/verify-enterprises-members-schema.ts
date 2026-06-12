import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Defina DRIZZLE_DATABASE_URL ou DATABASE_URL para verificar o schema.",
  );
}

const requiredColumns = [
  "sale_limit",
  "exceed_discount_sale",
  "receipt_limit_discount",
  "comission_on_sight",
  "comission_to_terms",
  "comission_partial",
  "approved_at",
] as const;

const legacyColumns = ["sale_delete"] as const;

const sql = postgres(connectionString, { prepare: false, max: 1 });

try {
  const rows = await sql<{ column_name: string }[]>`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'enterprises_members'
  `;

  const present = new Set(rows.map((row) => row.column_name));
  const missing = requiredColumns.filter((column) => !present.has(column));
  const legacyPresent = legacyColumns.filter((column) => present.has(column));

  if (missing.length === 0 && legacyPresent.length === 0) {
    console.log("OK: enterprises_members esta alinhada com o schema da API.");
    process.exit(0);
  }

  if (missing.length > 0) {
    console.error("Colunas ausentes em enterprises_members:");
    for (const column of missing) {
      console.error(`  - ${column}`);
    }
  }

  if (legacyPresent.length > 0) {
    console.error("Colunas legadas ainda presentes em enterprises_members:");
    for (const column of legacyPresent) {
      console.error(`  - ${column}`);
    }
  }

  console.error(
    "\nExecute: npm run db:migrate (com DRIZZLE_DATABASE_URL do ambiente alvo)",
  );
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
