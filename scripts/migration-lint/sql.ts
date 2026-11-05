import { readFileSync } from "node:fs";
import path from "node:path";
import { loadModule, parseSync } from "libpg-query";
import { RULES, type RuleText, type Severity } from "./catalog.js";

export type SqlFinding = {
  ruleId: string;
  line: number;
  severity?: Severity;
  text?: Partial<Pick<RuleText, "problem" | "why" | "alternative">>;
};

type Obj = Record<string, unknown>;

export type ParsedStatement = {
  line: number;
  endLine: number;
  kind: string;
  value: Obj;
  tables: string[];
};

let moduleReady: Promise<void> | null = null;

function ensureParser(): Promise<void> {
  moduleReady ??= loadModule();
  return moduleReady;
}

function asObj(value: unknown): Obj | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Obj;
  }
  return null;
}

function unwrap(node: unknown): { kind: string; value: Obj } | null {
  const obj = asObj(node);
  if (!obj) return null;
  const keys = Object.keys(obj);
  if (keys.length !== 1) return null;
  const kind = keys[0];
  if (!kind) return null;
  return { kind, value: asObj(obj[kind]) ?? {} };
}

function lineAt(sql: string, offset: number): number {
  const end = Math.max(0, Math.min(offset, sql.length));
  let line = 1;
  for (let i = 0; i < end; i += 1) {
    if (sql.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function tableKey(schema: string | undefined, name: string | undefined): string {
  return `${(schema || "public").toLowerCase()}.${(name || "").toLowerCase()}`;
}

function relationOf(node: unknown): string | null {
  const wrapped = unwrap(node);
  const obj = wrapped?.kind === "RangeVar" ? wrapped.value : asObj(node);
  if (!obj || typeof obj.relname !== "string") return null;
  const schema = typeof obj.schemaname === "string" ? obj.schemaname : undefined;
  return tableKey(schema, obj.relname);
}

function stringItems(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap((item) => stringItems(item));
  const nodeObj = unwrap(node);
  if (!nodeObj) return [];
  if (nodeObj.kind === "String" && typeof nodeObj.value.sval === "string") {
    return [nodeObj.value.sval];
  }
  if (nodeObj.kind === "List" || nodeObj.kind === "OidList") {
    return stringItems(nodeObj.value.items);
  }
  return [];
}

function listNodes(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function columnNames(createValue: Obj): string[] {
  const names: string[] = [];
  for (const elt of listNodes(createValue.tableElts)) {
    const node = unwrap(elt);
    if (node?.kind === "ColumnDef" && typeof node.value.colname === "string") {
      names.push(node.value.colname.toLowerCase());
    }
  }
  return names;
}

function constraintOf(def: unknown): Obj | null {
  const node = unwrap(def);
  if (node?.kind === "Constraint") return node.value;
  return asObj(def);
}

function columnDefOf(def: unknown): Obj | null {
  const node = unwrap(def);
  if (node?.kind === "ColumnDef") return node.value;
  return null;
}

function isStoredGenerated(column: Obj | null): boolean {
  if (!column) return false;
  for (const constraintNode of listNodes(column.constraints)) {
    const constraint = constraintOf(constraintNode);
    if (!constraint) continue;
    if (constraint.contype === "CONSTR_GENERATED" && constraint.generated_kind === "s") {
      return true;
    }
  }
  return false;
}

function collectConstStrings(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectConstStrings(item, out);
    return;
  }
  const obj = asObj(node);
  if (!obj) return;
  const wrapped = unwrap(node);
  if (wrapped?.kind === "A_Const") {
    const sval = asObj(wrapped.value.sval);
    if (sval && typeof sval.sval === "string") out.push(sval.sval);
    return;
  }
  for (const value of Object.values(obj)) collectConstStrings(value, out);
}

function hasConcurrentParam(value: Obj): boolean {
  return listNodes(value.params).some((param) => {
    const node = unwrap(param);
    return node?.kind === "DefElem" && node.value.defname === "concurrently";
  });
}

function vacuumIsFull(value: Obj): boolean {
  return listNodes(value.options).some((option) => {
    const node = unwrap(option);
    return node?.kind === "DefElem" && node.value.defname === "full";
  });
}

type DroppedColumn = { table: string; column: string; line: number };
type AddedColumn = { table: string; column: string; line: number };
type CreatedTable = { table: string; columns: string[]; line: number };
type DroppedTable = { table: string; line: number };

function pushFinding(findings: SqlFinding[], ruleId: string, line: number, text?: SqlFinding["text"]): void {
  findings.push({ ruleId, line, text });
}

function statementTables(kind: string, value: Obj): string[] {
  if (kind === "CreateStmt" || kind === "AlterTableStmt" || kind === "IndexStmt" || kind === "ClusterStmt") {
    const table = relationOf(value.relation);
    return table ? [table] : [];
  }
  if (kind === "DeleteStmt" || kind === "UpdateStmt" || kind === "TruncateStmt" || kind === "LockStmt" || kind === "VacuumStmt") {
    const direct = relationOf(value.relation);
    if (direct) return [direct];
    const fromRelations = listNodes(value.relations ?? value.rels);
    return fromRelations
      .map((item) => {
        const vacuum = unwrap(item);
        if (vacuum?.kind === "VacuumRelation") return relationOf(vacuum.value.relation);
        return relationOf(item);
      })
      .filter((table): table is string => Boolean(table));
  }
  if (kind === "DropStmt" && value.removeType === "OBJECT_TABLE") {
    return listNodes(value.objects)
      .map((object) => {
        const parts = stringItems(object);
        if (parts.length === 0) return null;
        if (parts.length === 1) return tableKey(undefined, parts[0]);
        return tableKey(parts[parts.length - 2], parts[parts.length - 1]);
      })
      .filter((table): table is string => Boolean(table));
  }
  if (kind === "ReindexStmt") {
    const table = relationOf(value.relation);
    return table ? [table] : [];
  }
  return [];
}

function parseChunk(sql: string, offset: number, fileSql: string): { statements: ParsedStatement[]; failure: SqlFinding | null } {
  let parsed: { stmts?: Array<{ stmt?: unknown; stmt_location?: number; stmt_len?: number }> };
  try {
    parsed = parseSync(sql) as typeof parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha ao interpretar o SQL";
    const cursor =
      error && typeof error === "object" && "sqlDetails" in error
        ? (error as { sqlDetails?: { cursorPosition?: number } }).sqlDetails?.cursorPosition
        : undefined;
    const position = typeof cursor === "number" && cursor >= 0 ? offset + cursor : offset;
    return {
      statements: [],
      failure: {
        ruleId: "SC-04",
        line: lineAt(fileSql, position),
        text: {
          problem: `O parser não conseguiu interpretar este statement (${message}).`,
        },
      },
    };
  }

  const statements: ParsedStatement[] = [];
  for (const raw of parsed.stmts ?? []) {
    const wrapped = unwrap(raw.stmt);
    if (!wrapped) {
      statements.push({
        line: lineAt(fileSql, offset),
        endLine: lineAt(fileSql, offset),
        kind: "Unknown",
        value: {},
        tables: [],
      });
      continue;
    }
    const location = typeof raw.stmt_location === "number" ? offset + raw.stmt_location : offset;
    const line = lineAt(fileSql, location);
    statements.push({
      line,
      endLine: line,
      kind: wrapped.kind,
      value: wrapped.value,
      tables: statementTables(wrapped.kind, wrapped.value),
    });
  }
  return { statements, failure: null };
}

export async function parseMigrationSql(fileSql: string): Promise<{ statements: ParsedStatement[]; failures: SqlFinding[] }> {
  await ensureParser();
  const whole = parseChunk(fileSql, 0, fileSql);
  if (!whole.failure) {
    assignEndLines(whole.statements, fileSql);
    return { statements: whole.statements, failures: [] };
  }

  const marker = "--> statement-breakpoint";
  const chunks: Array<{ sql: string; offset: number }> = [];
  let start = 0;
  while (start <= fileSql.length) {
    const index = fileSql.indexOf(marker, start);
    if (index === -1) {
      chunks.push({ sql: fileSql.slice(start), offset: start });
      break;
    }
    chunks.push({ sql: fileSql.slice(start, index), offset: start });
    start = index + marker.length;
  }

  const statements: ParsedStatement[] = [];
  const failures: SqlFinding[] = [];
  for (const chunk of chunks) {
    if (chunk.sql.trim() === "") continue;
    const parsed = parseChunk(chunk.sql, chunk.offset, fileSql);
    if (parsed.failure) failures.push(parsed.failure);
    statements.push(...parsed.statements);
  }
  assignEndLines(statements, fileSql);
  return { statements, failures };
}

function assignEndLines(statements: ParsedStatement[], fileSql: string): void {
  const last = lineAt(fileSql, fileSql.length);
  for (let i = 0; i < statements.length; i += 1) {
    const next = statements[i + 1];
    const current = statements[i];
    if (!current) continue;
    current.endLine = next ? Math.max(current.line, next.line - 1) : last;
  }
}

type SnapshotTable = { columns: Set<string> };

function snapshotTables(snapshot: Obj | null): Map<string, SnapshotTable> {
  const tables = new Map<string, SnapshotTable>();
  const raw = asObj(snapshot?.tables);
  if (!raw) return tables;
  for (const [key, value] of Object.entries(raw)) {
    const table = asObj(value);
    const columns = asObj(table?.columns);
    const names = new Set<string>();
    if (columns) {
      for (const columnName of Object.keys(columns)) names.add(columnName.toLowerCase());
    }
    tables.set(key.toLowerCase(), { columns: names });
  }
  return tables;
}

function readJson(file: string): Obj | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    return asObj(parsed);
  } catch {
    return null;
  }
}

export function snapshotsForSql(file: string): { previous: Obj | null; current: Obj | null } {
  const directory = path.dirname(file);
  if (path.basename(directory) !== "drizzle") return { previous: null, current: null };
  const journal = readJson(path.join(directory, "meta", "_journal.json"));
  const entries = Array.isArray(journal?.entries) ? journal.entries : [];
  const tag = path.basename(file, ".sql");
  const entry = entries
    .map((item) => asObj(item))
    .find((item) => item?.tag === tag);
  if (!entry || typeof entry.idx !== "number") return { previous: null, current: null };
  const currentName = `${String(entry.idx).padStart(4, "0")}_snapshot.json`;
  const current = readJson(path.join(directory, "meta", currentName));
  if (entry.idx === 0) return { previous: null, current };
  const previousName = `${String(entry.idx - 1).padStart(4, "0")}_snapshot.json`;
  return { previous: readJson(path.join(directory, "meta", previousName)), current };
}

function snapshotBody(snapshot: Obj): string {
  const copy: Obj = { ...snapshot };
  delete copy.id;
  delete copy.prevId;
  return JSON.stringify(sortValue(copy));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sortValue(item));
  const obj = asObj(value);
  if (!obj) return value;
  const sorted: Obj = {};
  for (const key of Object.keys(obj).sort()) sorted[key] = sortValue(obj[key]);
  return sorted;
}

export function snapshotsEqual(left: Obj, right: Obj): boolean {
  return snapshotBody(left) === snapshotBody(right);
}

const RLS = new Set([
  "AT_EnableRowSecurity",
  "AT_DisableRowSecurity",
  "AT_ForceRowSecurity",
  "AT_NoForceRowSecurity",
]);

const TRIGGER_TOGGLE = new Set([
  "AT_EnableTrig",
  "AT_EnableAlwaysTrig",
  "AT_EnableReplicaTrig",
  "AT_DisableTrig",
  "AT_EnableTrigAll",
  "AT_DisableTrigAll",
  "AT_EnableTrigUser",
  "AT_DisableTrigUser",
]);

const SESSION_SET = new Set(["lock_timeout", "statement_timeout", "role", "search_path"]);

export async function analyzeSqlFile(file: string): Promise<{ findings: SqlFinding[]; statements: ParsedStatement[] }> {
  const fileSql = readFileSync(file, "utf8");
  const { statements, failures } = await parseMigrationSql(fileSql);
  const findings = [...failures];
  const created = new Map<string, CreatedTable>();
  const droppedColumns: DroppedColumn[] = [];
  const addedColumns: AddedColumn[] = [];
  const droppedTables: DroppedTable[] = [];
  const heavyTables = new Set<string>();
  const addedEnumValues: Array<{ value: string; line: number }> = [];
  const enumUses = new Map<string, number>();

  for (const statement of statements) {
    if (statement.kind !== "CreateStmt") continue;
    const table = relationOf(statement.value.relation);
    if (!table) continue;
    created.set(table, { table, columns: columnNames(statement.value), line: statement.line });
  }

  const createdNames = new Set(created.keys());
  const onExisting = (tables: string[]): boolean => tables.some((table) => !createdNames.has(table));
  const markHeavy = (tables: string[]): void => {
    for (const table of tables) {
      if (!createdNames.has(table)) heavyTables.add(table);
    }
  };

  for (const statement of statements) {
    const { kind, value, line, tables } = statement;
    const existing = onExisting(tables);

    if (kind === "DeleteStmt" || kind === "UpdateStmt") {
      if (value.whereClause) {
        pushFinding(findings, "DL-02", line, {
          problem: "DELETE ou UPDATE com WHERE.",
          why: "O filtro pode atingir mais linhas do que o backfill pretendia. Confira a semântica e o volume.",
          alternative: "Rode o predicado antes, em leitura, e confirme a quantidade de linhas.",
        });
        const whereFinding = findings[findings.length - 1];
        if (whereFinding) whereFinding.severity = "W";
      } else {
        pushFinding(findings, "DL-02", line);
      }
    }

    if (kind === "TruncateStmt") pushFinding(findings, "DL-03", line);

    if (kind === "DropStmt") {
      const removeType = value.removeType;
      if (removeType === "OBJECT_SCHEMA" || removeType === "OBJECT_TYPE" || removeType === "OBJECT_DATABASE") {
        pushFinding(findings, "DL-04", line);
      }
      if (removeType === "OBJECT_TABLE") {
        for (const table of tables) droppedTables.push({ table, line });
      }
      if (removeType === "OBJECT_EXTENSION" || removeType === "OBJECT_POLICY") {
        pushFinding(findings, "SC-02", line);
      }
      if (removeType === "OBJECT_TRIGGER" || removeType === "OBJECT_FUNCTION" || removeType === "OBJECT_PROCEDURE" || removeType === "OBJECT_RULE") {
        pushFinding(findings, "SC-03", line);
      }
      if (removeType === "OBJECT_INDEX" && value.concurrent === true) {
        pushFinding(findings, "ban-concurrent-index-creation-in-transaction", line, {
          problem: "DROP INDEX CONCURRENTLY dentro da transação do Drizzle.",
        });
      }
    }

    if (kind === "DropdbStmt") pushFinding(findings, "DL-04", line);
    if (kind === "AlterSystemStmt") pushFinding(findings, "SC-02", line);
    if (kind === "CreateExtensionStmt" || kind === "AlterExtensionStmt" || kind === "AlterExtensionContentsStmt") {
      pushFinding(findings, "SC-02", line);
    }
    if (kind === "GrantStmt" || kind === "GrantRoleStmt" || kind === "AlterDefaultPrivilegesStmt") {
      pushFinding(findings, "SC-01", line);
    }
    if (kind === "CreateRoleStmt" || kind === "AlterRoleStmt" || kind === "DropRoleStmt") {
      pushFinding(findings, "SC-01", line);
    }
    if (kind === "CreatePolicyStmt" || kind === "AlterPolicyStmt") pushFinding(findings, "SC-02", line);
    if (kind === "CreateTrigStmt" || kind === "CreateFunctionStmt" || kind === "AlterFunctionStmt" || kind === "RuleStmt") {
      pushFinding(findings, "SC-03", line);
    }
    if (kind === "DoStmt" || kind === "ExecuteStmt" || kind === "CopyStmt") pushFinding(findings, "SC-04", line);
    if (kind === "TransactionStmt") pushFinding(findings, "SC-05", line);
    if (kind === "VariableSetStmt" && typeof value.name === "string") {
      const name = value.name.toLowerCase();
      if (name === "session_replication_role") pushFinding(findings, "SC-02", line);
      if (SESSION_SET.has(name)) pushFinding(findings, "SC-05", line);
    }
    if (kind === "ClusterStmt" && existing) {
      pushFinding(findings, "LK-04", line);
      markHeavy(tables);
    }
    if (kind === "LockStmt" && existing) {
      pushFinding(findings, "LK-04", line);
      markHeavy(tables);
    }
    if (kind === "VacuumStmt" && vacuumIsFull(value) && existing) {
      pushFinding(findings, "LK-04", line);
      markHeavy(tables);
    }
    if (kind === "ReindexStmt" && !hasConcurrentParam(value) && existing) {
      pushFinding(findings, "LK-04", line);
      markHeavy(tables);
    }
    if (kind === "IndexStmt" && value.concurrent === true) {
      pushFinding(findings, "ban-concurrent-index-creation-in-transaction", line);
    }
    if (kind === "AlterEnumStmt") {
      const newVal = typeof value.newVal === "string" ? value.newVal : "";
      const oldVal = typeof value.oldVal === "string" ? value.oldVal : "";
      if (oldVal) pushFinding(findings, "EN-02", line);
      else if (newVal) addedEnumValues.push({ value: newVal, line });
    }
    if (kind === "RenameStmt" && value.renameType === "OBJECT_TYPE") pushFinding(findings, "EN-02", line);
    if (kind === "CreateEnumStmt") {
      const parts = stringItems(value.typeName);
      const typeName = parts[parts.length - 1]?.toLowerCase();
      if (typeName) created.set(`type:${typeName}`, { table: `type:${typeName}`, columns: [], line });
    }

    if (kind !== "AlterTableStmt") {
      const strings: string[] = [];
      collectConstStrings(value, strings);
      for (const item of strings) enumUses.set(item, line);
      continue;
    }

    for (const commandNode of listNodes(value.cmds)) {
      const command = unwrap(commandNode);
      if (command?.kind !== "AlterTableCmd") continue;
      const subtype = command.value.subtype;
      const column = typeof command.value.name === "string" ? command.value.name : "";

      if (subtype === "AT_DropColumn" && tables[0]) {
        droppedColumns.push({ table: tables[0], column: column.toLowerCase(), line });
      }
      if (subtype === "AT_AddColumn" && tables[0]) {
        const columnDef = columnDefOf(command.value.def);
        const columnName = typeof columnDef?.colname === "string" ? columnDef.colname.toLowerCase() : column.toLowerCase();
        addedColumns.push({ table: tables[0], column: columnName, line });
        if (existing && isStoredGenerated(columnDef)) {
          pushFinding(findings, "LK-02", line);
          markHeavy(tables);
        }
      }
      if (subtype === "AT_SetNotNull" && existing) {
        pushFinding(findings, "LK-01", line);
        markHeavy(tables);
      }
      if (subtype === "AT_AlterColumnType" && existing) {
        const columnDef = columnDefOf(command.value.def);
        const using = Boolean(columnDef?.raw_default);
        pushFinding(findings, "DL-05", line, using ? { problem: "ALTER COLUMN ... TYPE ... USING reescreve cada linha." } : undefined);
        markHeavy(tables);
      }
      if (subtype === "AT_DropConstraint") pushFinding(findings, "DL-04", line);
      if ((subtype === "AT_SetLogged" || subtype === "AT_SetUnLogged" || subtype === "AT_SetTableSpace") && existing) {
        pushFinding(findings, "LK-04", line);
        markHeavy(tables);
      }
      if (typeof subtype === "string" && TRIGGER_TOGGLE.has(subtype)) pushFinding(findings, "SC-02", line);
      if (typeof subtype === "string" && RLS.has(subtype)) pushFinding(findings, "SC-02", line);
      if (subtype === "AT_AddConstraint" && existing) {
        const constraint = constraintOf(command.value.def);
        const contype = constraint?.contype;
        if ((contype === "CONSTR_PRIMARY" || contype === "CONSTR_UNIQUE") && !constraint?.indexname) {
          pushFinding(findings, "LK-03", line);
          markHeavy(tables);
        }
      }
    }

    const strings: string[] = [];
    collectConstStrings(value, strings);
    for (const item of strings) enumUses.set(item, line);
  }

  const droppedTypes = statements.filter(
    (statement) => statement.kind === "DropStmt" && statement.value.removeType === "OBJECT_TYPE",
  );
  if (droppedTypes.length > 0 && statements.some((statement) => statement.kind === "CreateEnumStmt")) {
    pushFinding(findings, "EN-02", droppedTypes[0]?.line ?? 1, {
      problem: "O arquivo derruba um TYPE e cria outro enum. Isso recria o tipo e perde o vínculo das colunas.",
    });
  }

  const addByTable = new Map<string, AddedColumn[]>();
  for (const added of addedColumns) {
    const list = addByTable.get(added.table) ?? [];
    list.push(added);
    addByTable.set(added.table, list);
  }
  const reportedRename = new Set<string>();
  for (const dropped of droppedColumns) {
    if (createdNames.has(dropped.table)) continue;
    const adds = addByTable.get(dropped.table) ?? [];
    if (adds.length === 0 || reportedRename.has(dropped.table)) continue;
    reportedRename.add(dropped.table);
    pushFinding(findings, "DL-01", dropped.line, {
      problem: `DROP COLUMN e ADD COLUMN na mesma tabela (${dropped.table}). O Drizzle faz isso quando não reconhece um rename.`,
    });
  }

  const previousTables = snapshotTables(snapshotsForSql(file).previous);
  for (const dropped of droppedTables) {
    if (createdNames.has(dropped.table)) continue;
    const oldColumns = previousTables.get(dropped.table)?.columns;
    if (!oldColumns || oldColumns.size === 0) continue;
    for (const createdTable of created.values()) {
      if (createdTable.columns.length === 0) continue;
      const overlap = createdTable.columns.filter((column) => oldColumns.has(column)).length;
      const ratio = overlap / Math.min(oldColumns.size, createdTable.columns.length);
      if (ratio >= 0.5) {
        pushFinding(findings, "DL-01", dropped.line, {
          problem: `DROP TABLE ${dropped.table} e CREATE TABLE ${createdTable.table} compartilham ${overlap} coluna(s) (${Math.round(ratio * 100)}%).`,
        });
        break;
      }
    }
  }

  const usedValues = new Set<string>();
  for (const added of addedEnumValues) {
    const useLine = enumUses.get(added.value);
    if (useLine && useLine !== added.line) {
      usedValues.add(added.value);
      pushFinding(findings, "EN-01", added.line, {
        problem: `ALTER TYPE ... ADD VALUE '${added.value}' e o valor é usado no mesmo arquivo (linha ${useLine}).`,
      });
    }
  }
  const isolated = addedEnumValues.filter((added) => !usedValues.has(added.value));
  if (isolated.length > 0) {
    pushFinding(findings, "EN-01", isolated[0]?.line ?? 1, {
      problem: "ALTER TYPE ... ADD VALUE isolado.",
      why: "O valor novo só pode ser usado na próxima transação. Sozinho, o comando é seguro, mas precisa de um deploy seguinte para passar a gravá-lo.",
      alternative: "Não use o valor novo neste arquivo. Faça isso numa migration posterior.",
    });
    const isolatedFinding = findings[findings.length - 1];
    if (isolatedFinding) isolatedFinding.severity = "W";
  }

  if (heavyTables.size > 1) {
    pushFinding(findings, "LK-05", 1, {
      problem: `Operação pesada em ${heavyTables.size} tabelas existentes: ${[...heavyTables].join(", ")}.`,
    });
  }

  if (statements.length === 0 && failures.length === 0) {
    pushFinding(findings, "SC-06", 1, { problem: "Arquivo sem statements." });
  }

  const snapshots = snapshotsForSql(file);
  if (snapshots.previous && snapshots.current && snapshotsEqual(snapshots.previous, snapshots.current)) {
    pushFinding(findings, "SC-06", 1, {
      problem: "O snapshot desta migration é igual ao anterior, ignorando id e prevId.",
    });
  }

  for (const line of fileSql.split(/\r?\n/)) {
    if (/^\s*\\/.test(line) && !/^\s*--/.test(line)) {
      pushFinding(findings, "SC-04", lineAt(fileSql, fileSql.indexOf(line)));
      break;
    }
  }

  return {
    findings: findings.filter((finding) => !exempt(finding, statements, createdNames)),
    statements,
  };
}

function exempt(finding: SqlFinding, statements: ParsedStatement[], createdNames: Set<string>): boolean {
  const lockRules = new Set(["LK-01", "LK-02", "LK-03", "LK-04", "LK-05"]);
  if (!lockRules.has(finding.ruleId)) return false;
  if (finding.ruleId === "LK-05") return false;
  const statement = statementAt(statements, finding.line);
  if (!statement || statement.tables.length === 0) return false;
  return statement.tables.every((table) => createdNames.has(table));
}

export function statementAt(statements: ParsedStatement[], line: number): ParsedStatement | null {
  let chosen: ParsedStatement | null = null;
  for (const statement of statements) {
    if (statement.line <= line && line <= statement.endLine) return statement;
    if (statement.line <= line) chosen = statement;
  }
  return chosen;
}

export function createdTables(statements: ParsedStatement[]): Set<string> {
  const names = new Set<string>();
  for (const statement of statements) {
    if (statement.kind !== "CreateStmt") continue;
    for (const table of statement.tables) names.add(table);
  }
  return names;
}

export function ruleText(ruleId: string): RuleText {
  return (
    RULES[ruleId] ?? {
      severity: "W",
      problem: `Regra do squawk ainda sem classificação: ${ruleId}.`,
      why: "Ela não está no mapa de severidade. O achado fica como aviso até alguém classificá-la.",
      alternative: "Classifique em scripts/lint-migrations.config.json ou no catálogo do lint.",
    }
  );
}
