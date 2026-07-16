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
  // Arquivos presentes no disco mas fora do journal atual (schema ja aplicado).
  { file: "0031_shocking_otto_octavius.sql", when: 1783530000000 },
  { file: "0032_sales_financial_adjustments_by_category.sql", when: 1783531000000 },
  // Journal idx 31-39 (exceto 0038, que ja estava registrada).
  { file: "0031_fluffy_thaddeus_ross.sql", when: 1783530624648 },
  { file: "0032_clear_puppet_master.sql", when: 1783531483288 },
  { file: "0033_orange_typhoid_mary.sql", when: 1783534129856 },
  { file: "0034_sales_members_and_service_fields.sql", when: 1783600000000 },
  { file: "0035_majestic_stryfe.sql", when: 1783704981816 },
  { file: "0036_magical_lionheart.sql", when: 1784031033923 },
  { file: "0037_secret_dark_phoenix.sql", when: 1784035887583 },
  { file: "0038_nebulous_wendell_rand.sql", when: 1784048530058 },
  { file: "0039_sleepy_bedlam.sql", when: 1784202060353 },
  // 0040_keen_roland_deschain.sql permanece pendente de verdade.
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
