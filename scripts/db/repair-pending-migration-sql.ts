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

const syncHashesOnly = process.argv.includes("--sync-hashes-only");

const journal = JSON.parse(
  readFileSync("drizzle/meta/_journal.json", "utf8"),
) as {
  entries: { tag: string; when: number }[];
};

function hashFile(file: string) {
  const content = readFileSync(join("drizzle", file), "utf8");
  return createHash("sha256").update(content).digest("hex");
}

function statementsFromMigration(file: string) {
  const content = readFileSync(join("drizzle", file), "utf8");
  return content
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

try {
  const applied = await sql<{ hash: string }[]>`
    select hash from drizzle.__drizzle_migrations
  `;
  const appliedHashes = new Set(applied.map((row) => row.hash));

  const pendingFiles = readdirSync("drizzle")
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .filter((file) => !appliedHashes.has(hashFile(file)));

  if (pendingFiles.length === 0) {
    console.log("OK: nenhuma migracao pendente.");
    process.exit(0);
  }

  console.log(
    syncHashesOnly
      ? "Modo: sincronizar apenas hashes (sem executar SQL)"
      : "Modo: executar SQL e sincronizar hashes",
  );

  for (const file of pendingFiles) {
    const tag = file.replace(".sql", "");
    const entry = journal.entries.find((row) => row.tag === tag);
    if (!entry) {
      throw new Error(`Entrada do journal nao encontrada para ${file}`);
    }

    const hash = hashFile(file);

    if (!syncHashesOnly) {
      console.log(`APLICANDO SQL: ${file}`);
      const statements = statementsFromMigration(file);
      await sql.begin(async (tx) => {
        for (const statement of statements) {
          await tx.unsafe(statement);
        }
      });
    } else {
      console.log(`SINCRONIZANDO HASH: ${file}`);
    }

    const updated = await sql`
      update drizzle.__drizzle_migrations
      set hash = ${hash}
      where created_at = ${entry.when}
    `;

    if (updated.count === 0) {
      await sql`
        insert into drizzle.__drizzle_migrations (hash, created_at)
        values (${hash}, ${entry.when})
      `;
      console.log(`REGISTRADO: ${file}`);
    } else {
      console.log(`HASH ATUALIZADO: ${file} (${updated.count} registro(s))`);
    }
  }

  console.log(
    syncHashesOnly
      ? "\nConcluido. Execute npm run db:check-pending-migrations para validar."
      : "\nConcluido. Execute npm run db:migrate para aplicar migracoes posteriores.",
  );
} finally {
  await sql.end({ timeout: 5 });
}
