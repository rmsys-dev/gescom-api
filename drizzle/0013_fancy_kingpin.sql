ALTER TABLE "cities" DROP CONSTRAINT "cities_ibs_municipal_tax_range";--> statement-breakpoint
ALTER TABLE "countries" DROP CONSTRAINT "countries_cbs_tax_range";--> statement-breakpoint
ALTER TABLE "countries" DROP CONSTRAINT "countries_is_tax_range";--> statement-breakpoint
ALTER TABLE "countries" DROP CONSTRAINT "countries_ibs_uf_tax_range";--> statement-breakpoint
ALTER TABLE "countries" DROP CONSTRAINT "countries_ibs_municipal_tax_range";--> statement-breakpoint
ALTER TABLE "states" DROP CONSTRAINT "states_borders_non_negative";--> statement-breakpoint
ALTER TABLE "states" DROP CONSTRAINT "states_internal_aliquot_range";--> statement-breakpoint
ALTER TABLE "states" DROP CONSTRAINT "states_interstate_aliquot_range";--> statement-breakpoint
ALTER TABLE "states" DROP CONSTRAINT "states_fcp_aliquot_range";--> statement-breakpoint
ALTER TABLE "states" DROP CONSTRAINT "states_ibs_uf_tax_range";--> statement-breakpoint
ALTER TABLE "states" DROP CONSTRAINT "states_ibs_municipal_tax_range";--> statement-breakpoint
ALTER TABLE "cities" ALTER COLUMN "ibs_municipal_tax" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "country_code" SET DATA TYPE varchar(4);--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "cbs_tax" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "is_tax" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "ibs_uf_tax" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "ibs_municipal_tax" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "states" ALTER COLUMN "internal_aliquot" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "states" ALTER COLUMN "interstate_aliquot" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "states" ALTER COLUMN "fcp_aliquot" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "states" ALTER COLUMN "ibs_uf_tax" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "states" ALTER COLUMN "ibs_municipal_tax" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "enterprises_members" ALTER COLUMN "sale_limit" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "enterprises_members" ALTER COLUMN "sale_limit" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "enterprises_members" ALTER COLUMN "receipt_limit_discount" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "enterprises_members" ALTER COLUMN "receipt_limit_discount" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "enterprises_members" ALTER COLUMN "comission_on_sight" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "enterprises_members" ALTER COLUMN "comission_on_sight" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "enterprises_members" ALTER COLUMN "comission_to_terms" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "enterprises_members" ALTER COLUMN "comission_to_terms" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "enterprises_members" ALTER COLUMN "comission_partial" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "enterprises_members" ALTER COLUMN "comission_partial" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "comission_on_sight_seller" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "comission_on_sight_seller" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "comission_to_terms_seller" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "comission_to_terms_seller" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "comission_partial_seller" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "comission_partial_seller" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "comission_on_sight_manager" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "comission_on_sight_manager" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "comission_to_terms_manager" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "comission_to_terms_manager" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "comission_partial_manager" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "product_subgroups" ALTER COLUMN "comission_partial_manager" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "percentage_discount" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "percentage_acresce" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "percentage_comission_seller" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "percentage_comission_seller" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "percentage_comission_manager" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "percentage_comission_manager" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "type_supplier_customers" ALTER COLUMN "icms_reduction" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "type_supplier_customers" ALTER COLUMN "customer_discount" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_ibs_municipal_tax_range" CHECK ("cities"."ibs_municipal_tax" >= 0 and "cities"."ibs_municipal_tax" <= 100.00);--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_cbs_tax_range" CHECK ("countries"."cbs_tax" >= 0 and "countries"."cbs_tax" <= 100.00);--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_is_tax_range" CHECK ("countries"."is_tax" >= 0 and "countries"."is_tax" <= 100.00);--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_ibs_uf_tax_range" CHECK ("countries"."ibs_uf_tax" >= 0 and "countries"."ibs_uf_tax" <= 100.00);--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_ibs_municipal_tax_range" CHECK ("countries"."ibs_municipal_tax" >= 0 and "countries"."ibs_municipal_tax" <= 100.00);--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_internal_aliquot_range" CHECK ("states"."internal_aliquot" >= 0 and "states"."internal_aliquot" <= 100.00);--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_interstate_aliquot_range" CHECK ("states"."interstate_aliquot" >= 0 and "states"."interstate_aliquot" <= 100.00);--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_fcp_aliquot_range" CHECK ("states"."fcp_aliquot" >= 0 and "states"."fcp_aliquot" <= 100.00);--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_ibs_uf_tax_range" CHECK ("states"."ibs_uf_tax" >= 0 and "states"."ibs_uf_tax" <= 100.00);--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_ibs_municipal_tax_range" CHECK ("states"."ibs_municipal_tax" >= 0 and "states"."ibs_municipal_tax" <= 100.00);