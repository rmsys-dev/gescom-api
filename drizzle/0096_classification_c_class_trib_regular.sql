ALTER TABLE "classification_ibs_cbs" ADD COLUMN IF NOT EXISTS "c_class_trib_regular" varchar(6);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "classification_ibs_cbs" ADD CONSTRAINT "classification_ibs_cbs_c_class_trib_regular_chk" CHECK (
    ("ind_g_trib_regular" = '1' AND "c_class_trib_regular" ~ '^[0-9]{6}$')
    OR ("ind_g_trib_regular" = '0' AND "c_class_trib_regular" IS NULL)
  ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;
