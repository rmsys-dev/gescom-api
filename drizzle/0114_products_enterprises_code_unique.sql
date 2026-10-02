WITH ranked AS (
  SELECT "id", "enterprises_id", "created_at",
    row_number() OVER (PARTITION BY "enterprises_id", "code" ORDER BY "created_at", "id") AS "rn"
  FROM "products_enterprises"
  WHERE "code" IS NOT NULL
), dups AS (
  SELECT "id", "enterprises_id",
    row_number() OVER (PARTITION BY "enterprises_id" ORDER BY "created_at", "id") AS "n"
  FROM ranked
  WHERE "rn" > 1
), maxes AS (
  SELECT "enterprises_id", max("code") AS "mx"
  FROM "products_enterprises"
  GROUP BY "enterprises_id"
)
UPDATE "products_enterprises" pe
SET "code" = maxes."mx" + dups."n", "updated_at" = now()
FROM dups
JOIN maxes ON maxes."enterprises_id" = dups."enterprises_id"
WHERE pe."id" = dups."id";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "products_enterprises_enterprise_code_unique" ON "products_enterprises" ("enterprises_id", "code") WHERE "code" IS NOT NULL;
