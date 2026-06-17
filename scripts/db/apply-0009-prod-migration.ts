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
const migrationPath = "drizzle/0009_short_captain_britain.sql";
const journalCreatedAt = 1781733827116;

const fileHash = createHash("sha256")
  .update(readFileSync(join(root, migrationPath), "utf8"))
  .digest("hex");

const sql = postgres(connectionString, { prepare: false, max: 1 });

const logOk = (message: string) => console.log(`  OK: ${message}`);

const logSkip = (message: string) => console.log(`  SKIP: ${message}`);

const addEnumValue = async (enumName: string, value: string) => {
  const exists = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from pg_enum e
      inner join pg_type t on t.oid = e.enumtypid
      inner join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typname = ${enumName}
        and e.enumlabel = ${value}
    ) as exists
  `;

  if (exists[0]?.exists) {
    logSkip(`enum ${enumName}.${value} ja existe`);
    return;
  }

  await sql.unsafe(
    `ALTER TYPE "public"."${enumName}" ADD VALUE IF NOT EXISTS '${value}'`,
  );
  logOk(`enum ${enumName}.${value}`);
};

const columnIsNullable = async (
  tableName: string,
  columnName: string,
): Promise<boolean | null> => {
  const rows = await sql<{ is_nullable: string }[]>`
    select is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = ${tableName}
      and column_name = ${columnName}
  `;
  if (rows.length === 0) return null;
  return rows[0]?.is_nullable === "YES";
};

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

  console.log(`Aplicando ${migrationPath} (trecho seguro para producao)...`);

  const entityTypeValues = [
    "MEMBERS_PERSONAL_INFO",
    "MEMBERS_ADDRESS",
    "MEMBERS_CONTACT",
    "MEMBERS_RELATIONSHIPS",
    "MEMBERS_TAX_INFOS",
    "MEMBERS_FINANCIAL_INFO",
    "TYPE_SPED",
  ] as const;

  for (const value of entityTypeValues) {
    await addEnumValue("entity_type", value);
  }

  await addEnumValue("member_class", "TRANSPORTADOR");

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS "type_sped" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "type" varchar(255) NOT NULL,
      "description" varchar(255) NOT NULL,
      "generate_inventory" boolean DEFAULT true NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone
    )
  `);
  logOk("tabela type_sped");

  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "type_sped_type_active_unique"
    ON "type_sped" USING btree ("type")
  `);
  logOk("indice type_sped_type_active_unique");

  const hasLegacyUnits = await tableExists("measurementUnits");
  const hasMeasurementUnits = await tableExists("measurement_units");

  if (hasLegacyUnits && !hasMeasurementUnits) {
    await sql.unsafe(
      `ALTER TABLE "measurementUnits" RENAME TO "measurement_units"`,
    );
    logOk('rename "measurementUnits" -> "measurement_units"');
  } else if (hasMeasurementUnits) {
    logSkip("measurement_units ja existe");
  } else {
    logSkip("measurementUnits/measurement_units nao encontrada");
  }

  await sql.unsafe(`
    ALTER TABLE "products_enterprises"
    DROP CONSTRAINT IF EXISTS "products_enterprises_measurement_unit_id_measurementUnits_id_fk"
  `);
  await sql.unsafe(`
    ALTER TABLE "sales_items"
    DROP CONSTRAINT IF EXISTS "sales_items_unit_id_measurementUnits_id_fk"
  `);

  await sql.unsafe(`
    DO $$ BEGIN
      ALTER TABLE "products_enterprises"
        ADD CONSTRAINT "products_enterprises_measurement_unit_id_measurement_units_id_fk"
        FOREIGN KEY ("measurement_unit_id")
        REFERENCES "public"."measurement_units"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$
  `);
  logOk("FK products_enterprises.measurement_unit_id");

  await sql.unsafe(`
    DO $$ BEGIN
      ALTER TABLE "sales_items"
        ADD CONSTRAINT "sales_items_unit_id_measurement_units_id_fk"
        FOREIGN KEY ("unit_id")
        REFERENCES "public"."measurement_units"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$
  `);
  logOk("FK sales_items.unit_id");

  const barCodeNullable = await columnIsNullable("products", "bar_code");
  if (barCodeNullable === null) {
    logSkip("coluna products.bar_code ausente");
  } else if (barCodeNullable) {
    logSkip("products.bar_code ja e nullable");
  } else {
    await sql.unsafe(`ALTER TABLE "products" ALTER COLUMN "bar_code" DROP NOT NULL`);
    logOk("products.bar_code nullable");
  }

  if (!(await columnExists("products_types", "manufacturing"))) {
    await sql.unsafe(`
      ALTER TABLE "products_types"
      ADD COLUMN "manufacturing" boolean DEFAULT false NOT NULL
    `);
    logOk("products_types.manufacturing");
  } else {
    logSkip("products_types.manufacturing ja existe");
  }

  if (!(await columnExists("products_types", "sales"))) {
    await sql.unsafe(`
      ALTER TABLE "products_types"
      ADD COLUMN "sales" boolean DEFAULT false NOT NULL
    `);
    logOk("products_types.sales");
  } else {
    logSkip("products_types.sales ja existe");
  }

  const defaultTypeSped = await sql<{ id: string }[]>`
    insert into "type_sped" ("type", "description", "generate_inventory")
    select '00', 'PADRAO', true
    where not exists (select 1 from "type_sped" limit 1)
    returning id
  `;

  const fallbackTypeSped = await sql<{ id: string }[]>`
    select id from "type_sped" order by "created_at" asc limit 1
  `;

  const typeSpedId = defaultTypeSped[0]?.id ?? fallbackTypeSped[0]?.id;
  if (!typeSpedId) {
    throw new Error("Nao foi possivel obter ou criar registro padrao em type_sped.");
  }

  if (defaultTypeSped.length > 0) {
    logOk("registro padrao type_sped (00 / PADRAO)");
  } else {
    logSkip("type_sped ja possui registros");
  }

  if (!(await columnExists("products_types", "type_sped_id"))) {
    await sql.unsafe(`
      ALTER TABLE "products_types"
      ADD COLUMN "type_sped_id" uuid
    `);
    logOk("products_types.type_sped_id (nullable)");
  } else {
    logSkip("products_types.type_sped_id ja existe");
  }

  await sql`
    update "products_types"
    set "type_sped_id" = ${typeSpedId}
    where "type_sped_id" is null
  `;
  logOk("backfill products_types.type_sped_id");

  await sql.unsafe(`
    ALTER TABLE "products_types"
    ALTER COLUMN "type_sped_id" SET NOT NULL
  `);
  logOk("products_types.type_sped_id NOT NULL");

  await sql.unsafe(`
    DO $$ BEGIN
      ALTER TABLE "products_types"
        ADD CONSTRAINT "products_types_type_sped_id_type_sped_id_fk"
        FOREIGN KEY ("type_sped_id")
        REFERENCES "public"."type_sped"("id")
        ON DELETE restrict ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$
  `);
  logOk("FK products_types.type_sped_id");

  await sql`
    insert into drizzle.__drizzle_migrations (hash, created_at)
    values (${fileHash}, ${journalCreatedAt})
  `;
  console.log(`Registrado hash de ${migrationPath}`);
  console.log("\nMigracao 0009 aplicada com sucesso em producao.");
} finally {
  await sql.end({ timeout: 5 });
}
