ALTER TABLE "cst_compativel_benefit" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "cst_compativel_benefit" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cst_compativel_benefit" ADD CONSTRAINT "cst_compativel_benefit_benefit_code_chk" CHECK ("benefit_code_id" is not null);
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "cst_compativel_benefit" ADD CONSTRAINT "cst_compativel_benefit_situation_tributary_cst_chk" CHECK ("situation_tributary_cst_id" is not null);
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'cst_compativel_benefit_benefit_code_situation_tributary_cst_uni' AND relkind = 'i')
    AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'cst_compativel_benefit_benefit_cst_unique' AND relkind = 'i') THEN
    ALTER INDEX "cst_compativel_benefit_benefit_code_situation_tributary_cst_uni" RENAME TO "cst_compativel_benefit_benefit_cst_unique";
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cst_compativel_benefit_benefit_cst_unique" ON "cst_compativel_benefit" ("benefit_code_id", "situation_tributary_cst_id");
--> statement-breakpoint
DROP INDEX IF EXISTS "cst_compativel_benefit_benefit_code_situation_tributary_cst_uni";
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'benefit_type_costumers_enterprise_type_cfop_cst_benefit_code_uni' AND relkind = 'i')
    AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'benefit_type_costumers_ent_type_cfop_cst_benefit_unique' AND relkind = 'i') THEN
    ALTER INDEX "benefit_type_costumers_enterprise_type_cfop_cst_benefit_code_uni" RENAME TO "benefit_type_costumers_ent_type_cfop_cst_benefit_unique";
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "benefit_type_costumers_ent_type_cfop_cst_benefit_unique" ON "benefit_type_costumers" ("enterprise_id", "type_supplier_customer_id", "cfop", "cst", "code_benefit");
--> statement-breakpoint
DROP INDEX IF EXISTS "benefit_type_costumers_enterprise_type_cfop_cst_benefit_code_uni";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "benefit_code_by_state_and_products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprises_id" uuid NOT NULL,
  "state_id" uuid NOT NULL,
  "cfop" varchar(4) NOT NULL,
  "cst" varchar(2) NOT NULL,
  "products_enterprises_id" uuid NOT NULL,
  "code_benefit" varchar(10) NOT NULL,
  "reduction_percentage" numeric(15, 10),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  CONSTRAINT "benefit_state_products_state_chk" CHECK ("state_id" is not null),
  CONSTRAINT "benefit_state_products_cfop_chk" CHECK ("cfop" ~ '^[0-9]{4}$'),
  CONSTRAINT "benefit_state_products_cst_chk" CHECK ("cst" ~ '^[0-9]{2}$'),
  CONSTRAINT "benefit_state_products_products_enterprises_chk" CHECK ("products_enterprises_id" is not null),
  CONSTRAINT "benefit_state_products_code_benefit_chk" CHECK ("code_benefit" ~ '^[A-Z0-9]{8}([A-Z0-9]{2})?$'),
  CONSTRAINT "benefit_state_products_reduction_percentage_chk" CHECK ("reduction_percentage" between 0 and 100),
  CONSTRAINT "benefit_state_products_enterprises_chk" CHECK ("enterprises_id" is not null)
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_code_by_state_and_products" ADD CONSTRAINT "benefit_state_products_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_code_by_state_and_products" ADD CONSTRAINT "benefit_state_products_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_code_by_state_and_products" ADD CONSTRAINT "benefit_state_products_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "benefit_state_products_unique" ON "benefit_code_by_state_and_products" ("enterprises_id", "state_id", "cfop", "cst", "products_enterprises_id", "code_benefit");
--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'BENEFIT_CODE_BY_STATE_AND_PRODUCTS';
