ALTER TABLE "products_enterprises" ADD COLUMN IF NOT EXISTS "classification_ibs_cbs_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_classification_ibs_cbs_id_fk" FOREIGN KEY ("classification_ibs_cbs_id") REFERENCES "public"."classification_ibs_cbs"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
