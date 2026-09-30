CREATE TABLE IF NOT EXISTS "nfe_operations_states" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "state_id" uuid NOT NULL,
  "situation_tributary_cst_id" uuid NOT NULL,
  "cfop_enterprises_id" uuid NOT NULL,
  "classification_ibs_cbs_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_situation_tributary_cst_id_situation_tributary_cst_id_fk" FOREIGN KEY ("situation_tributary_cst_id") REFERENCES "public"."situation_tributary_cst"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_cfop_enterprises_id_cfops_enterprises_id_fk" FOREIGN KEY ("cfop_enterprises_id") REFERENCES "public"."cfops_enterprises"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_classification_ibs_cbs_id_classification_ibs_cbs_id_fk" FOREIGN KEY ("classification_ibs_cbs_id") REFERENCES "public"."classification_ibs_cbs"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DROP TABLE IF EXISTS "nfe_operations";
