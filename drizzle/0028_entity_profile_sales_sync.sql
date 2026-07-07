ALTER TABLE "sales_items" ADD COLUMN IF NOT EXISTS "average_cost" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ADD COLUMN IF NOT EXISTS "actual_real_cost" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ADD COLUMN IF NOT EXISTS "price_cost" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ADD COLUMN IF NOT EXISTS "price_sale" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "users_relationships" DROP CONSTRAINT IF EXISTS "users_relationships_profession_time_non_negative";--> statement-breakpoint
ALTER TABLE "users_relationships" DROP CONSTRAINT IF EXISTS "users_relationships_rental_period_non_negative";--> statement-breakpoint
ALTER TABLE "users_relationships" ADD COLUMN IF NOT EXISTS "workplace" varchar(255);--> statement-breakpoint
ALTER TABLE "users_relationships" ADD COLUMN IF NOT EXISTS "work_address" varchar(255);--> statement-breakpoint
ALTER TABLE "users_relationships" ADD COLUMN IF NOT EXISTS "department_labor" varchar(255);--> statement-breakpoint
ALTER TABLE "users_relationships" ALTER COLUMN "rental_period" SET DATA TYPE varchar(255) USING "rental_period"::text;--> statement-breakpoint
ALTER TABLE "users_relationships" ALTER COLUMN "profession_time" SET DATA TYPE varchar(255) USING "profession_time"::text;--> statement-breakpoint
ALTER TABLE "users_relationships" DROP COLUMN IF EXISTS "profession";--> statement-breakpoint
ALTER TABLE "users_relationships" DROP COLUMN IF EXISTS "profession_description";--> statement-breakpoint
ALTER TABLE "users_relationships" DROP COLUMN IF EXISTS "link_with_seller";--> statement-breakpoint
ALTER TABLE "users_tax_infos" ADD COLUMN IF NOT EXISTS "government_reduction_rate" numeric(15, 10);--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users_tax_infos'
      AND column_name = 'spc_registration'
      AND data_type <> 'boolean'
  ) THEN
    ALTER TABLE "users_tax_infos" ALTER COLUMN "spc_registration" SET DATA TYPE boolean USING (CASE WHEN "spc_registration" IS NULL OR btrim("spc_registration"::text) = '' THEN false ELSE true END);
    ALTER TABLE "users_tax_infos" ALTER COLUMN "spc_registration" SET DEFAULT false;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "users_tax_infos" ALTER COLUMN "government_entity" SET DATA TYPE varchar(1) USING left("government_entity", 1);--> statement-breakpoint
ALTER TABLE "users_tax_infos" DROP COLUMN IF EXISTS "benefit_code";
