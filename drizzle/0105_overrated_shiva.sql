ALTER TABLE "products_enterprises" DROP CONSTRAINT IF EXISTS "products_enterprises_product_pis_cofins_situation_id_pis_cofins_situation_id_fk";--> statement-breakpoint
ALTER TABLE "products_enterprises" DROP COLUMN IF EXISTS "product_pis_cofins_situation_id";
