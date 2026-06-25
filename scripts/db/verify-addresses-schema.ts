import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DRIZZLE_DATABASE_URL ou DATABASE_URL ausente.");
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

const expect = (
  label: string,
  actual: string,
  expected: string,
): void => {
  if (actual !== expected) {
    throw new Error(`${label}: esperado ${expected}, obtido ${actual}`);
  }
  console.log(`OK: ${label} = ${actual}`);
};

try {
  const cols = await sql<
    {
      table_name: string;
      column_name: string;
      data_type: string;
      character_maximum_length: number | null;
      numeric_precision: number | null;
      numeric_scale: number | null;
    }[]
  >`
    select table_name, column_name, data_type, character_maximum_length,
           numeric_precision, numeric_scale
    from information_schema.columns
    where table_schema = 'public'
      and (
        (table_name = 'countries' and column_name in ('country_code', 'cbs_tax'))
        or (table_name = 'states' and column_name in ('ibs_municipal_tax', 'embed_difal'))
        or (table_name = 'cities' and column_name = 'ibs_municipal_tax')
      )
    order by table_name, column_name
  `;

  const col = (table: string, column: string) => {
    const row = cols.find((r) => r.table_name === table && r.column_name === column);
    if (!row) {
      throw new Error(`Coluna ausente: ${table}.${column}`);
    }
    return row;
  };

  const countryCode = col("countries", "country_code");
  expect(
    "countries.country_code",
    `${countryCode.data_type}(${countryCode.character_maximum_length})`,
    "character varying(4)",
  );

  const cbsTax = col("countries", "cbs_tax");
  expect(
    "countries.cbs_tax",
    `numeric(${cbsTax.numeric_precision},${cbsTax.numeric_scale})`,
    "numeric(15,10)",
  );

  for (const table of ["states", "cities"] as const) {
    const tax = col(table, "ibs_municipal_tax");
    expect(
      `${table}.ibs_municipal_tax`,
      `numeric(${tax.numeric_precision},${tax.numeric_scale})`,
      "numeric(15,10)",
    );
  }

  const embedDifal = col("states", "embed_difal");
  expect("states.embed_difal", embedDifal.data_type, "boolean");

  const embedTaxGone = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'states'
        and column_name = 'embed_tax'
    ) as exists
  `;

  if (embedTaxGone[0]?.exists) {
    throw new Error("Coluna legada states.embed_tax ainda existe.");
  }
  console.log("OK: states.embed_tax removida (renomeada para embed_difal)");

  const statesCheck = await sql<{ def: string }[]>`
    select pg_get_constraintdef(oid) as def
    from pg_constraint
    where conrelid = 'public.states'::regclass
      and conname = 'states_ibs_municipal_tax_range'
  `;

  if (!statesCheck[0]?.def.includes("<= 100.00")) {
    throw new Error(
      `CHECK states_ibs_municipal_tax_range invalido: ${statesCheck[0]?.def ?? "ausente"}`,
    );
  }
  console.log(`OK: states_ibs_municipal_tax_range = ${statesCheck[0].def}`);

  const bordersCheck = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from pg_constraint
      where conrelid = 'public.states'::regclass
        and conname = 'states_borders_non_negative'
    ) as exists
  `;

  if (bordersCheck[0]?.exists) {
    throw new Error("Constraint states_borders_non_negative ainda existe.");
  }
  console.log("OK: states_borders_non_negative removida");

  console.log("\nSchema de addresses validado com sucesso.");
} finally {
  await sql.end({ timeout: 5 });
}
