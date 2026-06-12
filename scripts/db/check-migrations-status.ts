import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Defina DRIZZLE_DATABASE_URL ou DATABASE_URL para consultar migracoes.",
  );
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

try {
  const tableExists = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'drizzle'
        and table_name = '__drizzle_migrations'
    ) as exists
  `;

  if (!tableExists[0]?.exists) {
    console.log(
      "Tabela drizzle.__drizzle_migrations nao existe. O banco pode ter sido criado sem drizzle-kit migrate.",
    );
    process.exit(0);
  }

  const rows = await sql<{ id: number; hash: string; created_at: Date }[]>`
    select id, hash, created_at
    from drizzle.__drizzle_migrations
    order by created_at
  `;

  if (rows.length === 0) {
    console.log("Nenhuma migracao registrada em drizzle.__drizzle_migrations.");
    process.exit(0);
  }

  console.log("Migracoes aplicadas:");
  for (const row of rows) {
    console.log(`  #${row.id} ${row.hash} @ ${String(row.created_at)}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
