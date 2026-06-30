ALTER TABLE "product_taxation" ADD COLUMN IF NOT EXISTS "cst_pis_entrada_id" uuid;--> statement-breakpoint
ALTER TABLE "product_taxation" ADD COLUMN IF NOT EXISTS "cst_pis_saida_id" uuid;--> statement-breakpoint
ALTER TABLE "product_taxation" ADD COLUMN IF NOT EXISTS "cst_cofins_entrada_id" uuid;--> statement-breakpoint
ALTER TABLE "product_taxation" ADD COLUMN IF NOT EXISTS "cst_cofins_saida_id" uuid;--> statement-breakpoint
UPDATE "product_taxation" pt
SET "cst_pis_entrada_id" = pcs.id
FROM "pis_cofins_situation" pcs
WHERE pt."cst_pis_entrada_id" IS NULL
  AND pt."cst_pis_entrada" IS NOT NULL
  AND pcs.cst = pt."cst_pis_entrada";--> statement-breakpoint
UPDATE "product_taxation" pt
SET "cst_pis_saida_id" = pcs.id
FROM "pis_cofins_situation" pcs
WHERE pt."cst_pis_saida_id" IS NULL
  AND pt."cst_pis_saida" IS NOT NULL
  AND pcs.cst = pt."cst_pis_saida";--> statement-breakpoint
UPDATE "product_taxation" pt
SET "cst_cofins_entrada_id" = pcs.id
FROM "pis_cofins_situation" pcs
WHERE pt."cst_cofins_entrada_id" IS NULL
  AND pt."cst_cofins_entrada" IS NOT NULL
  AND pcs.cst = pt."cst_cofins_entrada";--> statement-breakpoint
UPDATE "product_taxation" pt
SET "cst_cofins_saida_id" = pcs.id
FROM "pis_cofins_situation" pcs
WHERE pt."cst_cofins_saida_id" IS NULL
  AND pt."cst_cofins_saida" IS NOT NULL
  AND pcs.cst = pt."cst_cofins_saida";--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM "product_taxation"
    WHERE "cst_pis_entrada_id" IS NULL
       OR "cst_pis_saida_id" IS NULL
       OR "cst_cofins_entrada_id" IS NULL
       OR "cst_cofins_saida_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'product_taxation: CST legado sem correspondencia em pis_cofins_situation';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "product_taxation" DROP CONSTRAINT IF EXISTS "product_taxation_pis_cofins_situation_id_pis_cofins_situation_id_fk";--> statement-breakpoint
ALTER TABLE "product_taxation" DROP COLUMN IF EXISTS "cst_pis_entrada";--> statement-breakpoint
ALTER TABLE "product_taxation" DROP COLUMN IF EXISTS "cst_pis_saida";--> statement-breakpoint
ALTER TABLE "product_taxation" DROP COLUMN IF EXISTS "cst_cofins_entrada";--> statement-breakpoint
ALTER TABLE "product_taxation" DROP COLUMN IF EXISTS "cst_cofins_saida";--> statement-breakpoint
ALTER TABLE "product_taxation" DROP COLUMN IF EXISTS "pis_cofins_situation_id";--> statement-breakpoint
ALTER TABLE "product_taxation" ALTER COLUMN "cst_pis_entrada_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_taxation" ALTER COLUMN "cst_pis_saida_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_taxation" ALTER COLUMN "cst_cofins_entrada_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "product_taxation" ALTER COLUMN "cst_cofins_saida_id" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_taxation" ADD CONSTRAINT "product_taxation_cst_pis_entrada_id_pis_cofins_situation_id_fk" FOREIGN KEY ("cst_pis_entrada_id") REFERENCES "public"."pis_cofins_situation"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_taxation" ADD CONSTRAINT "product_taxation_cst_pis_saida_id_pis_cofins_situation_id_fk" FOREIGN KEY ("cst_pis_saida_id") REFERENCES "public"."pis_cofins_situation"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_taxation" ADD CONSTRAINT "product_taxation_cst_cofins_entrada_id_pis_cofins_situation_id_fk" FOREIGN KEY ("cst_cofins_entrada_id") REFERENCES "public"."pis_cofins_situation"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_taxation" ADD CONSTRAINT "product_taxation_cst_cofins_saida_id_pis_cofins_situation_id_fk" FOREIGN KEY ("cst_cofins_saida_id") REFERENCES "public"."pis_cofins_situation"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
