import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Defina DRIZZLE_DATABASE_URL ou DATABASE_URL para preparar o push.",
  );
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

const tableExists = async (tableName: string): Promise<boolean> => {
  const rows = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = ${tableName}
    ) as exists
  `;
  return rows[0]?.exists ?? false;
};

const columnDataType = async (
  tableName: string,
  columnName: string,
): Promise<string | null> => {
  const rows = await sql<{ data_type: string }[]>`
    select data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = ${tableName}
      and column_name = ${columnName}
  `;
  return rows[0]?.data_type ?? null;
};

try {
  if (!(await tableExists("enterprises_sequences"))) {
    console.log(
      "SKIP: enterprises_sequences nao existe; db:push criara a tabela.",
    );
    process.exit(0);
  }

  const sequenceType = await columnDataType("enterprises_sequences", "sequence");
  const typeColumn = await columnDataType("enterprises_sequences", "type");

  if (typeColumn === "USER-DEFINED" || typeColumn === "sequence_type") {
    console.log(
      "SKIP: schema enterprises_sequences ja parece atualizado (coluna type presente).",
    );
    process.exit(0);
  }

  if (sequenceType === "character varying") {
    console.log(
      "Limpando enterprises_sequences legada (sequence varchar) antes do push...",
    );
    await sql.unsafe(`DROP TABLE IF EXISTS "enterprises_sequences" CASCADE`);
    console.log("OK: tabela legada removida; db:push recriara com schema novo.");
    process.exit(0);
  }

  console.log(
    `AVISO: enterprises_sequences existe com sequence=${sequenceType ?? "?"}. ` +
      "Revise manualmente antes do push.",
  );
} finally {
  await sql.end({ timeout: 5 });
}
