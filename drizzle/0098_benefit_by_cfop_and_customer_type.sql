ALTER TABLE "type_supplier_customers" DROP COLUMN IF EXISTS "icms_reduction";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "benefit_code_by_cfop" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprises_id" uuid NOT NULL,
  "cfop" varchar(4) NOT NULL,
  "cst" varchar(2) NOT NULL,
  "code_benefit" varchar(10) NOT NULL,
  "reduction_percentage" numeric(15, 10),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  CONSTRAINT "benefit_code_by_cfop_cst_chk" CHECK ("cst" ~ '^[0-9]{2}$'),
  CONSTRAINT "benefit_code_by_cfop_code_benefit_chk" CHECK ("code_benefit" ~ '^[A-Z0-9]{8}([A-Z0-9]{2})?$'),
  CONSTRAINT "benefit_code_by_cfop_reduction_percentage_chk" CHECK ("reduction_percentage" between 0 and 100),
  CONSTRAINT "benefit_code_by_cfop_enterprises_chk" CHECK ("enterprises_id" is not null)
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_code_by_cfop" ADD CONSTRAINT "benefit_code_by_cfop_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "benefit_code_by_cfop_enterprises_cfop_cst_benefit_code_unique" ON "benefit_code_by_cfop" ("enterprises_id", "cfop", "cst", "code_benefit");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "benefit_type_costumers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type_supplier_customer_id" uuid NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "cfop" varchar(4) NOT NULL,
  "cst" varchar(2) NOT NULL,
  "code_benefit" varchar(10) NOT NULL,
  "reduction_percentage" numeric(15, 10),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  CONSTRAINT "benefit_type_costumers_cst_chk" CHECK ("cst" ~ '^[0-9]{2}$'),
  CONSTRAINT "benefit_type_costumers_code_benefit_chk" CHECK ("code_benefit" ~ '^[A-Z0-9]{8}([A-Z0-9]{2})?$'),
  CONSTRAINT "benefit_type_costumers_reduction_percentage_chk" CHECK ("reduction_percentage" between 0 and 100),
  CONSTRAINT "benefit_type_costumers_enterprises_chk" CHECK ("enterprise_id" is not null)
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_type_costumers" ADD CONSTRAINT "benefit_type_costumers_type_supplier_customer_id_type_supplier_customers_id_fk" FOREIGN KEY ("type_supplier_customer_id") REFERENCES "public"."type_supplier_customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_type_costumers" ADD CONSTRAINT "benefit_type_costumers_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "benefit_type_costumers_enterprise_type_cfop_cst_benefit_code_unique" ON "benefit_type_costumers" ("enterprise_id", "type_supplier_customer_id", "cfop", "cst", "code_benefit");
