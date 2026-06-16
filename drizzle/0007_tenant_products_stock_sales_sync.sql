CREATE TYPE "public"."payment_type" AS ENUM('A_VISTA', 'A_PRAZO', 'OUTROS');
--> statement-breakpoint
ALTER TABLE "product_brands" ADD COLUMN IF NOT EXISTS "enterprises_id" uuid;
--> statement-breakpoint
ALTER TABLE "product_groups" ADD COLUMN IF NOT EXISTS "enterprises_id" uuid;
--> statement-breakpoint
ALTER TABLE "product_subgroups" ADD COLUMN IF NOT EXISTS "enterprises_id" uuid;
--> statement-breakpoint
ALTER TABLE "product_subgroups" ADD COLUMN IF NOT EXISTS "generates_comission" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_subgroups" ADD COLUMN IF NOT EXISTS "comission_on_sight_seller" numeric(13, 10) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_subgroups" ADD COLUMN IF NOT EXISTS "comission_to_terms_seller" numeric(13, 10) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_subgroups" ADD COLUMN IF NOT EXISTS "comission_partial_seller" numeric(13, 10) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_subgroups" ADD COLUMN IF NOT EXISTS "comission_on_sight_manager" numeric(13, 10) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_subgroups" ADD COLUMN IF NOT EXISTS "comission_to_terms_manager" numeric(13, 10) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_subgroups" ADD COLUMN IF NOT EXISTS "comission_partial_manager" numeric(13, 10) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "stock_sectors" ADD COLUMN IF NOT EXISTS "enterprises_id" uuid;
--> statement-breakpoint
ALTER TABLE "payment_types" ADD COLUMN IF NOT EXISTS "payment_type" "payment_type";
--> statement-breakpoint
UPDATE "payment_types" SET "payment_type" = 'OUTROS' WHERE "payment_type" IS NULL;
--> statement-breakpoint
ALTER TABLE "payment_types" ALTER COLUMN "payment_type" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_items" ADD COLUMN IF NOT EXISTS "percentage_comission_seller" numeric(13, 10) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_items" ADD COLUMN IF NOT EXISTS "percentage_comission_manager" numeric(13, 10) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_brands" ADD CONSTRAINT "product_brands_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_groups" ADD CONSTRAINT "product_groups_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_subgroups" ADD CONSTRAINT "product_subgroups_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_sectors" ADD CONSTRAINT "stock_sectors_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "product_brands" ALTER COLUMN "enterprises_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_groups" ALTER COLUMN "enterprises_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "enterprises_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "stock_sectors" ALTER COLUMN "enterprises_id" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_brands_enterprise_description_unique" ON "product_brands" USING btree ("enterprises_id","description");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_brands_enterprise_idx" ON "product_brands" USING btree ("enterprises_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_groups_enterprise_description_unique" ON "product_groups" USING btree ("enterprises_id","description");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_groups_enterprise_idx" ON "product_groups" USING btree ("enterprises_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_subgroups_enterprise_description_unique" ON "product_subgroups" USING btree ("enterprises_id","description");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_subgroups_enterprise_idx" ON "product_subgroups" USING btree ("enterprises_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stock_sectors_enterprise_description_unique" ON "stock_sectors" USING btree ("enterprises_id","description");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_sectors_enterprise_idx" ON "stock_sectors" USING btree ("enterprises_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sales_budget_unclosed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversion_id" uuid NOT NULL,
	"budget_item_id" uuid NOT NULL,
	"quantity_not_converted" numeric(14, 4) NOT NULL,
	"justification" varchar(500) NOT NULL,
	"user_id" uuid NOT NULL,
	"user_legal_name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_budget_unclosed_items_quantity_positive" CHECK ("sales_budget_unclosed_items"."quantity_not_converted" > 0)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales_budget_unclosed_items" ADD CONSTRAINT "sales_budget_unclosed_items_conversion_id_sales_budget_conversions_id_fk" FOREIGN KEY ("conversion_id") REFERENCES "public"."sales_budget_conversions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales_budget_unclosed_items" ADD CONSTRAINT "sales_budget_unclosed_items_budget_item_id_sales_items_id_fk" FOREIGN KEY ("budget_item_id") REFERENCES "public"."sales_items"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sales_budget_unclosed_items" ADD CONSTRAINT "sales_budget_unclosed_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sales_budget_unclosed_items_conversion_budget_item_unique" ON "sales_budget_unclosed_items" USING btree ("conversion_id","budget_item_id");
