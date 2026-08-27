DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'ENTERPRISE_PARAMETERS';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "enterprise_parameters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "parameter" varchar(255) NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "enterprise_parameters"
    ADD CONSTRAINT "enterprise_parameters_enterprise_id_enterprises_id_fk"
    FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "enterprise_parameters_enterprise_parameter_active_unique"
  ON "enterprise_parameters" USING btree ("enterprise_id", "parameter")
  WHERE "enterprise_parameters"."deleted_at" is null;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "enterprise_parameters_enterprise_active_idx"
  ON "enterprise_parameters" USING btree ("enterprise_id");--> statement-breakpoint

INSERT INTO "enterprise_parameters" ("enterprise_id", "parameter", "enabled")
SELECT e."id", 'trabalha_of', true
FROM "enterprises" e
WHERE e."deleted_at" is null
  AND NOT EXISTS (
    SELECT 1
    FROM "enterprise_parameters" p
    WHERE p."enterprise_id" = e."id"
      AND p."parameter" = 'trabalha_of'
      AND p."deleted_at" is null
  );
