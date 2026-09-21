DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'NFE_PARAMETERS';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_parameters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "parameter" varchar(255) NOT NULL,
  "value" varchar(500) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "nfe_parameters_parameter_active_unique"
  ON "nfe_parameters" USING btree ("parameter")
  WHERE "nfe_parameters"."deleted_at" is null;--> statement-breakpoint

INSERT INTO "nfe_parameters" ("parameter", "value")
SELECT seed."parameter", seed."value"
FROM (
  VALUES
    ('portal_nfe', 'https://www.nfe.fazenda.gov.br/portal'),
    ('portal_consulta_nfe', 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx'),
    ('versao_layout', '4.00')
) AS seed("parameter", "value")
WHERE NOT EXISTS (
  SELECT 1
  FROM "nfe_parameters" p
  WHERE p."parameter" = seed."parameter"
    AND p."deleted_at" is null
);
