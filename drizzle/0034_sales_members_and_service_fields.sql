DO $$ BEGIN
  CREATE TYPE "public"."sale_service_type" AS ENUM('SERVICO', 'GARANTIA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "percentage_discount_pie" numeric(15, 10);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "value_discount_financial_pie" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "percentage_discount_service" numeric(15, 10);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "value_discount_financial_service" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "percentage_acresce_pie" numeric(15, 10);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "value_acresce_financial_pie" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "percentage_acresce_service" numeric(15, 10);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "value_acresce_financial_service" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "vehicle_mileage" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "observations" varchar(500);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "defect" varchar(500);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "service_type" "sale_service_type" DEFAULT 'SERVICO' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "user_modification_service_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "user_closed_service_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_user_modification_service_id_users_id_fk" FOREIGN KEY ("user_modification_service_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_user_closed_service_id_users_id_fk" FOREIGN KEY ("user_closed_service_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN IF EXISTS "date_modification_service";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN IF EXISTS "member_legal_name";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN IF EXISTS "percentage_discount";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN IF EXISTS "value_discount_financial";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN IF EXISTS "percentage_acresce";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN IF EXISTS "value_acresce_financial";--> statement-breakpoint
DROP TABLE IF EXISTS "sales_members";--> statement-breakpoint
CREATE TABLE "sales_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_id" uuid NOT NULL,
	"member_legal_name" varchar(255),
	"member_address" varchar(255),
	"member_sector" varchar(255),
	"member_cep" varchar(8),
	"member_city" varchar(255),
	"member_state" varchar(2),
	"registration" varchar(14),
	"member_phone" varchar(20),
	"member_mobile" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "sales_members" ADD CONSTRAINT "sales_members_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sales_members_sales_id_unique" ON "sales_members" USING btree ("sales_id");
