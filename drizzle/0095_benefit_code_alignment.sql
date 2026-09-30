DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'cst_compativel_benefit_unique' AND relkind = 'i')
    AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'cst_compativel_benefit_benefit_code_situation_tributary_cst_unique' AND relkind = 'i') THEN
    ALTER INDEX "cst_compativel_benefit_unique" RENAME TO "cst_compativel_benefit_benefit_code_situation_tributary_cst_unique";
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cst_compativel_benefit_benefit_code_situation_tributary_cst_unique" ON "cst_compativel_benefit" ("benefit_code_id", "situation_tributary_cst_id");
--> statement-breakpoint
DROP INDEX IF EXISTS "cst_compativel_benefit_unique";
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_code" ADD CONSTRAINT "benefit_code_uf_chk" CHECK ("uf" in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'));
EXCEPTION WHEN duplicate_object THEN null; END $$;
