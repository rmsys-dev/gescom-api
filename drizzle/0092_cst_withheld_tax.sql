DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'situation_tributary_cst'
      AND column_name = 'has_st'
  ) THEN
    ALTER TABLE "situation_tributary_cst" RENAME COLUMN "has_st" TO "withheld_tax";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "situation_tributary_cst" ADD COLUMN IF NOT EXISTS "withheld_tax" boolean DEFAULT false NOT NULL;
