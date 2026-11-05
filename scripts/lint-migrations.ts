import { existsSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  KNOWN_RULE_IDS,
  SQUAWK_EXEMPT_ON_NEW_TABLE,
  SQUAWK_RULES_NOT_EMITTED,
  approvalExample,
  type Severity,
} from "./migration-lint/catalog.js";
import { lintIntegrity, gitRefExists } from "./migration-lint/integrity.js";
import { analyzeSqlFile, createdTables, ruleText, statementAt, type SqlFinding } from "./migration-lint/sql.js";
import { runSquawk } from "./migration-lint/squawk.js";

export { SQUAWK_RULES_NOT_EMITTED };

export type LintFinding = {
  ruleId: string;
  severity: Severity;
  file: string;
  line: number;
  problem: string;
  why: string;
  alternative: string;
  approved: boolean;
};

export type LintMigrationsOptions = {
  base?: string;
  files?: string[];
  cwd?: string;
  squawk?: boolean;
};

export type LintMigrationsResult = {
  findings: LintFinding[];
  exitCode: 0 | 1;
  skipped: boolean;
};

type Pending = SqlFinding & { file: string };

const ALIASES: Record<string, string> = Object.fromEntries(
  SQUAWK_RULES_NOT_EMITTED.map((item) => [item.requested, item.emittedAs]),
);

const APPROVAL = /^--[ \t]*lint-approved:[ \t]*(\S+)[ \t]*(.*)$/;

function repoRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function displayPath(cwd: string, file: string): string {
  const absolute = path.resolve(cwd, file);
  const relative = path.relative(cwd, absolute);
  const shown = relative.startsWith("..") ? absolute : relative;
  return shown.split(path.sep).join("/");
}

function loadOverrides(): Record<string, Severity> {
  const configPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "lint-migrations.config.json");
  const parsed: unknown = JSON.parse(readFileSync(configPath, "utf8"));
  const severity = parsed && typeof parsed === "object" ? (parsed as { severity?: unknown }).severity : {};
  if (!severity || typeof severity !== "object" || Array.isArray(severity)) {
    throw new Error("scripts/lint-migrations.config.json precisa de um objeto severity.");
  }
  const overrides: Record<string, Severity> = {};
  for (const [ruleId, value] of Object.entries(severity)) {
    if (value !== "B" && value !== "W") {
      throw new Error(`Severidade inválida para ${ruleId} em lint-migrations.config.json.`);
    }
    overrides[ruleId] = value;
  }
  return overrides;
}

function toFinding(pending: Pending, overrides: Record<string, Severity>): LintFinding {
  const catalog = ruleText(pending.ruleId);
  return {
    ruleId: pending.ruleId,
    severity: pending.severity ?? overrides[pending.ruleId] ?? catalog.severity,
    file: pending.file,
    line: pending.line,
    problem: pending.text?.problem ?? catalog.problem,
    why: pending.text?.why ?? catalog.why,
    alternative: pending.text?.alternative ?? catalog.alternative,
    approved: false,
  };
}

type Approval = { file: string; line: number; ruleId: string; reason: string };

function readApprovals(cwd: string, file: string): Approval[] {
  const absolute = path.resolve(cwd, file);
  if (!existsSync(absolute)) return [];
  const approvals: Approval[] = [];
  readFileSync(absolute, "utf8")
    .split(/\r?\n/)
    .forEach((line, index) => {
      const match = APPROVAL.exec(line);
      if (!match?.[1]) return;
      approvals.push({
        file: displayPath(cwd, file),
        line: index + 1,
        ruleId: match[1],
        reason: (match[2] ?? "").trim(),
      });
    });
  return approvals;
}

export async function lintMigrations(options: LintMigrationsOptions): Promise<LintMigrationsResult> {
  const cwd = options.cwd ?? process.cwd();
  if (Boolean(options.base) === Boolean(options.files?.length)) {
    throw new Error("Informe só --base ou só --files.");
  }

  if (options.base && !gitRefExists(cwd, options.base)) {
    if (process.env.GITHUB_ACTIONS === "true") {
      throw new Error(`A ref ${options.base} não existe. O checkout do CI precisa de fetch-depth: 0.`);
    }
    return { findings: [], exitCode: 0, skipped: true };
  }

  const overrides = loadOverrides();
  const pending: Pending[] = [];
  let contentFiles: string[];

  if (options.base) {
    const integrity = lintIntegrity(cwd, options.base);
    pending.push(...integrity.findings);
    contentFiles = integrity.contentFiles;
  } else {
    contentFiles = options.files ?? [];
  }

  const statementsByFile = new Map<string, Awaited<ReturnType<typeof analyzeSqlFile>>["statements"]>();
  const squawkInputs: string[] = [];
  for (const file of contentFiles) {
    const absolute = path.resolve(cwd, file);
    if (!existsSync(absolute)) continue;
    const relative = displayPath(cwd, absolute);
    const analyzed = await analyzeSqlFile(absolute);
    statementsByFile.set(relative, analyzed.statements);
    for (const finding of analyzed.findings) pending.push({ ...finding, file: relative });
    if (readFileSync(absolute, "utf8").trim()) squawkInputs.push(absolute);
  }

  if (options.squawk !== false && squawkInputs.length > 0) {
    for (const finding of runSquawk(squawkInputs)) {
      const relative = displayPath(cwd, finding.file);
      const statements = statementsByFile.get(relative) ?? [];
      if (SQUAWK_EXEMPT_ON_NEW_TABLE.has(finding.ruleId)) {
        const statement = statementAt(statements, finding.line);
        const created = createdTables(statements);
        if (statement && statement.tables.length > 0 && statement.tables.every((table) => created.has(table))) {
          continue;
        }
      }
      pending.push({ ...finding, file: relative });
    }
  }

  const seenConcurrent = new Set<string>();
  const unique: Pending[] = [];
  for (const finding of pending) {
    if (finding.ruleId === "ban-concurrent-index-creation-in-transaction") {
      const key = `${finding.file}:${finding.line}`;
      if (seenConcurrent.has(key)) continue;
      seenConcurrent.add(key);
    }
    unique.push(finding);
  }

  const approvalFiles = new Set<string>([
    ...contentFiles.map((file) => displayPath(cwd, file)),
    ...unique.map((finding) => finding.file),
  ]);
  const approvals = [...approvalFiles].flatMap((file) => readApprovals(cwd, file));
  const known = new Set<string>(KNOWN_RULE_IDS);
  for (const finding of unique) known.add(finding.ruleId);

  const accepted = new Map<string, Set<string>>();
  const extra: Pending[] = [];
  for (const approval of approvals) {
    if (approval.reason.length < 15) {
      extra.push({
        ruleId: "AP-02",
        file: approval.file,
        line: approval.line,
        text: { problem: `Motivo curto para ${approval.ruleId}.` },
      });
      continue;
    }
    if (!known.has(approval.ruleId)) {
      const alias = ALIASES[approval.ruleId];
      extra.push({
        ruleId: "AP-01",
        file: approval.file,
        line: approval.line,
        text: {
          problem: alias
            ? `${approval.ruleId} não é emitido nesta versão. O nome usado pelo squawk é ${alias}.`
            : `RULE-ID desconhecido: ${approval.ruleId}.`,
        },
      });
      continue;
    }
    const rules = accepted.get(approval.file) ?? new Set<string>();
    rules.add(approval.ruleId);
    accepted.set(approval.file, rules);
  }

  const findings = [...unique, ...extra].map((finding) => toFinding(finding, overrides));
  const used = new Set<string>();
  for (const finding of findings) {
    if (finding.ruleId === "AP-01" || finding.ruleId === "AP-02") continue;
    if (accepted.get(finding.file)?.has(finding.ruleId)) {
      finding.approved = true;
      used.add(`${finding.file}:${finding.ruleId}`);
    }
  }
  for (const [file, rules] of accepted) {
    for (const ruleId of rules) {
      if (used.has(`${file}:${ruleId}`)) continue;
      findings.push(
        toFinding(
          {
            ruleId,
            file,
            line: approvals.find((approval) => approval.file === file && approval.ruleId === ruleId)?.line ?? 1,
            severity: "W",
            text: {
              problem: "Aprovação sem uso.",
              why: "O comentário libera uma regra que este arquivo não disparou.",
              alternative: "Remova a linha -- lint-approved se a regra não aparece mais.",
            },
          },
          overrides,
        ),
      );
    }
  }

  const exitCode = findings.some((finding) => finding.severity === "B" && !finding.approved) ? 1 : 0;
  return { findings, exitCode, skipped: false };
}

function oneLine(finding: LintFinding): string {
  const status = finding.approved ? " Aprovado neste arquivo." : ` Aprovar: ${approvalExample(finding.ruleId)}`;
  return `${finding.ruleId} ${finding.problem} Por que: ${finding.why} Alternativa: ${finding.alternative}.${status}`.replaceAll("\n", " ");
}

function visibleFindings(findings: LintFinding[]): LintFinding[] {
  const seenWarnings = new Set<string>();
  const visible: LintFinding[] = [];
  for (const finding of findings) {
    if (finding.severity === "W" || finding.approved) {
      const key = `${finding.ruleId}:${finding.file}`;
      if (seenWarnings.has(key)) continue;
      seenWarnings.add(key);
    }
    visible.push(finding);
  }
  return visible;
}

function printHuman(result: LintMigrationsResult): void {
  const visible = visibleFindings(result.findings);
  if (visible.length === 0) {
    console.log("Migrations ok.");
    return;
  }
  for (const finding of visible) {
    console.log(`${finding.ruleId} ${finding.file}:${finding.line}`);
    console.log(`Problema: ${finding.problem}`);
    console.log(`Por que é perigoso: ${finding.why}`);
    console.log(`Alternativa segura: ${finding.alternative}`);
    console.log(
      finding.approved
        ? "Aprovado neste arquivo."
        : `Para aprovar: ${approvalExample(finding.ruleId)}`,
    );
    console.log("");
  }
  if (result.exitCode === 0) console.log("Nenhum achado bloqueante.");
}

function printCi(result: LintMigrationsResult): void {
  if (process.env.GITHUB_ACTIONS !== "true") return;
  for (const finding of visibleFindings(result.findings)) {
    const level = finding.severity === "B" && !finding.approved ? "error" : "warning";
    console.log(`::${level} file=${finding.file},line=${finding.line}::${oneLine(finding)}`);
  }
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (!summary) return;
  const lines = [
    "### Lint de migrations",
    "",
    "| Regra | Arquivo | Severidade | Status |",
    "| --- | --- | --- | --- |",
  ];
  const visible = visibleFindings(result.findings);
  if (visible.length === 0) lines.push("| — | — | — | ok |");
  for (const finding of visible) {
    const status = finding.approved ? "aprovado" : finding.severity === "B" ? "bloqueia" : "aviso";
    lines.push(`| ${finding.ruleId} | ${finding.file}:${finding.line} | ${finding.severity} | ${status} |`);
  }
  lines.push("");
  appendFileSync(summary, `${lines.join("\n")}\n`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let base: string | undefined;
  let files: string | undefined;
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") json = true;
    else if (arg === "--base") base = args[++index];
    else if (arg === "--files") files = args[++index];
    else if (arg?.startsWith("--base=")) base = arg.slice("--base=".length);
    else if (arg?.startsWith("--files=")) files = arg.slice("--files=".length);
    else throw new Error(`Argumento desconhecido: ${arg ?? ""}`);
  }
  if (!base && !files) throw new Error("Uso: tsx scripts/lint-migrations.ts --base origin/main | --files a.sql,b.sql");
  const result = await lintMigrations({
    cwd: repoRoot(),
    base,
    files: files?.split(",").map((file) => file.trim()).filter(Boolean),
  });
  if (result.skipped) process.exit(0);
  if (json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result);
  printCi(result);
  process.exit(result.exitCode);
}

const entry = process.argv[1];
if (entry && path.resolve(entry).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "erro interno";
    console.error(message);
    process.exit(2);
  });
}
