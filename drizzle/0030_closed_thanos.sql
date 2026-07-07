ALTER TABLE "users_financial_info" DROP CONSTRAINT IF EXISTS "users_financial_info_budget_price_non_negative";--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT IF EXISTS "users_financial_info_reduction_rate_range";--> statement-breakpoint
ALTER TABLE "enterprises_members" ALTER COLUMN "status" SET DEFAULT 'PENDENTE';--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users_financial_info'
      AND column_name = 'discout_arrangement'
      AND data_type <> 'numeric'
  ) THEN
    ALTER TABLE "users_financial_info" ALTER COLUMN "discout_arrangement" SET DATA TYPE numeric(15, 10) USING CASE WHEN "discout_arrangement" IS NULL OR btrim("discout_arrangement"::text) = '' THEN NULL ELSE "discout_arrangement"::numeric END;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "post_sales_status" "status" DEFAULT 'PENDENTE' NOT NULL;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "notify_maturity" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "rental_price" numeric(15, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD COLUMN IF NOT EXISTS "quoted_price" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users_tax_infos" ADD COLUMN IF NOT EXISTS "identity_document" varchar(255);--> statement-breakpoint
ALTER TABLE "users_tax_infos" ADD COLUMN IF NOT EXISTS "partner_name1" varchar(255);--> statement-breakpoint
ALTER TABLE "users_tax_infos" ADD COLUMN IF NOT EXISTS "partner_name2" varchar(255);--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_financial_info_budget_price_non_negative'
  ) THEN
    ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_budget_price_non_negative" CHECK ("users_financial_info"."credit_limit" >= 0);
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_financial_info_reduction_rate_range'
  ) THEN
    ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_reduction_rate_range" CHECK ("users_financial_info"."billing_commission" >= 0 and "users_financial_info"."billing_commission" <= 100);
  END IF;
END $$;
