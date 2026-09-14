-- Tipo SPED e tipo de produto voltam a ser catalogo global.
-- Consolida clones por empresa (0075) em uma linha por `type` e remove enterprises_id.

CREATE TEMP TABLE "_type_sped_keep" AS
SELECT DISTINCT ON ("type") "id" AS "keep_id", "type"
FROM "type_sped"
ORDER BY "type", "created_at", "id";--> statement-breakpoint
UPDATE "products_types" "pt"
SET "type_sped_id" = "k"."keep_id"
FROM "type_sped" "ts"
INNER JOIN "_type_sped_keep" "k" ON "k"."type" = "ts"."type"
WHERE "pt"."type_sped_id" = "ts"."id"
  AND "pt"."type_sped_id" <> "k"."keep_id";--> statement-breakpoint
CREATE TEMP TABLE "_product_types_keep" AS
SELECT DISTINCT ON ("type") "id" AS "keep_id", "type"
FROM "products_types"
ORDER BY "type", "created_at", "id";--> statement-breakpoint
UPDATE "products_enterprises" "pe"
SET "product_type_id" = "k"."keep_id"
FROM "products_types" "pt"
INNER JOIN "_product_types_keep" "k" ON "k"."type" = "pt"."type"
WHERE "pe"."product_type_id" = "pt"."id"
  AND "pe"."product_type_id" <> "k"."keep_id";--> statement-breakpoint
UPDATE "sales_items" "si"
SET "product_type_id" = "k"."keep_id"
FROM "products_types" "pt"
INNER JOIN "_product_types_keep" "k" ON "k"."type" = "pt"."type"
WHERE "si"."product_type_id" = "pt"."id"
  AND "si"."product_type_id" <> "k"."keep_id";--> statement-breakpoint
DELETE FROM "products_types" "pt"
WHERE NOT EXISTS (
  SELECT 1 FROM "_product_types_keep" "k" WHERE "k"."keep_id" = "pt"."id"
);--> statement-breakpoint
DELETE FROM "type_sped" "ts"
WHERE NOT EXISTS (
  SELECT 1 FROM "_type_sped_keep" "k" WHERE "k"."keep_id" = "ts"."id"
);--> statement-breakpoint
DROP INDEX IF EXISTS "type_sped_enterprise_type_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "type_sped_enterprise_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "products_types_enterprise_type_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "products_types_enterprise_idx";--> statement-breakpoint
ALTER TABLE "type_sped" DROP CONSTRAINT IF EXISTS "type_sped_enterprises_id_enterprises_id_fk";--> statement-breakpoint
ALTER TABLE "products_types" DROP CONSTRAINT IF EXISTS "products_types_enterprises_id_enterprises_id_fk";--> statement-breakpoint
ALTER TABLE "type_sped" DROP COLUMN IF EXISTS "enterprises_id";--> statement-breakpoint
ALTER TABLE "products_types" DROP COLUMN IF EXISTS "enterprises_id";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "type_sped_type_unique"
  ON "type_sped" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "products_types_type_unique"
  ON "products_types" USING btree ("type");
