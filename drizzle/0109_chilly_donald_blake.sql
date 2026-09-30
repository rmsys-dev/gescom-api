ALTER TABLE "nfe_operations_states" ADD COLUMN IF NOT EXISTS "presumed_credit_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_presumed_credit_id_fk" FOREIGN KEY ("presumed_credit_id") REFERENCES "public"."presumed_credit"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "nfe_operations_states_enterprise_state_cst_cfop_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_operations_states_key_unique" ON "nfe_operations_states" USING btree ("enterprise_id", "state_id", "situation_tributary_cst_id", "cfop_enterprises_id", "presumed_credit_id");
