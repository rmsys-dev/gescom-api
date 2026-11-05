import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SqlFinding } from "./sql.js";

export type SquawkFinding = SqlFinding & { file: string };

type SquawkJson = {
  file?: string;
  line?: number;
  message?: string;
  help?: string | null;
  rule_name?: string;
};

const require = createRequire(import.meta.url);

function squawkScript(): string {
  return require.resolve("squawk-cli/js/bin/squawk");
}

export function squawkConfigPath(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", ".squawk.toml");
}

export function runSquawk(files: string[]): SquawkFinding[] {
  if (files.length === 0) return [];
  const script = squawkScript();
  const args = ["--reporter", "json", "--config", squawkConfigPath(), ...files];
  let stdout: string;
  try {
    stdout = execFileSync(process.execPath, [script, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const failed = error as { stdout?: string | Buffer; status?: number };
    stdout = failed.stdout ? failed.stdout.toString() : "";
    if (!stdout) {
      const message = error instanceof Error ? error.message : "squawk falhou";
      throw new Error(`squawk não devolveu JSON (${message})`, { cause: error });
    }
  }
  const parsed: unknown = JSON.parse(stdout || "[]");
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((item) => {
    const finding = item as SquawkJson;
    if (!finding.file || !finding.rule_name) return [];
    const line = typeof finding.line === "number" ? finding.line + 1 : 1;
    return [
      {
        file: finding.file,
        ruleId: finding.rule_name,
        line,
      },
    ];
  });
}
