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
    "Defina DRIZZLE_DATABASE_URL ou DATABASE_URL para registrar migracoes.",
  );
}

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const journalPath = join(root, "drizzle/meta/_journal.json");
const lastBaselineIdx = 12;

type Journal = {
  entries: { idx: number; when: number; tag: string }[];
};

const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;
const entriesToBaseline = journal.entries
  .filter((entry) => entry.idx <= lastBaselineIdx)
  .sort((a, b) => a.idx - b.idx);

if (entriesToBaseline.length !== lastBaselineIdx + 1) {
  throw new Error(
    `Journal incompleto: esperado ${lastBaselineIdx + 1} entradas ate idx ${lastBaselineIdx}.`,
  );
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

const assertSchemaReadyForBaseline = async () => {
  const boxColumn = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'stock_locations'
        and column_name = 'box'
    ) as exists
  `;

  if (!boxColumn[0]?.exists) {
    throw new Error(
      "Pre-condicao falhou: coluna stock_locations.box nao existe. " +
        "O banco pode nao refletir a migracao 0012. Nao execute o baseline.",
    );
  }

  const codeColumn = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'stock_locations'
        and column_name = 'code'
    ) as exists
  `;

  if (codeColumn[0]?.exists) {
    throw new Error(
      "Pre-condicao falhou: coluna stock_locations.code ainda existe. " +
        "A migracao 0012 parece nao aplicada.",
    );
  }
};

try {
  console.log("Validando pre-condicoes do baseline (schema >= 0012)...");
  await assertSchemaReadyForBaseline();
  console.log("OK: stock_locations.box presente, code ausente.\n");

  let registered = 0;
  let skipped = 0;

  for (const entry of entriesToBaseline) {
    const migrationPath = `drizzle/${entry.tag}.sql`;
    const fileHash = createHash("sha256")
      .update(readFileSync(join(root, migrationPath), "utf8"))
      .digest("hex");

    const alreadyApplied = await sql<{ exists: boolean }[]>`
      select exists (
        select 1
        from drizzle.__drizzle_migrations
        where hash = ${fileHash}
      ) as exists
    `;

    if (alreadyApplied[0]?.exists) {
      console.log(`SKIP: ${migrationPath} (hash ja registrado)`);
      skipped += 1;
      continue;
    }

    await sql`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${fileHash}, ${entry.when})
    `;

    console.log(`REGISTRADO: ${migrationPath}`);
    registered += 1;
  }

  console.log(
    `\nBaseline concluido: ${registered} registrada(s), ${skipped} ignorada(s).`,
  );
  console.log("Execute: npm run db:check-pending-migrations");
  console.log("Depois: npm run db:migrate");
} finally {
  await sql.end({ timeout: 5 });
}
