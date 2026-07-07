ALTER TABLE "users_financial_info" RENAME COLUMN "budget_price" TO "credit_limit";--> statement-breakpoint
ALTER TABLE "users_financial_info" RENAME COLUMN "reduction_rate" TO "billing_commission";--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT "users_financial_info_budget_price_non_negative";--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT "users_financial_info_reduction_rate_range";--> statement-breakpoint
ALTER TABLE "enterprises_members" ALTER COLUMN "status" SET DEFAULT 'PENDENTE';--> statement-breakpoint
ALTER TABLE "users_financial_info" ALTER COLUMN "discout_arrangement" SET DATA TYPE numeric(15, 10) USING CASE WHEN "discout_arrangement" IS NULL OR btrim("discout_arrangement"::text) = '' THEN NULL ELSE "discout_arrangement"::numeric END;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN "post_sales_status" "status" DEFAULT 'PENDENTE' NOT NULL;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN "notify_maturity" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN "rental_price" numeric(15, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD COLUMN "quoted_price" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users_tax_infos" ADD COLUMN "identity_document" varchar(255);--> statement-breakpoint
ALTER TABLE "users_tax_infos" ADD COLUMN "partner_name1" varchar(255);--> statement-breakpoint
ALTER TABLE "users_tax_infos" ADD COLUMN "partner_name2" varchar(255);--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_budget_price_non_negative" CHECK ("users_financial_info"."credit_limit" >= 0);--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_reduction_rate_range" CHECK ("users_financial_info"."billing_commission" >= 0 and "users_financial_info"."billing_commission" <= 100);