import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { lintMigrations, type LintFinding } from "../../scripts/lint-migrations.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtures = path.join(repo, "tests", "fixtures", "migrations");
const warningTriggers = new Set(["LK-05"]);
const safeKeepsWarning = new Set(["DL-02"]);

function of(result: LintFinding[], ruleId: string, suffix: string): LintFinding[] {
  const needle = suffix.replaceAll("\\", "/");
  return result.filter((finding) => finding.ruleId === ruleId && finding.file.replaceAll("\\", "/").endsWith(needle));
}

describe("lint de migrations", () => {
  const rules = readdirSync(fixtures, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "special" && entry.name !== "dl-01-table")
    .map((entry) => entry.name);

  it("cobre cada regra com disparo, caso seguro e aprovação", async () => {
    const files = rules.flatMap((rule) =>
      ["trigger.sql", "safe.sql", "approved.sql"].map((name) => path.join(fixtures, rule, name)),
    );
    const result = await lintMigrations({ cwd: repo, files });

    for (const rule of rules) {
      const trigger = of(result.findings, rule, `${rule}/trigger.sql`);
      const safe = of(result.findings, rule, `${rule}/safe.sql`);
      const approved = of(result.findings, rule, `${rule}/approved.sql`);
      const expected = warningTriggers.has(rule) ? "W" : "B";

      assert.ok(trigger.some((finding) => finding.severity === expected && !finding.approved), `${rule} não disparou`);
      assert.ok(approved.length > 0 && approved.every((finding) => finding.approved), `${rule} não aceitou a aprovação`);

      if (safeKeepsWarning.has(rule)) {
        assert.ok(safe.every((finding) => finding.severity === "W"), `${rule} seguro ainda bloqueia`);
        assert.ok(safe.length > 0, `${rule} seguro não avisou`);
      } else {
        assert.equal(safe.length, 0, `${rule} seguro ainda dispara: ${safe.map((finding) => finding.problem).join("; ")}`);
      }
    }
  });

  it("não confunde comentário nem string com DROP TABLE", async () => {
    const file = path.join(fixtures, "special", "false-positive.sql");
    const result = await lintMigrations({ cwd: repo, files: [file] });
    const blocked = result.findings.filter((finding) =>
      ["ban-drop-table", "DL-04", "DL-01", "ban-drop-column"].includes(finding.ruleId),
    );
    assert.equal(blocked.length, 0);
  });

  it("entende statement-breakpoint e identificadores entre aspas", async () => {
    const file = path.join(fixtures, "special", "breakpoint.sql");
    const result = await lintMigrations({ cwd: repo, files: [file] });
    const rename = result.findings.filter((finding) => finding.ruleId === "DL-01");
    assert.ok(rename.length > 0);
    assert.ok(rename.some((finding) => finding.line >= 1));
  });

  it("isenta tabela criada no mesmo arquivo das regras de lock", async () => {
    const file = path.join(fixtures, "special", "new-table-exempt.sql");
    const result = await lintMigrations({ cwd: repo, files: [file] });
    const flagged = result.findings.filter((finding) =>
      ["LK-01", "LK-03", "disallowed-unique-constraint", "require-concurrent-index-creation", "adding-foreign-key-constraint"].includes(
        finding.ruleId,
      ),
    );
    assert.equal(flagged.length, 0, flagged.map((finding) => finding.ruleId).join(", "));
  });

  it("rejeita motivo curto e regra inexistente, e avisa aprovação sem uso", async () => {
    const result = await lintMigrations({
      cwd: repo,
      files: [
        path.join(fixtures, "special", "short-reason.sql"),
        path.join(fixtures, "special", "unknown-rule.sql"),
        path.join(fixtures, "special", "unused-approval.sql"),
      ],
    });
    assert.ok(result.findings.some((finding) => finding.ruleId === "AP-02" && finding.severity === "B"));
    assert.ok(result.findings.some((finding) => finding.ruleId === "AP-01" && finding.severity === "B"));
    assert.ok(result.findings.some((finding) => finding.problem === "Aprovação sem uso."));
    const truncate = result.findings.find((finding) => finding.ruleId === "DL-03" && finding.file.includes("short-reason"));
    assert.equal(truncate?.approved, false);
  });

  it("trata ADD VALUE isolado como aviso", async () => {
    const result = await lintMigrations({ cwd: repo, files: [path.join(fixtures, "special", "enum-add-only.sql")] });
    const findings = result.findings.filter((finding) => finding.ruleId === "EN-01");
    assert.ok(findings.some((finding) => finding.severity === "W"));
    assert.equal(findings.some((finding) => finding.severity === "B"), false);
  });

  it("reconhece falso rename de tabela pelo snapshot", async () => {
    const file = path.join(fixtures, "dl-01-table", "drizzle", "0001_rename.sql");
    const result = await lintMigrations({ cwd: repo, files: [file] });
    assert.ok(result.findings.some((finding) => finding.ruleId === "DL-01" && finding.problem.includes("old_users")));
  });
});

describe("integridade da cadeia", () => {
  it("bloqueia edição, timestamp antigo e journal quebrado, e aceita a exceção", async () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "gescom-lint-"));
    try {
      git(cwd, ["init", "-b", "main"]);
      writeMigration(cwd, "0000_base", 10, 0, `CREATE TABLE "public"."users" ("id" integer);\n`, {});
      commit(cwd, "base");
      const base = revision(cwd);

      writeMigration(cwd, "0000_base", 10, 0, `CREATE TABLE "public"."users" ("id" integer, "email" text);\n`, {});
      commit(cwd, "edita");
      const edited = await lintMigrations({ cwd, base });
      assert.ok(edited.findings.some((finding) => finding.ruleId === "INT-01" && !finding.approved));

      reset(cwd, base);
      writeMigration(cwd, "0001_next", 20, 1, `CREATE TABLE "public"."t" ("id" integer);\n`, {
        "public.t": { columns: { id: { name: "id" } } },
      });
      commit(cwd, "nova");
      const safe = await lintMigrations({ cwd, base });
      assert.equal(safe.findings.some((finding) => finding.ruleId === "INT-01"), false);
      assert.equal(safe.findings.some((finding) => finding.ruleId === "INT-02"), false);
      assert.equal(safe.findings.some((finding) => finding.ruleId === "INT-03"), false);
      assert.equal(safe.findings.some((finding) => finding.ruleId === "INT-04"), false);

      reset(cwd, base);
      writeFileSync(
        path.join(cwd, "drizzle", "0000_base.sql"),
        `-- lint-approved: INT-01 excecao revisada pelo code owner\nCREATE TABLE "public"."users" ("id" integer);\n`,
      );
      commit(cwd, "aprovada");
      const approved = await lintMigrations({ cwd, base });
      const immutable = approved.findings.filter((finding) => finding.ruleId === "INT-01");
      assert.ok(immutable.length > 0 && immutable.every((finding) => finding.approved));

      reset(cwd, base);
      writeMigration(cwd, "0001_old", 5, 1, `CREATE TABLE "public"."old" ("id" integer);\n`, {
        "public.old": { columns: { id: { name: "id" } } },
      });
      commit(cwd, "antiga");
      const outOfOrder = await lintMigrations({ cwd, base });
      assert.ok(outOfOrder.findings.some((finding) => finding.ruleId === "INT-02" && !finding.approved));

      reset(cwd, base);
      writeMigration(
        cwd,
        "0001_old",
        5,
        1,
        `-- lint-approved: INT-02 excecao revisada pelo code owner\nCREATE TABLE "public"."old" ("id" integer);\n`,
        { "public.old": { columns: { id: { name: "id" } } } },
      );
      commit(cwd, "antiga aprovada");
      const outApproved = await lintMigrations({ cwd, base });
      const temporal = outApproved.findings.filter((finding) => finding.ruleId === "INT-02");
      assert.ok(temporal.length > 0 && temporal.every((finding) => finding.approved));

      reset(cwd, base);
      writeMigration(cwd, "0001_bad", 20, 1, `-- lint-approved: INT-03 excecao revisada pelo code owner\n<<<<<<<\n`, {
        "public.marker": { columns: { id: { name: "id" } } },
      });
      commit(cwd, "conflito");
      const conflict = await lintMigrations({ cwd, base });
      const chain = conflict.findings.filter((finding) => finding.ruleId === "INT-03");
      assert.ok(chain.length > 0 && chain.every((finding) => finding.approved));

      reset(cwd, base);
      writeMigration(cwd, "0001_a", 20, 1, `CREATE TABLE "public"."a" ("id" integer);\n`, {
        "public.a": { columns: { id: { name: "id" } } },
      });
      writeMigration(cwd, "0002_b", 30, 2, `CREATE TABLE "public"."b" ("id" integer);\n`, {
        "public.a": { columns: { id: { name: "id" } } },
        "public.b": { columns: { id: { name: "id" } } },
      });
      commit(cwd, "duas");
      const many = await lintMigrations({ cwd, base });
      assert.ok(many.findings.some((finding) => finding.ruleId === "INT-04" && finding.severity === "W" && !finding.approved));

      reset(cwd, base);
      writeMigration(cwd, "0001_a", 20, 1, `CREATE TABLE "public"."a" ("id" integer);\n`, {
        "public.a": { columns: { id: { name: "id" } } },
      });
      writeMigration(
        cwd,
        "0002_b",
        30,
        2,
        `-- lint-approved: INT-04 excecao revisada pelo code owner\nCREATE TABLE "public"."b" ("id" integer);\n`,
        {
          "public.a": { columns: { id: { name: "id" } } },
          "public.b": { columns: { id: { name: "id" } } },
        },
      );
      commit(cwd, "duas aprovadas");
      const manyApproved = await lintMigrations({ cwd, base });
      const batch = manyApproved.findings.filter((finding) => finding.ruleId === "INT-04");
      assert.ok(batch.length > 0 && batch.every((finding) => finding.approved));
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-c", "core.autocrlf=false", "-c", "user.email=lint@example.com", "-c", "user.name=Lint", ...args], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Lint",
      GIT_AUTHOR_EMAIL: "lint@example.com",
      GIT_COMMITTER_NAME: "Lint",
      GIT_COMMITTER_EMAIL: "lint@example.com",
    },
  });
}

function commit(cwd: string, message: string): void {
  git(cwd, ["add", "drizzle"]);
  git(cwd, ["commit", "-m", message]);
}

function revision(cwd: string): string {
  return git(cwd, ["rev-parse", "HEAD"]).trim();
}

function reset(cwd: string, sha: string): void {
  git(cwd, ["reset", "--hard", sha]);
}

function writeMigration(
  cwd: string,
  tag: string,
  when: number,
  idx: number,
  sql: string,
  tables: Record<string, unknown>,
): void {
  const journalPath = path.join(cwd, "drizzle", "meta", "_journal.json");
  mkdirSync(path.dirname(journalPath), { recursive: true });
  const current = exists(journalPath)
    ? (JSON.parse(readFileSync(journalPath, "utf8")) as { entries: Array<Record<string, unknown>> })
    : { version: "7", dialect: "postgresql", entries: [] };
  const without = current.entries.filter((entry) => entry.tag !== tag && entry.idx !== idx);
  without.push({ idx, version: "7", when, tag, breakpoints: true });
  without.sort((left, right) => Number(left.idx) - Number(right.idx));
  writeFileSync(journalPath, JSON.stringify({ version: "7", dialect: "postgresql", entries: without }, null, 2));
  writeFileSync(path.join(cwd, "drizzle", `${tag}.sql`), sql);
  const previous = idx === 0 ? "00000000-0000-0000-0000-000000000000" : `00000000-0000-0000-0000-${String(idx).padStart(12, "0")}`;
  writeFileSync(
    path.join(cwd, "drizzle", "meta", `${String(idx).padStart(4, "0")}_snapshot.json`),
    JSON.stringify({
      id: `00000000-0000-0000-0000-${String(idx + 1).padStart(12, "0")}`,
      prevId: previous,
      tables,
    }),
  );
}

function exists(file: string): boolean {
  try {
    readFileSync(file);
    return true;
  } catch {
    return false;
  }
}
