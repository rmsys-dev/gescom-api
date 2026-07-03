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
    "Defina DRIZZLE_DATABASE_URL ou DATABASE_URL para aplicar a migracao.",
  );
}

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = "drizzle/0021_mixed_iron_monger.sql";
const journalCreatedAt = 1782933874743;

const profileSuffixes = [
  "address",
  "contact",
  "financial_info",
  "personal_info",
  "relationships",
  "tax_infos",
] as const;

type SchemaState = {
  membersTables: Set<string>;
  usersProfileTables: Set<string>;
  memberIdColumns: Set<string>;
  userIdColumns: Set<string>;
};

const stripSqlComments = (sqlBlock: string): string =>
  sqlBlock
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();

const parseStatements = (rawSql: string): string[] =>
  rawSql
    .split("--> statement-breakpoint")
    .map(stripSqlComments)
    .filter((statement) => statement.length > 0);

const fileHash = createHash("sha256")
  .update(readFileSync(join(root, migrationPath), "utf8"))
  .digest("hex");

const sql = postgres(connectionString, { prepare: false, max: 1 });

const loadSchemaState = async (): Promise<SchemaState> => {
  const tableNames = profileSuffixes.flatMap((suffix) => [
    `members_${suffix}`,
    `users_${suffix}`,
  ]);

  const tables = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ${sql(tableNames)}
  `;

  const columns = await sql<{ table_name: string; column_name: string }[]>`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ${sql(tableNames.filter((name) => name.startsWith("users_")))}
      and column_name in ('member_id', 'user_id')
  `;

  const membersTables = new Set<string>();
  const usersProfileTables = new Set<string>();
  for (const row of tables) {
    if (row.table_name.startsWith("members_")) {
      membersTables.add(row.table_name);
    }
    if (row.table_name.startsWith("users_")) {
      usersProfileTables.add(row.table_name);
    }
  }

  const memberIdColumns = new Set<string>();
  const userIdColumns = new Set<string>();
  for (const row of columns) {
    if (row.column_name === "member_id") {
      memberIdColumns.add(row.table_name);
    }
    if (row.column_name === "user_id") {
      userIdColumns.add(row.table_name);
    }
  }

  return { membersTables, usersProfileTables, memberIdColumns, userIdColumns };
};

const shouldSkipStatement = (
  statement: string,
  state: SchemaState,
): string | null => {
  const normalized = statement.trim().toLowerCase();

  const renameTableMatch = normalized.match(
    /^alter table "members_([^"]+)" rename to "users_\1"/,
  );
  if (renameTableMatch) {
    const suffix = renameTableMatch[1];
    const membersTable = `members_${suffix}`;
    const usersTable = `users_${suffix}`;
    if (
      !state.membersTables.has(membersTable) &&
      state.usersProfileTables.has(usersTable)
    ) {
      return `${usersTable} ja existe (rename ignorado)`;
    }
  }

  const renameColumnMatch = statement.match(
    /ALTER TABLE "([^"]+)" RENAME COLUMN "member_id" TO "user_id"/i,
  );
  if (renameColumnMatch) {
    const tableName = renameColumnMatch[1];
    if (
      !state.memberIdColumns.has(tableName) &&
      state.userIdColumns.has(tableName)
    ) {
      return `${tableName}.user_id ja existe (rename ignorado)`;
    }
  }

  return null;
};

const isBenignError = (error: unknown, statement: string): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  const stmt = statement.trim().toLowerCase();

  if (
    message.includes("already exists") ||
    message.includes("duplicate key") ||
    message.includes("duplicate_object")
  ) {
    return true;
  }

  if (!message.includes("does not exist")) return false;

  if (stmt.startsWith("drop ")) return true;
  if (stmt.includes("drop constraint")) return true;
  if (stmt.includes('rename to "users_') && stmt.includes('"members_')) {
    return true;
  }
  if (stmt.includes('rename column "member_id"')) return true;
  if (message.includes("relation") && stmt.includes('"members_')) return true;

  return false;
};

try {
  const alreadyApplied = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from drizzle.__drizzle_migrations
      where hash = ${fileHash}
    ) as exists
  `;

  if (alreadyApplied[0]?.exists) {
    console.log(`SKIP: ${migrationPath} (hash ja registrado)`);
    process.exit(0);
  }

  const schemaState = await loadSchemaState();
  const usingUsersProfileTables =
    schemaState.usersProfileTables.size > 0 &&
    schemaState.membersTables.size === 0;

  if (usingUsersProfileTables) {
    console.log(
      "Detectado schema users_* sem members_* (ex.: db:push). Aplicando de forma idempotente...",
    );
  }

  const rawSql = readFileSync(join(root, migrationPath), "utf8");
  const statements = parseStatements(rawSql);

  console.log(`Aplicando ${migrationPath}...`);
  for (const statement of statements) {
    const skipReason = shouldSkipStatement(statement, schemaState);
    if (skipReason) {
      console.log(`  SKIP (${skipReason}): ${statement.slice(0, 80)}...`);
      continue;
    }

    try {
      await sql.unsafe(statement);
      console.log(`  OK: ${statement.slice(0, 80)}...`);
    } catch (error) {
      if (isBenignError(error, statement)) {
        console.log(`  SKIP (ja aplicado): ${statement.slice(0, 80)}...`);
        continue;
      }
      throw error;
    }
  }

  await sql`
    insert into drizzle.__drizzle_migrations (hash, created_at)
    values (${fileHash}, ${journalCreatedAt})
  `;
  console.log(`Registrado hash de ${migrationPath}`);
  console.log("\nMigracao 0021 aplicada com sucesso.");
} finally {
  await sql.end({ timeout: 5 });
}
