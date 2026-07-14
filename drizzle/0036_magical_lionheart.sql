-- Snapshot das devoluções (header+itens -> uma linha por item) antes do reshape.
CREATE TEMP TABLE "_mig_sales_returns" AS
SELECT
	gen_random_uuid() AS "id",
	ROW_NUMBER() OVER (
		PARTITION BY "sr"."sale_id"
		ORDER BY "sr"."return_number", "sri"."created_at", "sri"."id"
	)::integer AS "return_order",
	"sr"."sale_id" AS "sales_id",
	"sri"."sale_item_id" AS "sale_item_id",
	"sri"."quantity" AS "quantity",
	"sr"."user_id" AS "user_id",
	COALESCE("sri"."created_at", "sr"."created_at", now()) AS "created_at",
	"sri"."updated_at" AS "updated_at"
FROM "sales_return_items" "sri"
INNER JOIN "sales_returns" "sr" ON "sr"."id" = "sri"."sales_return_id";--> statement-breakpoint
ALTER TABLE "sales_return_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "sales_return_items" CASCADE;--> statement-breakpoint
ALTER TABLE "sales_returns" DROP CONSTRAINT "sales_returns_sale_id_sales_id_fk";
--> statement-breakpoint
ALTER TABLE "sales_returns" DROP CONSTRAINT "sales_returns_enterprises_id_enterprises_id_fk";
--> statement-breakpoint
DROP INDEX "enterprises_members_user_enterprise_active_unique";--> statement-breakpoint
DROP INDEX "enterprises_members_enterprise_active_idx";--> statement-breakpoint
DROP INDEX "sales_returns_enterprise_return_number_unique";--> statement-breakpoint
DROP INDEX "sales_returns_sale_id_idx";--> statement-breakpoint
DROP INDEX "sales_returns_analytics_idx";--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "member_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "member_legal_name" varchar(255);--> statement-breakpoint
UPDATE "sales" "s"
SET "member_legal_name" = UPPER(TRIM("u"."user_name"))
FROM "enterprises_members" "em"
INNER JOIN "users" "u" ON "u"."id" = "em"."user_id"
WHERE "s"."member_id" = "em"."id"
  AND "s"."member_legal_name" IS NULL;--> statement-breakpoint
UPDATE "sales" "s"
SET "member_legal_name" = UPPER(TRIM("sm"."member_legal_name"))
FROM "sales_members" "sm"
WHERE "sm"."sales_id" = "s"."id"
  AND "s"."member_legal_name" IS NULL
  AND "sm"."member_legal_name" IS NOT NULL
  AND TRIM("sm"."member_legal_name") <> '';--> statement-breakpoint
UPDATE "sales"
SET "member_legal_name" = 'CLIENTE'
WHERE "member_legal_name" IS NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "member_legal_name" SET NOT NULL;--> statement-breakpoint
DELETE FROM "sales_returns";--> statement-breakpoint
ALTER TABLE "sales_returns" ADD COLUMN "return_order" integer;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD COLUMN "sales_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD COLUMN "sale_item_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD COLUMN "quantity" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_returns" DROP COLUMN "return_number";--> statement-breakpoint
ALTER TABLE "sales_returns" DROP COLUMN "sale_id";--> statement-breakpoint
ALTER TABLE "sales_returns" DROP COLUMN "enterprises_id";--> statement-breakpoint
ALTER TABLE "sales_returns" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "sales_returns" DROP COLUMN "kind";--> statement-breakpoint
ALTER TABLE "sales_returns" DROP COLUMN "value_total";--> statement-breakpoint
ALTER TABLE "sales_returns" DROP COLUMN "notes";--> statement-breakpoint
INSERT INTO "sales_returns" (
	"id",
	"return_order",
	"sales_id",
	"sale_item_id",
	"quantity",
	"user_id",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	"return_order",
	"sales_id",
	"sale_item_id",
	"quantity",
	"user_id",
	"created_at",
	"updated_at"
FROM "_mig_sales_returns";--> statement-breakpoint
ALTER TABLE "sales_returns" ALTER COLUMN "return_order" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_returns" ALTER COLUMN "sales_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_returns" ALTER COLUMN "sale_item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_returns" ALTER COLUMN "quantity" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_sale_item_id_sales_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sales_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_members_user_enterprise_class_active_unique" ON "enterprises_members" USING btree ("user_id","enterprise_id","class") WHERE "enterprises_members"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "enterprises_members_user_enterprise_active_idx" ON "enterprises_members" USING btree ("enterprise_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_returns_sales_id_return_order_unique" ON "sales_returns" USING btree ("sales_id","return_order");--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_quantity_positive" CHECK ("sales_returns"."quantity" > 0);
