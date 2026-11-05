/**
 * Migration de produção. Roda no ambiente de deploy, antes de trocar a versão da API.
 *
 * A URL precisa ser conexão direta. Não use pgbouncer em transaction mode nem RDS Proxy:
 * pg_advisory_lock é um lock de sessão e esses pools devolvem a conexão no meio do caminho.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { lintMigrations } from "./lint-migrations.js";

const ADVISORY_LOCK_KEY = 814275301;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsFolder = path.join(root, "drizzle");

type JournalEntry = { idx: number; when: number; tag: string };

class MigrationAbort extends Error {
  readonly dryRun: boolean;

  constructor(message: string, dryRun: boolean) {
    super(message);
    this.name = "MigrationAbort";
    this.dryRun = dryRun;
  }
}

function fail(message: string, dryRun: boolean): never {
  throw new MigrationAbort(message, dryRun);
}

function timeoutValue(dryRun: boolean): string {
  const value = (process.env.MIGRATION_STATEMENT_TIMEOUT ?? "120s").trim();
  if (!/^\d+(ms|s|min|h)$/.test(value)) {
    fail("MIGRATION_STATEMENT_TIMEOUT inválido. Use um inteiro seguido de ms, s, min ou h.", dryRun);
  }
  return value;
}

function readJournal(): JournalEntry[] {
  const journal = JSON.parse(readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf8")) as {
    entries?: JournalEntry[];
  };
  if (!Array.isArray(journal.entries)) fail("Journal de migrations inválido.", false);
  return journal.entries;
}

async function appliedTimestamps(sql: postgres.Sql): Promise<number[]> {
  const tables = await sql<{ ok: number }[]>`
    SELECT 1 AS ok
    FROM information_schema.tables
    WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
  `;
  if (tables.length === 0) return [];
  const rows = await sql<{ created_at: string | number | null }[]>`
    SELECT created_at FROM drizzle.__drizzle_migrations
  `;
  return rows
    .map((row) => Number(row.created_at))
    .filter((value) => Number.isFinite(value));
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const databaseUrl = process.env.MIGRATION_DATABASE_URL?.trim();
  if (!databaseUrl) {
    fail("Defina MIGRATION_DATABASE_URL com a conexão direta do banco (porta 5432 ou session mode).", dryRun);
  }
  const statementTimeout = timeoutValue(dryRun);
  const sql = postgres(databaseUrl, { max: 1 });
  let locked = false;

  try {
    await sql.unsafe("SET lock_timeout = '5s'");
    await sql.unsafe(`SET statement_timeout = '${statementTimeout}'`);
    await sql`SELECT pg_advisory_lock(${ADVISORY_LOCK_KEY})`;
    locked = true;

    const journal = readJournal();
    const seenWhen = new Set<number>();
    for (const entry of journal) {
      if (seenWhen.has(entry.when)) {
        fail(`O journal tem duas migrations com when ${entry.when}. O migrator não distingue uma da outra.`, dryRun);
      }
      seenWhen.add(entry.when);
    }

    const applied = await appliedTimestamps(sql);
    const appliedSet = new Set(applied);
    const lastApplied = applied.length > 0 ? Math.max(...applied) : null;
    const ignored = journal.filter((entry) => lastApplied !== null && entry.when <= lastApplied && !appliedSet.has(entry.when));
    const pending = journal.filter((entry) => lastApplied === null || entry.when > lastApplied);

    console.log(`[migrate] última aplicada: ${lastApplied ?? "nenhuma"}`);
    console.log(`[migrate] pendentes: ${pending.map((entry) => entry.tag).join(", ") || "nenhuma"}`);
    if (ignored.length > 0) {
      const names = ignored.map((entry) => `${entry.tag} (when ${entry.when})`).join(", ");
      fail(
        `Estas migrations seriam ignoradas em silêncio pelo Drizzle, porque o when é menor ou igual ao último created_at aplicado: ${names}.`,
        dryRun,
      );
    }

    if (pending.length === 0) {
      console.log("[migrate] Nada a aplicar.");
      return;
    }

    const lint = await lintMigrations({
      cwd: root,
      files: pending.map((entry) => path.join("drizzle", `${entry.tag}.sql`)),
    });
    for (const finding of lint.findings) {
      const state = finding.approved ? "aprovado" : finding.severity;
      console.log(`[migrate] lint ${state} ${finding.ruleId} ${finding.file}:${finding.line} ${finding.problem}`);
    }
    if (lint.exitCode !== 0) {
      fail("O lint bloqueou a migration. Não há bypass por variável de ambiente.", dryRun);
    }
    if (dryRun) {
      console.log("[migrate] dry-run: nada foi aplicado.");
      return;
    }

    const started = new Date();
    const clock = performance.now();
    console.log(`[migrate] início ${started.toISOString()}`);
    const db = drizzle(sql);
    await migrate(db, {
      migrationsFolder,
      migrationsSchema: "drizzle",
      migrationsTable: "__drizzle_migrations",
    });
    const seconds = ((performance.now() - clock) / 1000).toFixed(1);
    console.log(`[migrate] fim ${new Date().toISOString()} (${seconds}s)`);
  } catch (error) {
    if (error instanceof MigrationAbort) throw error;
    const message = error instanceof Error ? error.message : "falha desconhecida";
    throw new MigrationAbort(message, dryRun);
  } finally {
    if (locked) {
      try {
        await sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`;
      } catch {
        // A queda da sessão também solta o advisory lock.
      }
    }
    await sql.end();
  }
}

const entry = process.argv[1];
if (entry && path.resolve(entry).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main().catch((error: unknown) => {
    const dryRun = error instanceof MigrationAbort ? error.dryRun : false;
    const message = error instanceof Error ? error.message : "erro interno";
    console.error(`[migrate] ${message}`);
    if (!dryRun) {
      console.error("[migrate] A migration falhou. A versão antiga da API continua no ar; não troque a versão.");
    }
    process.exit(1);
  });
}
