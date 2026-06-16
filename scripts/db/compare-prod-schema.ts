import "dotenv/config";
import { execSync } from "node:child_process";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DRIZZLE_DATABASE_URL ou DATABASE_URL ausente.");
}

const expectedSql = execSync("npx drizzle-kit export --sql", {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const tableRegex = /CREATE TABLE "([^"]+)"/g;
const expectedTables = new Set<string>();
for (const match of expectedSql.matchAll(tableRegex)) {
  expectedTables.add(match[1]);
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

try {
  const prodTables = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `;

  const prodSet = new Set(prodTables.map((row) => row.table_name));

  const missingInProd = [...expectedTables]
    .filter((table) => !prodSet.has(table))
    .sort();
  const extraInProd = [...prodSet]
    .filter((table) => !expectedTables.has(table))
    .sort();

  console.log("=== Tabelas esperadas pela API mas ausentes em producao ===");
  if (missingInProd.length === 0) {
    console.log("(nenhuma)");
  } else {
    for (const table of missingInProd) console.log(`  - ${table}`);
  }

  console.log("\n=== Tabelas em producao que nao existem no schema da API ===");
  if (extraInProd.length === 0) {
    console.log("(nenhuma)");
  } else {
    for (const table of extraInProd) console.log(`  - ${table}`);
  }

  const columnRegex = /CREATE TABLE "([^"]+)" \(([\s\S]*?)\n\);/g;
  const mismatches: string[] = [];

  for (const match of expectedSql.matchAll(columnRegex)) {
    const table = match[1];
    if (!prodSet.has(table)) continue;

    const expectedCols = new Set<string>();
    for (const line of match[2].split("\n")) {
      const colMatch = line.match(/^\s*"([^"]+)"/);
      if (colMatch) expectedCols.add(colMatch[1]);
    }

    const prodCols = await sql<{ column_name: string }[]>`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = ${table}
    `;
    const prodColSet = new Set(prodCols.map((row) => row.column_name));

    const missingCols = [...expectedCols].filter((col) => !prodColSet.has(col));
    const extraCols = [...prodColSet].filter((col) => !expectedCols.has(col));

    if (missingCols.length > 0 || extraCols.length > 0) {
      mismatches.push(table);
      console.log(`\n=== Diferencas em ${table} ===`);
      if (missingCols.length > 0) {
        console.log("  Colunas faltando em producao:");
        for (const col of missingCols.sort()) console.log(`    - ${col}`);
      }
      if (extraCols.length > 0) {
        console.log("  Colunas extras em producao:");
        for (const col of extraCols.sort()) console.log(`    - ${col}`);
      }
    }
  }

  if (mismatches.length === 0 && missingInProd.length === 0) {
    console.log("\nOK: tabelas e colunas principais estao alinhadas.");
  } else {
    console.log(`\nResumo: ${missingInProd.length} tabela(s) ausente(s), ${mismatches.length} tabela(s) com colunas divergentes.`);
    process.exit(1);
  }
} finally {
  await sql.end({ timeout: 5 });
}
