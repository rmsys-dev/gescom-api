ALTER TABLE "nfe_operations_states" DROP COLUMN IF EXISTS "situation_tributary_cst_id";
--> statement-breakpoint
DROP INDEX IF EXISTS "nfe_operations_states_key_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_operations_states_key_unique" ON "nfe_operations_states" USING btree ("enterprise_id", "state_id", "nfe_operations_id", "cfop_enterprises_id", "icms_taxation_id");
