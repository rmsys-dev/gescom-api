CREATE TABLE IF NOT EXISTS "nfe_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"description" text NOT NULL,
	"suframa" boolean DEFAULT false NOT NULL,
	"priority" boolean DEFAULT false NOT NULL,
	"onerous" boolean DEFAULT false NOT NULL,
	"tributada" boolean DEFAULT false NOT NULL,
	"presumed_credit_id" uuid,
	"classification_ibs_cbs_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "nfe_operations" ADD CONSTRAINT "nfe_operations_classification_ibs_cbs_id_fk" FOREIGN KEY ("classification_ibs_cbs_id") REFERENCES "public"."classification_ibs_cbs"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "nfe_operations" ADD CONSTRAINT "nfe_operations_presumed_credit_id_fk" FOREIGN KEY ("presumed_credit_id") REFERENCES "public"."presumed_credit"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_operations_key_unique" ON "nfe_operations" USING btree ("description");
--> statement-breakpoint
ALTER TABLE "nfe_operations_states" ADD COLUMN IF NOT EXISTS "nfe_operations_id" uuid;
--> statement-breakpoint
ALTER TABLE "nfe_operations_states" ADD COLUMN IF NOT EXISTS "icms_taxation_id" uuid;
--> statement-breakpoint
DO $$
DECLARE
	row record;
	new_id uuid;
	icms_id uuid;
	descr text;
BEGIN
	SELECT "id" INTO icms_id FROM "icms_taxation" WHERE "icms" = '01' LIMIT 1;
	IF EXISTS (SELECT 1 FROM "nfe_operations_states" WHERE "nfe_operations_id" IS NULL) AND icms_id IS NULL THEN
		RAISE EXCEPTION 'Tributacao de ICMS 01 ausente para vincular as operacoes por estado ja cadastradas';
	END IF;
	FOR row IN
		SELECT
			"op"."id",
			"op"."priority",
			"op"."onerous",
			"op"."presumed_credit_id",
			"op"."classification_ibs_cbs_id",
			trim("cf"."description") || ' - ' || "st"."acronym" ||
				CASE WHEN "op"."onerous" THEN ' onerosa' ELSE '' END AS "description"
		FROM "nfe_operations_states" AS "op"
		JOIN "states" AS "st" ON "st"."id" = "op"."state_id"
		JOIN "cfops_enterprises" AS "ce" ON "ce"."id" = "op"."cfop_enterprises_id"
		JOIN "cfops" AS "cf" ON "cf"."id" = "ce"."cfop_id"
		WHERE "op"."nfe_operations_id" IS NULL
	LOOP
		descr := row.description;
		IF EXISTS (SELECT 1 FROM "nfe_operations" WHERE "description" = descr) THEN
			descr := descr || ' ' || left(row.id::text, 8);
		END IF;
		INSERT INTO "nfe_operations" (
			"description", "priority", "onerous", "presumed_credit_id", "classification_ibs_cbs_id"
		) VALUES (
			descr, row.priority, row.onerous, row.presumed_credit_id, row.classification_ibs_cbs_id
		) RETURNING "id" INTO new_id;
		UPDATE "nfe_operations_states"
		SET "nfe_operations_id" = new_id, "icms_taxation_id" = icms_id
		WHERE "id" = row.id;
	END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "nfe_operations_states" ALTER COLUMN "nfe_operations_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "nfe_operations_states" ALTER COLUMN "icms_taxation_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_nfe_operations_id_fk" FOREIGN KEY ("nfe_operations_id") REFERENCES "public"."nfe_operations"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_icms_taxation_id_fk" FOREIGN KEY ("icms_taxation_id") REFERENCES "public"."icms_taxation"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "nfe_operations_states" DROP COLUMN IF EXISTS "classification_ibs_cbs_id";
--> statement-breakpoint
ALTER TABLE "nfe_operations_states" DROP COLUMN IF EXISTS "presumed_credit_id";
--> statement-breakpoint
ALTER TABLE "nfe_operations_states" DROP COLUMN IF EXISTS "priority";
--> statement-breakpoint
ALTER TABLE "nfe_operations_states" DROP COLUMN IF EXISTS "onerous";
--> statement-breakpoint
DROP INDEX IF EXISTS "nfe_operations_states_key_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_operations_states_key_unique" ON "nfe_operations_states" USING btree ("enterprise_id", "state_id", "nfe_operations_id", "cfop_enterprises_id", "icms_taxation_id", "situation_tributary_cst_id");
--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'NFE_OPERATIONS';
