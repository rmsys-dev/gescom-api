ALTER TABLE "situation_tributary_cst" ADD COLUMN IF NOT EXISTS "origin" varchar(1) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "situation_tributary_cst" ALTER COLUMN "origin" DROP DEFAULT;
--> statement-breakpoint
DROP INDEX IF EXISTS "situation_tributary_cst_regime_cst_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "situation_tributary_cst_regime_origin_cst_unique" ON "situation_tributary_cst" ("regime_tributario", "origin", "cst");
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "situation_tributary_cst" ADD CONSTRAINT "situation_tributary_cst_origin_chk" CHECK ("origin" ~ '^[0-8]$');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "situation_tributary_cst" ADD CONSTRAINT "situation_tributary_cst_cst_crt_chk" CHECK (
    ("regime_tributario" = '3' AND "cst" ~ '^[0-9]{2}$')
    OR ("regime_tributario" <> '3' AND "cst" ~ '^[0-9]{3}$')
  ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;
