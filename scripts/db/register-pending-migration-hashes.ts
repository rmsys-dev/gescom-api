/**
 * Registra apenas o hash da migracao em drizzle.__drizzle_migrations,
 * SEM executar o SQL. Use somente quando o schema ja foi aplicado manualmente.
 * Para aplicar migracoes pendentes de verdade, prefira:
 *   npm run db:repair-pending-migration-sql
 *   npm run db:migrate
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DRIZZLE_DATABASE_URL ou DATABASE_URL ausente.");
}

const migrations = [
  { file: "0022_broken_miek.sql", when: 1783022609828 },
  { file: "0026_fearless_infant_terrible.sql", when: 1783106889545 },
  { file: "0027_slimy_absorbing_man.sql", when: 1783110893404 },
  { file: "0024_open_mandarin.sql", when: 1783085805713 },
  { file: "0028_entity_profile_sales_sync.sql", when: 1783115000000 },
  { file: "0029_young_surge.sql", when: 1783369064049 },
  { file: "0030_closed_thanos.sql", when: 1783435393124 },
] as const;

const sql = postgres(connectionString, { prepare: false, max: 1 });

try {
  let registered = 0;
  let skipped = 0;

  for (const migration of migrations) {
    const content = readFileSync(join("drizzle", migration.file), "utf8");
    const hash = createHash("sha256").update(content).digest("hex");

    const alreadyApplied = await sql<{ exists: boolean }[]>`
      select exists (
        select 1
        from drizzle.__drizzle_migrations
        where hash = ${hash}
      ) as exists
    `;

    if (alreadyApplied[0]?.exists) {
      console.log(`SKIP: ${migration.file} (hash ja registrado)`);
      skipped += 1;
      continue;
    }

    await sql`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${hash}, ${migration.when})
    `;

    console.log(`REGISTRADO: ${migration.file}`);
    registered += 1;
  }

  console.log(
    `\nConcluido: ${registered} registrada(s), ${skipped} ignorada(s).`,
  );
} finally {
  await sql.end({ timeout: 5 });
}
