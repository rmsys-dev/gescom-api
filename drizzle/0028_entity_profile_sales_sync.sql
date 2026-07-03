ALTER TABLE "sales_items" ADD COLUMN "average_cost" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ADD COLUMN "actual_real_cost" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ADD COLUMN "price_cost" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ADD COLUMN "price_sale" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "users_relationships" DROP CONSTRAINT "users_relationships_profession_time_non_negative";--> statement-breakpoint
ALTER TABLE "users_relationships" DROP CONSTRAINT "users_relationships_rental_period_non_negative";--> statement-breakpoint
ALTER TABLE "users_relationships" ADD COLUMN "workplace" varchar(255);--> statement-breakpoint
ALTER TABLE "users_relationships" ADD COLUMN "work_address" varchar(255);--> statement-breakpoint
ALTER TABLE "users_relationships" ADD COLUMN "department_labor" varchar(255);--> statement-breakpoint
ALTER TABLE "users_relationships" ALTER COLUMN "rental_period" SET DATA TYPE varchar(255) USING "rental_period"::text;--> statement-breakpoint
ALTER TABLE "users_relationships" ALTER COLUMN "profession_time" SET DATA TYPE varchar(255) USING "profession_time"::text;--> statement-breakpoint
ALTER TABLE "users_relationships" DROP COLUMN "profession";--> statement-breakpoint
ALTER TABLE "users_relationships" DROP COLUMN "profession_description";--> statement-breakpoint
ALTER TABLE "users_relationships" DROP COLUMN "link_with_seller";--> statement-breakpoint
ALTER TABLE "users_tax_infos" ADD COLUMN "government_reduction_rate" numeric(15, 10);--> statement-breakpoint
ALTER TABLE "users_tax_infos" ALTER COLUMN "spc_registration" SET DATA TYPE boolean USING (CASE WHEN "spc_registration" IS NULL OR btrim("spc_registration") = '' THEN false ELSE true END);--> statement-breakpoint
ALTER TABLE "users_tax_infos" ALTER COLUMN "spc_registration" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "users_tax_infos" ALTER COLUMN "government_entity" SET DATA TYPE varchar(1) USING left("government_entity", 1);--> statement-breakpoint
ALTER TABLE "users_tax_infos" DROP COLUMN "benefit_code";
