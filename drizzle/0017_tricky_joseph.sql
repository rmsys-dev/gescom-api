ALTER TABLE "product_taxation" ADD COLUMN IF NOT EXISTS "pis_cofins_situation_id" uuid;--> statement-breakpoint
UPDATE "product_taxation" pt
SET "pis_cofins_situation_id" = pcs.id
FROM "pis_cofins_situation" pcs
WHERE pt."pis_cofins_situation_id" IS NULL
  AND pcs.cst = pt."cst_pis_saida";--> statement-breakpoint
UPDATE "product_taxation" pt
SET "pis_cofins_situation_id" = (
  SELECT pcs.id
  FROM "pis_cofins_situation" pcs
  ORDER BY pcs.cst
  LIMIT 1
)
WHERE pt."pis_cofins_situation_id" IS NULL;--> statement-breakpoint
ALTER TABLE "product_taxation" ALTER COLUMN "pis_cofins_situation_id" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "product_taxation" ADD CONSTRAINT "product_taxation_pis_cofins_situation_id_pis_cofins_situation_id_fk" FOREIGN KEY ("pis_cofins_situation_id") REFERENCES "public"."pis_cofins_situation"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
