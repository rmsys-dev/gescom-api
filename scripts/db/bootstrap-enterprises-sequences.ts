import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Defina DRIZZLE_DATABASE_URL ou DATABASE_URL para bootstrap de sequencias.",
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

const columnExists = async (
  tableName: string,
  columnName: string,
): Promise<boolean> => {
  const rows = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = ${tableName}
        and column_name = ${columnName}
    ) as exists
  `;
  return rows[0]?.exists ?? false;
};

try {
  if (!(await tableExists("enterprises_sequences"))) {
    throw new Error(
      "Tabela enterprises_sequences nao existe. Execute npm run db:push antes do bootstrap.",
    );
  }

  if (!(await columnExists("enterprises_sequences", "type"))) {
    throw new Error(
      "Coluna type ausente em enterprises_sequences. Execute npm run db:push antes do bootstrap.",
    );
  }

  const result = await sql<{ enterprise_id: string; sequence: number }[]>`
    insert into enterprises_sequences (enterprise_id, type, sequence)
    select enterprises_id, 'VENDA'::sequence_type, coalesce(max(order_number), 0)
    from sales
    group by enterprises_id
    on conflict (enterprise_id, type) do update
      set sequence = greatest(enterprises_sequences.sequence, excluded.sequence)
    returning enterprise_id, sequence
  `;

  console.log(`Bootstrap VENDA: ${result.length} empresa(s) atualizada(s).`);

  const mismatches = await sql<
    { enterprise_id: string; sequence: number; max_order: number | null }[]
  >`
    select
      es.enterprise_id,
      es.sequence,
      s.max_order
    from enterprises_sequences es
    left join (
      select enterprises_id, max(order_number) as max_order
      from sales
      group by enterprises_id
    ) s on s.enterprises_id = es.enterprise_id
    where es.type = 'VENDA'
      and coalesce(es.sequence, 0) < coalesce(s.max_order, 0)
  `;

  if (mismatches.length > 0) {
    console.warn("AVISO: contadores VENDA abaixo do max(order_number) em vendas:");
    for (const row of mismatches) {
      console.warn(
        `  enterprise_id=${row.enterprise_id} sequence=${row.sequence} max_order=${row.max_order}`,
      );
    }
    process.exit(1);
  }

  console.log("OK: contadores VENDA alinhados com vendas existentes.");
} finally {
  await sql.end({ timeout: 5 });
}
