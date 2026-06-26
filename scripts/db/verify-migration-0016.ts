import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DRIZZLE_DATABASE_URL ou DATABASE_URL ausente.");
}

const migrationFile = "drizzle/0016_unique_indexes_audit_fix.sql";
const hash = createHash("sha256")
  .update(readFileSync(migrationFile, "utf8"))
  .digest("hex");

const expectedIndexes = [
  {
    name: "products_bar_code_active_unique",
    mustContain: "status = 'ATIVO'",
  },
  {
    name: "type_networks_description_active_unique",
    mustContain: "status = 'ATIVO'",
  },
  {
    name: "type_supplier_customers_description_active_unique",
    mustContain: "status = 'ATIVO'",
  },
  {
    name: "members_personal_info_member_active_unique",
    mustContain: "deleted_at IS NULL",
  },
  {
    name: "members_relationships_member_active_unique",
    mustContain: "deleted_at IS NULL",
  },
  {
    name: "members_tax_infos_member_active_unique",
    mustContain: "deleted_at IS NULL",
  },
  {
    name: "members_financial_info_member_active_unique",
    mustContain: "deleted_at IS NULL",
  },
  {
    name: "enterprises_sequences_enterprise_type_uidx",
    mustContain: "deleted_at IS NULL",
  },
  {
    name: "products_enterprises_enterprise_code_unique",
    mustContain: "code IS NOT NULL",
  },
  { name: "payment_types_description_active_unique" },
  { name: "measurement_units_unit_unique" },
  { name: "products_types_type_unique" },
  { name: "products_ncm_ncm_unique" },
  { name: "products_cest_cest_ncm_unique" },
  { name: "type_sped_type_unique" },
] as const;

const mustNotExist = [
  "promotional_prices_products_enterprises_id_unique",
  "stock_movements_type_status_unique",
  "measurement_units_unit_active_unique",
  "products_types_type_active_unique",
  "products_ncm_ncm_active_unique",
  "products_cest_cest_active_unique",
  "type_sped_type_active_unique",
  "members_personal_info_member_id_unique",
  "members_relationships_member_id_unique",
  "members_tax_infos_member_id_unique",
  "members_financial_info_member_id_unique",
] as const;

const sql = postgres(connectionString, { prepare: false, max: 1 });

let problems = 0;

try {
  const registered = await sql<{ exists: boolean }[]>`
    select exists (
      select 1 from drizzle.__drizzle_migrations where hash = ${hash}
    ) as exists
  `;

  console.log("=== Migration 0016 ===");
  console.log("Arquivo:", migrationFile);
  console.log("Hash:", hash);
  console.log(
    "Registrada em drizzle.__drizzle_migrations:",
    registered[0]?.exists ? "SIM" : "NAO",
  );

  if (!registered[0]?.exists) {
    problems += 1;
  }

  console.log("\n=== Indices esperados ===");
  for (const idx of expectedIndexes) {
    const rows = await sql<{ indexdef: string }[]>`
      select indexdef
      from pg_indexes
      where schemaname = 'public'
        and indexname = ${idx.name}
    `;
    if (!rows[0]) {
      console.log("FALTA:", idx.name);
      problems += 1;
      continue;
    }
    if ("mustContain" in idx && !rows[0].indexdef.includes(idx.mustContain)) {
      console.log("WHERE INCORRETO:", idx.name);
      console.log(" ", rows[0].indexdef);
      problems += 1;
      continue;
    }
    console.log("OK:", idx.name);
  }

  console.log("\n=== Nomes antigos (nao devem existir) ===");
  for (const name of mustNotExist) {
    const idx = await sql<{ indexname: string }[]>`
      select indexname from pg_indexes
      where schemaname = 'public' and indexname = ${name}
    `;
    const con = await sql<{ conname: string }[]>`
      select conname from pg_constraint where conname = ${name}
    `;
    if (idx.length > 0 || con.length > 0) {
      console.log("AINDA EXISTE:", name);
      problems += 1;
    } else {
      console.log("OK removido:", name);
    }
  }

  console.log("\n=== Duplicatas de dados ===");
  const dupCode = await sql<
    { enterprises_id: string; code: number; cnt: number }[]
  >`
    select enterprises_id, code, count(*)::int as cnt
    from products_enterprises
    where code is not null
    group by enterprises_id, code
    having count(*) > 1
    limit 5
  `;
  const dupBar = await sql<{ bar_code: string; cnt: number }[]>`
    select bar_code, count(*)::int as cnt
    from products
    where status = 'ATIVO' and bar_code is not null
    group by bar_code
    having count(*) > 1
    limit 5
  `;

  if (dupCode.length > 0) {
    console.log("ATENCAO products_enterprises code duplicado:", dupCode);
    problems += 1;
  } else {
    console.log("OK: sem code duplicado por empresa");
  }

  if (dupBar.length > 0) {
    console.log("ATENCAO bar_code ATIVO duplicado:", dupBar);
    problems += 1;
  } else {
    console.log("OK: sem bar_code duplicado em produtos ATIVO");
  }

  console.log(`\n=== Resultado: ${problems === 0 ? "0016 OK no banco" : `${problems} problema(s)`} ===`);
  if (problems > 0) process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
