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
    "Defina DRIZZLE_DATABASE_URL ou DATABASE_URL para registrar migracao.",
  );
}

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPath = "drizzle/0010_enterprises_sequences_by_type.sql";
const journalCreatedAt = 1781800000000;

const fileHash = createHash("sha256")
  .update(readFileSync(join(root, migrationPath), "utf8"))
  .digest("hex");

const sql = postgres(connectionString, { prepare: false, max: 1 });

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

  await sql`
    insert into drizzle.__drizzle_migrations (hash, created_at)
    values (${fileHash}, ${journalCreatedAt})
  `;

  console.log(`Registrado hash de ${migrationPath}`);
  console.log(`Hash: ${fileHash}`);
} finally {
  await sql.end({ timeout: 5 });
}
