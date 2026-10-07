ALTER TABLE "enterprises" ADD COLUMN IF NOT EXISTS "pdf_folder" varchar(500);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enterprises_print_models" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "document_model_code" varchar(2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "enterprises_print_models" ADD CONSTRAINT "enterprises_print_models_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "enterprises_print_models" ADD CONSTRAINT "enterprises_print_models_document_model_code_fk" FOREIGN KEY ("document_model_code") REFERENCES "public"."fiscal_document_models"("code") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "enterprises_print_models_unique" ON "enterprises_print_models" USING btree ("enterprise_id","document_model_code");
