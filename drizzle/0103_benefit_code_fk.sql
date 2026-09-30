ALTER TABLE "benefit_code_by_cfop" ADD COLUMN IF NOT EXISTS "benefit_code_id" uuid;
--> statement-breakpoint
ALTER TABLE "benefit_type_costumers" ADD COLUMN IF NOT EXISTS "benefit_code_id" uuid;
--> statement-breakpoint
ALTER TABLE "benefit_code_by_state_and_products" ADD COLUMN IF NOT EXISTS "benefit_code_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_code_by_cfop' AND column_name = 'code_benefit') THEN
    UPDATE "benefit_code_by_cfop" x
    SET "benefit_code_id" = bc."id"
    FROM "benefit_code" bc
    WHERE x."benefit_code_id" IS NULL
      AND bc."code_benefit" = x."code_benefit"
      AND bc."uf" = (
        SELECT upper(trim(s."acronym"))
        FROM "enterprises_address" ea
        JOIN "ceps" c ON c."id" = ea."cep_id"
        JOIN "cities" ci ON ci."id" = c."city_id"
        JOIN "states" s ON s."id" = ci."state_id"
        WHERE ea."enterprise_id" = x."enterprises_id"
          AND ea."adress_type" = 'PRINCIPAL'
          AND ea."deleted_at" IS NULL
        LIMIT 1
      );
    UPDATE "benefit_code_by_cfop" x
    SET "benefit_code_id" = (SELECT bc."id" FROM "benefit_code" bc WHERE bc."code_benefit" = x."code_benefit")
    WHERE x."benefit_code_id" IS NULL
      AND (SELECT count(*) FROM "benefit_code" bc WHERE bc."code_benefit" = x."code_benefit") = 1;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_type_costumers' AND column_name = 'code_benefit') THEN
    UPDATE "benefit_type_costumers" x
    SET "benefit_code_id" = bc."id"
    FROM "benefit_code" bc
    WHERE x."benefit_code_id" IS NULL
      AND bc."code_benefit" = x."code_benefit"
      AND bc."uf" = (
        SELECT upper(trim(s."acronym"))
        FROM "enterprises_address" ea
        JOIN "ceps" c ON c."id" = ea."cep_id"
        JOIN "cities" ci ON ci."id" = c."city_id"
        JOIN "states" s ON s."id" = ci."state_id"
        WHERE ea."enterprise_id" = x."enterprise_id"
          AND ea."adress_type" = 'PRINCIPAL'
          AND ea."deleted_at" IS NULL
        LIMIT 1
      );
    UPDATE "benefit_type_costumers" x
    SET "benefit_code_id" = (SELECT bc."id" FROM "benefit_code" bc WHERE bc."code_benefit" = x."code_benefit")
    WHERE x."benefit_code_id" IS NULL
      AND (SELECT count(*) FROM "benefit_code" bc WHERE bc."code_benefit" = x."code_benefit") = 1;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefit_code_by_state_and_products' AND column_name = 'code_benefit') THEN
    UPDATE "benefit_code_by_state_and_products" x
    SET "benefit_code_id" = bc."id"
    FROM "benefit_code" bc, "states" s
    WHERE x."benefit_code_id" IS NULL
      AND s."id" = x."state_id"
      AND bc."code_benefit" = x."code_benefit"
      AND bc."uf" = upper(trim(s."acronym"));
  END IF;
END $$;
--> statement-breakpoint
DO $$
DECLARE
  missing_cfop integer;
  missing_type integer;
  missing_state integer;
BEGIN
  SELECT count(*) INTO missing_cfop FROM "benefit_code_by_cfop" WHERE "benefit_code_id" IS NULL;
  SELECT count(*) INTO missing_type FROM "benefit_type_costumers" WHERE "benefit_code_id" IS NULL;
  SELECT count(*) INTO missing_state FROM "benefit_code_by_state_and_products" WHERE "benefit_code_id" IS NULL;
  IF missing_cfop + missing_type + missing_state > 0 THEN
    RAISE EXCEPTION 'Registros sem benefit_code correspondente: benefit_code_by_cfop=%, benefit_type_costumers=%, benefit_code_by_state_and_products=%. Corrija ou remova antes de migrar.',
      missing_cfop, missing_type, missing_state;
  END IF;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "benefit_code_by_cfop_enterprises_cfop_cst_benefit_code_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "benefit_type_costumers_ent_type_cfop_cst_benefit_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "benefit_state_products_unique";
--> statement-breakpoint
ALTER TABLE "benefit_code_by_cfop" DROP CONSTRAINT IF EXISTS "benefit_code_by_cfop_code_benefit_chk";
--> statement-breakpoint
ALTER TABLE "benefit_type_costumers" DROP CONSTRAINT IF EXISTS "benefit_type_costumers_code_benefit_chk";
--> statement-breakpoint
ALTER TABLE "benefit_code_by_state_and_products" DROP CONSTRAINT IF EXISTS "benefit_state_products_code_benefit_chk";
--> statement-breakpoint
ALTER TABLE "benefit_code_by_cfop" DROP COLUMN IF EXISTS "code_benefit";
--> statement-breakpoint
ALTER TABLE "benefit_type_costumers" DROP COLUMN IF EXISTS "code_benefit";
--> statement-breakpoint
ALTER TABLE "benefit_code_by_state_and_products" DROP COLUMN IF EXISTS "code_benefit";
--> statement-breakpoint
ALTER TABLE "benefit_code_by_cfop" ALTER COLUMN "benefit_code_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "benefit_type_costumers" ALTER COLUMN "benefit_code_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "benefit_code_by_state_and_products" ALTER COLUMN "benefit_code_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_code_by_cfop" ADD CONSTRAINT "benefit_code_by_cfop_benefit_code_id_fk" FOREIGN KEY ("benefit_code_id") REFERENCES "public"."benefit_code"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_type_costumers" ADD CONSTRAINT "benefit_type_costumers_benefit_code_id_fk" FOREIGN KEY ("benefit_code_id") REFERENCES "public"."benefit_code"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "benefit_code_by_state_and_products" ADD CONSTRAINT "benefit_state_products_benefit_code_id_fk" FOREIGN KEY ("benefit_code_id") REFERENCES "public"."benefit_code"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "benefit_code_by_cfop_enterprises_cfop_cst_benefit_code_unique" ON "benefit_code_by_cfop" ("enterprises_id", "cfop", "cst", "benefit_code_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "benefit_type_costumers_ent_type_cfop_cst_benefit_unique" ON "benefit_type_costumers" ("enterprise_id", "type_supplier_customer_id", "cfop", "cst", "benefit_code_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "benefit_state_products_unique" ON "benefit_code_by_state_and_products" ("enterprises_id", "state_id", "cfop", "cst", "products_enterprises_id", "benefit_code_id");
