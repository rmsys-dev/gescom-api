import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const connectionString =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DRIZZLE_DATABASE_URL ou DATABASE_URL ausente.");
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

try {
  const applied = await sql<{ hash: string }[]>`
    select hash from drizzle.__drizzle_migrations order by created_at
  `;
  const appliedHashes = new Set(applied.map((row) => row.hash));

  const files = readdirSync("drizzle")
    .filter((name) => name.endsWith(".sql"))
    .sort();

  let pending = 0;
  for (const file of files) {
    const content = readFileSync(join("drizzle", file), "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    if (!appliedHashes.has(hash)) {
      console.log(`PENDENTE: ${file}`);
      pending += 1;
    }
  }

  if (pending === 0) {
    console.log("OK: todas as migracoes versionadas ja estao aplicadas no banco.");
  }
} finally {
  await sql.end({ timeout: 5 });
}
