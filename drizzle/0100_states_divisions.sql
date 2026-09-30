DO $$ BEGIN
  CREATE TYPE "public"."difal_calculation" AS ENUM ('1', '2');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
ALTER TABLE "states" ADD COLUMN IF NOT EXISTS "difal_calculation" "difal_calculation";
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'states' AND column_name = 'embed_difal'
  ) THEN
    UPDATE "states"
    SET "difal_calculation" = CASE WHEN "embed_difal" THEN '2'::"difal_calculation" ELSE '1'::"difal_calculation" END
    WHERE "difal_calculation" IS NULL;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "states" DROP COLUMN IF EXISTS "embed_difal";
--> statement-breakpoint
ALTER TABLE "states" DROP COLUMN IF EXISTS "borders";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "states_divisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "states_id" uuid NOT NULL,
  "uf" varchar(2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "states_divisions" ADD CONSTRAINT "states_divisions_states_id_states_id_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "states_divisions_state_uf_unique" ON "states_divisions" ("states_id", "uf") WHERE "deleted_at" is null;
--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'STATES_DIVISIONS';
