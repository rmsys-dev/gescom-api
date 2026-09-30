CREATE TABLE IF NOT EXISTS "nfe_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "status" "status" DEFAULT 'ATIVO' NOT NULL,
  "description" varchar(255) NOT NULL,
  "mod" varchar(2) NOT NULL,
  "nat_op" varchar(60) NOT NULL,
  "id_dest" varchar(1) NOT NULL,
  "ind_final" varchar(1) NOT NULL,
  "ind_pres" varchar(1) DEFAULT '1' NOT NULL,
  "cfops_enterprises_id" uuid NOT NULL,
  "situation_tributary_cst_id" uuid NOT NULL,
  "icms_origin" "cst_origin" DEFAULT '0' NOT NULL,
  "p_red_bc" numeric(15, 10),
  "benefit_code_id" uuid,
  "classification_ibs_cbs_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "nfe_operations_mod_chk" CHECK ("mod" in ('55', '65')),
  CONSTRAINT "nfe_operations_id_dest_chk" CHECK ("id_dest" in ('1', '2')),
  CONSTRAINT "nfe_operations_ind_final_chk" CHECK ("ind_final" in ('0', '1')),
  CONSTRAINT "nfe_operations_ind_pres_chk" CHECK ("ind_pres" in ('0', '1', '2', '3', '4', '5', '9')),
  CONSTRAINT "nfe_operations_p_red_bc_range" CHECK ("p_red_bc" is null or ("p_red_bc" >= 0 and "p_red_bc" <= 100))
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_operations" ADD CONSTRAINT "nfe_operations_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_operations" ADD CONSTRAINT "nfe_operations_cfops_enterprises_id_cfops_enterprises_id_fk" FOREIGN KEY ("cfops_enterprises_id") REFERENCES "public"."cfops_enterprises"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_operations" ADD CONSTRAINT "nfe_operations_situation_tributary_cst_id_situation_tributary_cst_id_fk" FOREIGN KEY ("situation_tributary_cst_id") REFERENCES "public"."situation_tributary_cst"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_operations" ADD CONSTRAINT "nfe_operations_benefit_code_id_benefit_code_id_fk" FOREIGN KEY ("benefit_code_id") REFERENCES "public"."benefit_code"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_operations" ADD CONSTRAINT "nfe_operations_classification_ibs_cbs_id_classification_ibs_cbs_id_fk" FOREIGN KEY ("classification_ibs_cbs_id") REFERENCES "public"."classification_ibs_cbs"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_operations_enterprise_description_active_unique" ON "nfe_operations" ("enterprise_id", "description") WHERE "deleted_at" is null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfe_operations_enterprise_active_idx" ON "nfe_operations" ("enterprise_id");
