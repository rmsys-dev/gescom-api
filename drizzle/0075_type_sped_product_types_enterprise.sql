-- Tipo SPED e tipo de produto passam a ser por empresa.
-- Clona o catalogo global para cada tenant e remapeia FKs.

ALTER TABLE "type_sped" ADD COLUMN IF NOT EXISTS "enterprises_id" uuid;--> statement-breakpoint
ALTER TABLE "products_types" ADD COLUMN IF NOT EXISTS "enterprises_id" uuid;--> statement-breakpoint
DROP INDEX IF EXISTS "type_sped_type_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "products_types_type_unique";--> statement-breakpoint
CREATE TEMP TABLE "_type_sped_clone_map" (
  "old_id" uuid NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "new_id" uuid NOT NULL,
  PRIMARY KEY ("old_id", "enterprise_id")
);--> statement-breakpoint
INSERT INTO "_type_sped_clone_map" ("old_id", "enterprise_id", "new_id")
SELECT "ts"."id", "e"."id", gen_random_uuid()
FROM "type_sped" "ts"
CROSS JOIN "enterprises" "e"
WHERE "ts"."enterprises_id" IS NULL;--> statement-breakpoint
INSERT INTO "type_sped" (
  "id",
  "type",
  "description",
  "generate_inventory",
  "enterprises_id",
  "created_at",
  "updated_at"
)
SELECT
  "m"."new_id",
  "ts"."type",
  "ts"."description",
  "ts"."generate_inventory",
  "m"."enterprise_id",
  "ts"."created_at",
  "ts"."updated_at"
FROM "_type_sped_clone_map" "m"
INNER JOIN "type_sped" "ts" ON "ts"."id" = "m"."old_id";--> statement-breakpoint
CREATE TEMP TABLE "_product_types_clone_map" (
  "old_id" uuid NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "new_id" uuid NOT NULL,
  PRIMARY KEY ("old_id", "enterprise_id")
);--> statement-breakpoint
INSERT INTO "_product_types_clone_map" ("old_id", "enterprise_id", "new_id")
SELECT "pt"."id", "e"."id", gen_random_uuid()
FROM "products_types" "pt"
CROSS JOIN "enterprises" "e"
WHERE "pt"."enterprises_id" IS NULL;--> statement-breakpoint
INSERT INTO "products_types" (
  "id",
  "type",
  "description",
  "manufacturing",
  "sales",
  "type_sped_id",
  "enterprises_id",
  "created_at",
  "updated_at"
)
SELECT
  "m"."new_id",
  "pt"."type",
  "pt"."description",
  "pt"."manufacturing",
  "pt"."sales",
  COALESCE("sm"."new_id", "pt"."type_sped_id"),
  "m"."enterprise_id",
  "pt"."created_at",
  "pt"."updated_at"
FROM "_product_types_clone_map" "m"
INNER JOIN "products_types" "pt" ON "pt"."id" = "m"."old_id"
LEFT JOIN "_type_sped_clone_map" "sm"
  ON "sm"."old_id" = "pt"."type_sped_id"
 AND "sm"."enterprise_id" = "m"."enterprise_id";--> statement-breakpoint
UPDATE "products_enterprises" "pe"
SET "product_type_id" = "m"."new_id"
FROM "_product_types_clone_map" "m"
WHERE "pe"."product_type_id" = "m"."old_id"
  AND "pe"."enterprises_id" = "m"."enterprise_id";--> statement-breakpoint
UPDATE "sales_items" "si"
SET "product_type_id" = "m"."new_id"
FROM "sales" "s",
     "_product_types_clone_map" "m"
WHERE "si"."sales_id" = "s"."id"
  AND "m"."old_id" = "si"."product_type_id"
  AND "m"."enterprise_id" = "s"."enterprises_id";--> statement-breakpoint
DELETE FROM "products_types" WHERE "enterprises_id" IS NULL;--> statement-breakpoint
DELETE FROM "type_sped" WHERE "enterprises_id" IS NULL;--> statement-breakpoint
ALTER TABLE "type_sped" ALTER COLUMN "enterprises_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products_types" ALTER COLUMN "enterprises_id" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "type_sped"
    ADD CONSTRAINT "type_sped_enterprises_id_enterprises_id_fk"
    FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "products_types"
    ADD CONSTRAINT "products_types_enterprises_id_enterprises_id_fk"
    FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "type_sped_enterprise_type_unique"
  ON "type_sped" USING btree ("enterprises_id", "type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "type_sped_enterprise_idx"
  ON "type_sped" USING btree ("enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "products_types_enterprise_type_unique"
  ON "products_types" USING btree ("enterprises_id", "type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_types_enterprise_idx"
  ON "products_types" USING btree ("enterprises_id");
