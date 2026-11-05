import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { SqlFinding } from "./sql.js";

export type JournalEntry = {
  idx: number;
  version?: string;
  when: number;
  tag: string;
  breakpoints?: boolean;
};

type Journal = {
  entries: JournalEntry[];
  rawEntries: unknown[];
};

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function gitRefExists(cwd: string, ref: string): boolean {
  try {
    git(cwd, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stable(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(obj[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function parseJournal(text: string): Journal | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const entries = (parsed as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return null;
  const typed: JournalEntry[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") return null;
    const item = entry as Partial<JournalEntry>;
    if (typeof item.idx !== "number" || typeof item.when !== "number" || typeof item.tag !== "string") {
      return null;
    }
    typed.push({
      idx: item.idx,
      version: item.version,
      when: item.when,
      tag: item.tag,
      breakpoints: item.breakpoints,
    });
  }
  return { entries: typed, rawEntries: entries };
}

function readBaseJournal(cwd: string, base: string): { missing: boolean; journal: Journal | null; invalid: boolean } {
  try {
    const text = git(cwd, ["show", `${base}:drizzle/meta/_journal.json`]);
    const journal = parseJournal(text);
    return { missing: false, journal, invalid: journal === null };
  } catch {
    return { missing: true, journal: null, invalid: false };
  }
}

function listDrizzleFiles(cwd: string): string[] {
  const root = path.join(cwd, "drizzle");
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    }
  };
  walk(root);
  return files;
}

function relative(cwd: string, file: string): string {
  return path.relative(cwd, file).split(path.sep).join("/");
}

export function lintIntegrity(cwd: string, base: string): { findings: Array<SqlFinding & { file: string }>; contentFiles: string[] } {
  const findings: Array<SqlFinding & { file: string }> = [];
  const push = (file: string, finding: SqlFinding): void => {
    findings.push({ ...finding, file });
  };

  let status: string;
  try {
    status = git(cwd, ["diff", "--name-status", "--diff-filter=MDR", "-M", `${base}...HEAD`, "--", "drizzle"]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "git diff falhou";
    push("drizzle/meta/_journal.json", {
      ruleId: "INT-03",
      line: 1,
      text: { problem: `Não foi possível comparar a cadeia com a base (${message}).` },
    });
    return { findings, contentFiles: [] };
  }

  for (const line of status.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const code = parts[0] ?? "";
    const files = parts.slice(1).map((file) => file.replaceAll("\\", "/"));
    for (const file of files) {
      if (!file) continue;
      if (code.startsWith("M") && file.replaceAll("\\", "/") === "drizzle/meta/_journal.json") continue;
      push(file, {
        ruleId: "INT-01",
        line: 1,
        text: { problem: `${code.startsWith("D") ? "Removido" : code.startsWith("R") ? "Renomeado" : "Modificado"}: ${file}.` },
      });
    }
  }

  const journalPath = path.join(cwd, "drizzle", "meta", "_journal.json");
  const journalText = existsSync(journalPath) ? readFileSync(journalPath, "utf8") : "";
  const current = journalText ? parseJournal(journalText) : null;
  const baseJournal = readBaseJournal(cwd, base);

  if (journalText && !current) {
    push("drizzle/meta/_journal.json", {
      ruleId: "INT-03",
      line: 1,
      text: { problem: "drizzle/meta/_journal.json não é um JSON válido." },
    });
  }
  if (baseJournal.invalid) {
    push("drizzle/meta/_journal.json", {
      ruleId: "INT-03",
      line: 1,
      text: { problem: "O journal da base não é um JSON válido." },
    });
  }

  const baseEntries = baseJournal.journal?.rawEntries ?? [];
  const currentRaw = current?.rawEntries ?? [];
  let prefixOk = current !== null || !journalText;
  if (current && !baseJournal.invalid) {
    if (currentRaw.length < baseEntries.length) {
      prefixOk = false;
    } else {
      for (let i = 0; i < baseEntries.length; i += 1) {
        if (stable(baseEntries[i]) !== stable(currentRaw[i])) {
          prefixOk = false;
          break;
        }
      }
    }
    if (!prefixOk) {
      push("drizzle/meta/_journal.json", {
        ruleId: "INT-01",
        line: 1,
        text: {
          problem: "As entradas do journal na base deixaram de ser um prefixo idêntico. O journal só pode crescer no fim.",
        },
      });
    }
  }

  const tail = prefixOk && current ? current.entries.slice(baseEntries.length) : [];
  const baseMaxWhen = (baseJournal.journal?.entries ?? []).reduce(
    (max, entry) => Math.max(max, entry.when),
    Number.NEGATIVE_INFINITY,
  );
  let previousNew = Number.NEGATIVE_INFINITY;
  for (const entry of tail) {
    const sqlFile = `drizzle/${entry.tag}.sql`;
    const afterBase = entry.when > baseMaxWhen;
    const increasing = entry.when > previousNew;
    if (!afterBase || !increasing) {
      const limit = !afterBase ? baseMaxWhen : previousNew;
      push(sqlFile, {
        ruleId: "INT-02",
        line: 1,
        text: {
          problem: `A migration ${entry.tag} tem when ${entry.when}, que não é maior que ${limit === Number.NEGATIVE_INFINITY ? "as anteriores" : limit}.`,
          why: "O migrator do Drizzle só compara o created_at da última migration aplicada e ignora em silêncio qualquer entrada com when menor ou igual.",
          alternative: "Descarte a migration local, atualize com a main, rode db:migrate e gere de novo com db:generate.",
        },
      });
    }
    previousNew = entry.when;
  }
  if (tail.length > 1) {
    push(`drizzle/${tail[1]?.tag ?? "meta/_journal.json"}.sql`, {
      ruleId: "INT-04",
      line: 1,
      text: { problem: `Este PR adiciona ${tail.length} migrations. Elas rodam juntas na mesma transação.` },
    });
  }

  if (current) {
    const tags = new Set<string>();
    const idxs = new Set<number>();
    current.entries.forEach((entry, position) => {
      const sqlFile = path.join(cwd, "drizzle", `${entry.tag}.sql`);
      const snapshot = path.join(cwd, "drizzle", "meta", `${String(entry.idx).padStart(4, "0")}_snapshot.json`);
      if (entry.idx !== position || idxs.has(entry.idx)) {
        push("drizzle/meta/_journal.json", {
          ruleId: "INT-03",
          line: 1,
          text: { problem: `idx ${entry.idx} fora da sequência contínua que começa em 0.` },
        });
      }
      idxs.add(entry.idx);
      if (tags.has(entry.tag)) {
        push("drizzle/meta/_journal.json", {
          ruleId: "INT-03",
          line: 1,
          text: { problem: `Tag repetida no journal: ${entry.tag}.` },
        });
      }
      tags.add(entry.tag);
      if (!existsSync(sqlFile)) {
        push(`drizzle/${entry.tag}.sql`, {
          ruleId: "INT-03",
          line: 1,
          text: { problem: `O journal aponta para drizzle/${entry.tag}.sql, mas o arquivo não existe.` },
        });
      }
      if (!existsSync(snapshot)) {
        push(`drizzle/meta/${String(entry.idx).padStart(4, "0")}_snapshot.json`, {
          ruleId: "INT-03",
          line: 1,
          text: { problem: `Falta o snapshot da entrada ${entry.tag}.` },
        });
      }
    });

    for (const file of listDrizzleFiles(cwd)) {
      const rel = relative(cwd, file);
      const baseName = path.basename(file);
      if (baseName.endsWith(".sql") && !tags.has(baseName.slice(0, -4))) {
        push(rel, { ruleId: "INT-03", line: 1, text: { problem: `SQL órfão, sem entrada no journal: ${rel}.` } });
      }
      if (baseName.endsWith("_snapshot.json")) {
        const idx = Number(baseName.slice(0, 4));
        if (!idxs.has(idx)) {
          push(rel, { ruleId: "INT-03", line: 1, text: { problem: `Snapshot órfão: ${rel}.` } });
        }
      }
      if (readFileSync(file, "utf8").includes("<<<<<<<")) {
        push(rel, { ruleId: "INT-03", line: 1, text: { problem: `Marcador de conflito em ${rel}.` } });
      }
    }
  }

  let added: string[];
  try {
    const names = git(cwd, ["diff", "--name-only", "--diff-filter=A", `${base}...HEAD`, "--", "drizzle"]);
    added = names
      .split(/\r?\n/)
      .map((file) => file.trim().replaceAll("\\", "/"))
      .filter((file) => file.endsWith(".sql"));
  } catch {
    added = [];
  }
  for (const entry of tail) {
    const sqlFile = `drizzle/${entry.tag}.sql`;
    if (!added.includes(sqlFile) && existsSync(path.join(cwd, sqlFile))) added.push(sqlFile);
  }

  return { findings, contentFiles: added };
}
