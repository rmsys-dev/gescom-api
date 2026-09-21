DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'ENTERPRISES_NFE';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'ENTERPRISES_NFE_CERTIFICATES';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."nfe_certificate_status" AS ENUM ('ATIVO', 'SUBSTITUIDO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "enterprises_nfe" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "ambiente" smallint DEFAULT 2 NOT NULL,
  "serie_nfe" integer DEFAULT 1 NOT NULL,
  "serie_nfce" integer DEFAULT 1 NOT NULL,
  "id_csc" varchar(6),
  "csc_encrypted" text,
  "tipo_emissao" smallint DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "enterprises_nfe_ambiente_chk" CHECK ("ambiente" in (1, 2)),
  CONSTRAINT "enterprises_nfe_serie_nfe_chk" CHECK ("serie_nfe" >= 0 and "serie_nfe" <= 999),
  CONSTRAINT "enterprises_nfe_serie_nfce_chk" CHECK ("serie_nfce" >= 0 and "serie_nfce" <= 999),
  CONSTRAINT "enterprises_nfe_tipo_emissao_chk" CHECK ("tipo_emissao" in (1, 2, 4, 5, 6, 7, 9))
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "enterprises_nfe"
    ADD CONSTRAINT "enterprises_nfe_enterprise_id_enterprises_id_fk"
    FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "enterprises_nfe_enterprise_active_unique"
  ON "enterprises_nfe" USING btree ("enterprise_id")
  WHERE "enterprises_nfe"."deleted_at" is null;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "enterprises_nfe_certificates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "pfx" bytea NOT NULL,
  "password_encrypted" text NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "cnpj" varchar(14),
  "subject" varchar(500),
  "valid_from" timestamp with time zone NOT NULL,
  "valid_until" timestamp with time zone NOT NULL,
  "status" "public"."nfe_certificate_status" DEFAULT 'ATIVO' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "enterprises_nfe_certificates"
    ADD CONSTRAINT "enterprises_nfe_certificates_enterprise_id_enterprises_id_fk"
    FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "enterprises_nfe_certificates_active_unique"
  ON "enterprises_nfe_certificates" USING btree ("enterprise_id")
  WHERE "enterprises_nfe_certificates"."deleted_at" is null
    AND "enterprises_nfe_certificates"."status" = 'ATIVO';--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "enterprises_nfe_certificates_enterprise_idx"
  ON "enterprises_nfe_certificates" USING btree ("enterprise_id");
