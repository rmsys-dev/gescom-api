ALTER TABLE "nfe_operations_states" ADD COLUMN IF NOT EXISTS "enterprise_id" uuid;
--> statement-breakpoint
UPDATE "nfe_operations_states" AS "op"
SET "enterprise_id" = "ce"."enterprises_id"
FROM "cfops_enterprises" AS "ce"
WHERE "ce"."id" = "op"."cfop_enterprises_id" AND "op"."enterprise_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "nfe_operations_states" ALTER COLUMN "enterprise_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "nfe_operations_states" ADD COLUMN IF NOT EXISTS "priority" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "nfe_operations_states" ADD COLUMN IF NOT EXISTS "onerous" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "nfe_operations_states_state_cst_cfop_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_operations_states_enterprise_state_cst_cfop_unique" ON "nfe_operations_states" USING btree ("enterprise_id", "state_id", "situation_tributary_cst_id", "cfop_enterprises_id");
