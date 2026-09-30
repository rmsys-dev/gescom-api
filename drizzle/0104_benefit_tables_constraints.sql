DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'benefit_code_by_cfop_enterprises_cfop_cst_benefit_code_unique' AND relkind = 'i')
    AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'benefit_code_by_cfop_unique' AND relkind = 'i') THEN
    ALTER INDEX "benefit_code_by_cfop_enterprises_cfop_cst_benefit_code_unique" RENAME TO "benefit_code_by_cfop_unique";
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "benefit_code_by_cfop_unique" ON "benefit_code_by_cfop" ("enterprises_id", "cfop", "cst", "benefit_code_id");
--> statement-breakpoint
DROP INDEX IF EXISTS "benefit_code_by_cfop_enterprises_cfop_cst_benefit_code_unique";
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'benefit_type_costumers_ent_type_cfop_cst_benefit_unique' AND relkind = 'i')
    AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'benefit_type_costumers_unique' AND relkind = 'i') THEN
    ALTER INDEX "benefit_type_costumers_ent_type_cfop_cst_benefit_unique" RENAME TO "benefit_type_costumers_unique";
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "benefit_type_costumers_unique" ON "benefit_type_costumers" ("enterprise_id", "type_supplier_customer_id", "cfop", "cst", "benefit_code_id");
--> statement-breakpoint
DROP INDEX IF EXISTS "benefit_type_costumers_ent_type_cfop_cst_benefit_unique";
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_code_by_cfop" ADD CONSTRAINT "benefit_code_by_cfop_cfop_chk" CHECK ("cfop" ~ '^[0-9]{4}$');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_code_by_cfop" ADD CONSTRAINT "benefit_code_by_cfop_benefit_code_chk" CHECK ("benefit_code_id" is not null);
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_type_costumers" ADD CONSTRAINT "benefit_type_costumers_cfop_chk" CHECK ("cfop" ~ '^[0-9]{4}$');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_type_costumers" ADD CONSTRAINT "benefit_type_costumers_benefit_code_chk" CHECK ("benefit_code_id" is not null);
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_type_costumers" ADD CONSTRAINT "benefit_type_costumers_type_supplier_customer_chk" CHECK ("type_supplier_customer_id" is not null);
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_code_by_state_and_products" ADD CONSTRAINT "benefit_state_products_benefit_code_chk" CHECK ("benefit_code_id" is not null);
EXCEPTION WHEN duplicate_object THEN null; END $$;
