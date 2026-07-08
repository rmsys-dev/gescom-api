import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DRIZZLE_DATABASE_URL ou DATABASE_URL ausente.");
}

type Journal = {
  entries: Array<{ tag: string; when: number }>;
};

function loadJournalTimestamps(): Map<string, number> {
  const journal = JSON.parse(
    readFileSync(join("drizzle", "meta", "_journal.json"), "utf8"),
  ) as Journal;

  const timestamps = new Map<string, number>();
  for (const entry of journal.entries) {
    timestamps.set(`${entry.tag}.sql`, entry.when);
  }
  return timestamps;
}

function splitStatements(content: string): string[] {
  return content
    .split(/-->\s*statement-breakpoint/g)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const sql = postgres(connectionString, { prepare: false, max: 1 });
const journalTimestamps = loadJournalTimestamps();

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
    throw new Error(
      "Tabela drizzle.__drizzle_migrations nao existe. Execute drizzle-kit migrate uma vez para inicializar o controle de migracoes.",
    );
  }

  const applied = await sql<{ hash: string }[]>`
    select hash from drizzle.__drizzle_migrations
  `;
  const appliedHashes = new Set(applied.map((row) => row.hash));

  const files = readdirSync("drizzle")
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const pending = files.filter((file) => {
    const content = readFileSync(join("drizzle", file), "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    return !appliedHashes.has(hash);
  });

  if (pending.length === 0) {
    console.log("OK: nenhuma migracao pendente.");
    process.exit(0);
  }

  let appliedCount = 0;

  for (const file of pending) {
    const content = readFileSync(join("drizzle", file), "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    const statements = splitStatements(content);
    const createdAt = journalTimestamps.get(file) ?? Date.now();

    console.log(`APLICANDO: ${file}`);

    await sql.begin(async (tx) => {
      for (const statement of statements) {
        await tx.unsafe(statement);
      }

      await tx`
        insert into drizzle.__drizzle_migrations (hash, created_at)
        values (${hash}, ${createdAt})
      `;
    });

    console.log(`APLICADA: ${file}`);
    appliedCount += 1;
  }

  console.log(`\nConcluido: ${appliedCount} migracao(oes) aplicada(s).`);
} finally {
  await sql.end({ timeout: 5 });
}
