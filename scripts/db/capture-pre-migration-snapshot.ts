import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DRIZZLE_DATABASE_URL ou DATABASE_URL ausente.");
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

const snapshot: Record<string, unknown> = {
  capturedAt: new Date().toISOString(),
  tables: {} as Record<string, number>,
  migrations: [] as { id: number; hash: string; created_at: Date }[],
};

try {
  const tables = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `;

  for (const { table_name } of tables) {
    const count = await sql<{ c: number }[]>`
      select count(*)::int as c from ${sql(table_name)}
    `;
    snapshot.tables[table_name] = count[0]?.c ?? 0;
  }

  const migrations = await sql<{ id: number; hash: string; created_at: Date }[]>`
    select id, hash, created_at
    from drizzle.__drizzle_migrations
    order by created_at
  `;
  snapshot.migrations = migrations;

  const dir = join("scripts", "db", "backups");
  mkdirSync(dir, { recursive: true });
  const file = join(
    dir,
    `pre-migration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(file, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`Backup de metadados salvo em ${file}`);
  console.log(`Tabelas registradas: ${tables.length}`);
} finally {
  await sql.end({ timeout: 5 });
}
