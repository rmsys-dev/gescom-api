import "dotenv/config";
import postgres from "postgres";

const url = process.env.DRIZZLE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL not set");
}

const sql = postgres(url);

try {
  const status = await sql<{ v: string }[]>`
    SELECT unnest(enum_range(NULL::status))::text as v
  `;
  const contactTypes = await sql<{ v: string }[]>`
    SELECT unnest(enum_range(NULL::type_user_contact))::text as v
  `;

  console.log("status values:", status.map((r) => r.v).join(", "));
  console.log("type_user_contact values:", contactTypes.map((r) => r.v).join(", "));
  console.log("FUNCIONARIO in status:", status.some((r) => r.v === "FUNCIONARIO"));
  console.log("AMIGO in type_user_contact:", contactTypes.some((r) => r.v === "AMIGO"));
} finally {
  await sql.end();
}
