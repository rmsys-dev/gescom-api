WITH ranked AS (
  SELECT "id", "enterprise_id", "created_at",
    row_number() OVER (PARTITION BY "enterprise_id", "code" ORDER BY "created_at", "id") AS "rn"
  FROM "enterprises_members"
  WHERE "code" IS NOT NULL AND "deleted_at" IS NULL
), dups AS (
  SELECT "id", "enterprise_id",
    row_number() OVER (PARTITION BY "enterprise_id" ORDER BY "created_at", "id") AS "n"
  FROM ranked
  WHERE "rn" > 1
), maxes AS (
  SELECT "enterprise_id", max("code") AS "mx"
  FROM "enterprises_members"
  GROUP BY "enterprise_id"
)
UPDATE "enterprises_members" em
SET "code" = maxes."mx" + dups."n", "updated_at" = now()
FROM dups
JOIN maxes ON maxes."enterprise_id" = dups."enterprise_id"
WHERE em."id" = dups."id";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "enterprises_members_enterprise_code_active_unique" ON "enterprises_members" ("enterprise_id", "code") WHERE "code" IS NOT NULL AND "deleted_at" IS NULL;
