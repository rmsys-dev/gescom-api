ALTER TYPE "public"."entity_type" ADD VALUE 'MEMBERS_PERSONAL_INFO' BEFORE 'ENTERPRISES';--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE 'MEMBERS_ADDRESS' BEFORE 'ENTERPRISES';--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE 'MEMBERS_CONTACT' BEFORE 'ENTERPRISES';--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE 'MEMBERS_RELATIONSHIPS' BEFORE 'ENTERPRISES';--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE 'MEMBERS_TAX_INFOS' BEFORE 'ENTERPRISES';--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE 'MEMBERS_FINANCIAL_INFO' BEFORE 'ENTERPRISES';--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE 'TYPE_SPED' BEFORE 'PRODUCTS_NCM';--> statement-breakpoint
ALTER TYPE "public"."member_class" ADD VALUE 'TRANSPORTADOR' BEFORE 'FORNECEDOR';--> statement-breakpoint
CREATE TABLE "type_sped" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"generate_inventory" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users_address" RENAME TO "members_address";--> statement-breakpoint
ALTER TABLE "users_contact" RENAME TO "members_contact";--> statement-breakpoint
ALTER TABLE "users_financial_info" RENAME TO "members_financial_info";--> statement-breakpoint
ALTER TABLE "users_personal_info" RENAME TO "members_personal_info";--> statement-breakpoint
ALTER TABLE "users_relationships" RENAME TO "members_relationships";--> statement-breakpoint
ALTER TABLE "users_tax_infos" RENAME TO "members_tax_infos";--> statement-breakpoint
ALTER TABLE "measurementUnits" RENAME TO "measurement_units";--> statement-breakpoint
ALTER TABLE "members_address" RENAME COLUMN "user_id" TO "member_id";--> statement-breakpoint
ALTER TABLE "members_contact" RENAME COLUMN "user_id" TO "member_id";--> statement-breakpoint
ALTER TABLE "members_financial_info" RENAME COLUMN "user_id" TO "member_id";--> statement-breakpoint
ALTER TABLE "members_personal_info" RENAME COLUMN "user_id" TO "member_id";--> statement-breakpoint
ALTER TABLE "members_tax_infos" RENAME COLUMN "user_id" TO "member_id";--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP CONSTRAINT "users_financial_info_user_id_unique";--> statement-breakpoint
ALTER TABLE "members_personal_info" DROP CONSTRAINT "users_personal_info_user_id_unique";--> statement-breakpoint
ALTER TABLE "members_relationships" DROP CONSTRAINT "users_relationships_user_id_unique";--> statement-breakpoint
ALTER TABLE "members_tax_infos" DROP CONSTRAINT "users_tax_infos_user_id_unique";--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP CONSTRAINT "users_financial_info_icms_reduction_range";--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP CONSTRAINT "users_financial_info_discount_limit_range";--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP CONSTRAINT "users_financial_info_request_amount_non_negative";--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP CONSTRAINT "users_financial_info_budget_price_non_negative";--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP CONSTRAINT "users_financial_info_prev_rate_range";--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP CONSTRAINT "users_financial_info_rat_tax_range";--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP CONSTRAINT "users_financial_info_reduction_rate_range";--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP CONSTRAINT "users_financial_info_senar_tax_range";--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP CONSTRAINT "users_financial_info_sale_discount_range";--> statement-breakpoint
ALTER TABLE "members_relationships" DROP CONSTRAINT "users_relationships_income_non_negative";--> statement-breakpoint
ALTER TABLE "members_relationships" DROP CONSTRAINT "users_relationships_profession_time_non_negative";--> statement-breakpoint
ALTER TABLE "members_relationships" DROP CONSTRAINT "users_relationships_rental_period_non_negative";--> statement-breakpoint
ALTER TABLE "members_address" DROP CONSTRAINT "users_address_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "members_address" DROP CONSTRAINT "users_address_cep_id_ceps_id_fk";
--> statement-breakpoint
ALTER TABLE "members_address" DROP CONSTRAINT "users_address_country_id_countries_id_fk";
--> statement-breakpoint
ALTER TABLE "members_address" DROP CONSTRAINT "users_address_state_id_states_id_fk";
--> statement-breakpoint
ALTER TABLE "members_address" DROP CONSTRAINT "users_address_city_id_cities_id_fk";
--> statement-breakpoint
ALTER TABLE "members_contact" DROP CONSTRAINT "users_contact_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP CONSTRAINT "users_financial_info_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "members_personal_info" DROP CONSTRAINT "users_personal_info_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "members_relationships" DROP CONSTRAINT "users_relationships_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "members_tax_infos" DROP CONSTRAINT "users_tax_infos_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "products_enterprises" DROP CONSTRAINT "products_enterprises_measurement_unit_id_measurementUnits_id_fk";
--> statement-breakpoint
ALTER TABLE "sales_items" DROP CONSTRAINT "sales_items_unit_id_measurementUnits_id_fk";
--> statement-breakpoint
ALTER TABLE "members_financial_info" ALTER COLUMN "credit_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."credit_type";--> statement-breakpoint
CREATE TYPE "public"."credit_type" AS ENUM('MENSAL', 'GERAL');--> statement-breakpoint
ALTER TABLE "members_financial_info" ALTER COLUMN "credit_type" SET DATA TYPE "public"."credit_type" USING "credit_type"::"public"."credit_type";--> statement-breakpoint
DROP INDEX "users_address_principal_active_unique";--> statement-breakpoint
DROP INDEX "users_address_user_active_idx";--> statement-breakpoint
DROP INDEX "users_contact_principal_active_unique";--> statement-breakpoint
DROP INDEX "users_contact_user_active_idx";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "bar_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "members_relationships" ADD COLUMN "member_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "product_brands" ADD COLUMN "enterprises_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "product_groups" ADD COLUMN "enterprises_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "product_subgroups" ADD COLUMN "enterprises_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "products_types" ADD COLUMN "manufacturing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products_types" ADD COLUMN "sales" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products_types" ADD COLUMN "type_sped_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_sectors" ADD COLUMN "enterprises_id" uuid NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "type_sped_type_active_unique" ON "type_sped" USING btree ("type");--> statement-breakpoint
ALTER TABLE "members_address" ADD CONSTRAINT "members_address_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_address" ADD CONSTRAINT "members_address_cep_id_ceps_id_fk" FOREIGN KEY ("cep_id") REFERENCES "public"."ceps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_address" ADD CONSTRAINT "members_address_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_address" ADD CONSTRAINT "members_address_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_address" ADD CONSTRAINT "members_address_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_contact" ADD CONSTRAINT "members_contact_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_financial_info" ADD CONSTRAINT "members_financial_info_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_personal_info" ADD CONSTRAINT "members_personal_info_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_relationships" ADD CONSTRAINT "members_relationships_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_tax_infos" ADD CONSTRAINT "members_tax_infos_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_brands" ADD CONSTRAINT "product_brands_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_groups" ADD CONSTRAINT "product_groups_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_subgroups" ADD CONSTRAINT "product_subgroups_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_types" ADD CONSTRAINT "products_types_type_sped_id_type_sped_id_fk" FOREIGN KEY ("type_sped_id") REFERENCES "public"."type_sped"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_measurement_unit_id_measurement_units_id_fk" FOREIGN KEY ("measurement_unit_id") REFERENCES "public"."measurement_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_unit_id_measurement_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."measurement_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_sectors" ADD CONSTRAINT "stock_sectors_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "members_address_principal_active_unique" ON "members_address" USING btree ("member_id") WHERE "members_address"."deleted_at" is null and "members_address"."adress_type" = 'PRINCIPAL';--> statement-breakpoint
CREATE INDEX "members_address_member_active_idx" ON "members_address" USING btree ("member_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "members_contact_principal_active_unique" ON "members_contact" USING btree ("member_id") WHERE "members_contact"."deleted_at" is null and "members_contact"."type" = 'PRINCIPAL';--> statement-breakpoint
CREATE INDEX "members_contact_member_active_idx" ON "members_contact" USING btree ("member_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_brands_enterprise_description_unique" ON "product_brands" USING btree ("enterprises_id","description");--> statement-breakpoint
CREATE INDEX "product_brands_enterprise_idx" ON "product_brands" USING btree ("enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_groups_enterprise_description_unique" ON "product_groups" USING btree ("enterprises_id","description");--> statement-breakpoint
CREATE INDEX "product_groups_enterprise_idx" ON "product_groups" USING btree ("enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_subgroups_enterprise_description_unique" ON "product_subgroups" USING btree ("enterprises_id","description");--> statement-breakpoint
CREATE INDEX "product_subgroups_enterprise_idx" ON "product_subgroups" USING btree ("enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_sectors_enterprise_description_unique" ON "stock_sectors" USING btree ("enterprises_id","description");--> statement-breakpoint
CREATE INDEX "stock_sectors_enterprise_idx" ON "stock_sectors" USING btree ("enterprises_id");--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP COLUMN "low";--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP COLUMN "do_st";--> statement-breakpoint
ALTER TABLE "members_relationships" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "members_financial_info" ADD CONSTRAINT "members_financial_info_member_id_unique" UNIQUE("member_id");--> statement-breakpoint
ALTER TABLE "members_personal_info" ADD CONSTRAINT "members_personal_info_member_id_unique" UNIQUE("member_id");--> statement-breakpoint
ALTER TABLE "members_relationships" ADD CONSTRAINT "members_relationships_member_id_unique" UNIQUE("member_id");--> statement-breakpoint
ALTER TABLE "members_tax_infos" ADD CONSTRAINT "members_tax_infos_member_id_unique" UNIQUE("member_id");--> statement-breakpoint
ALTER TABLE "members_financial_info" ADD CONSTRAINT "members_financial_info_icms_reduction_range" CHECK ("members_financial_info"."icms_reduction" >= 0 and "members_financial_info"."icms_reduction" <= 100);--> statement-breakpoint
ALTER TABLE "members_financial_info" ADD CONSTRAINT "members_financial_info_discount_limit_range" CHECK ("members_financial_info"."discount_limit" >= 0 and "members_financial_info"."discount_limit" <= 100);--> statement-breakpoint
ALTER TABLE "members_financial_info" ADD CONSTRAINT "members_financial_info_request_amount_non_negative" CHECK ("members_financial_info"."request_amount" >= 0);--> statement-breakpoint
ALTER TABLE "members_financial_info" ADD CONSTRAINT "members_financial_info_budget_price_non_negative" CHECK ("members_financial_info"."budget_price" >= 0);--> statement-breakpoint
ALTER TABLE "members_financial_info" ADD CONSTRAINT "members_financial_info_prev_rate_range" CHECK ("members_financial_info"."prev_rate" >= 0 and "members_financial_info"."prev_rate" <= 100);--> statement-breakpoint
ALTER TABLE "members_financial_info" ADD CONSTRAINT "members_financial_info_rat_tax_range" CHECK ("members_financial_info"."rat_tax" >= 0 and "members_financial_info"."rat_tax" <= 100);--> statement-breakpoint
ALTER TABLE "members_financial_info" ADD CONSTRAINT "members_financial_info_reduction_rate_range" CHECK ("members_financial_info"."reduction_rate" >= 0 and "members_financial_info"."reduction_rate" <= 100);--> statement-breakpoint
ALTER TABLE "members_financial_info" ADD CONSTRAINT "members_financial_info_senar_tax_range" CHECK ("members_financial_info"."senar_tax" >= 0 and "members_financial_info"."senar_tax" <= 100);--> statement-breakpoint
ALTER TABLE "members_financial_info" ADD CONSTRAINT "members_financial_info_sale_discount_range" CHECK ("members_financial_info"."sale_discount" >= 0 and "members_financial_info"."sale_discount" <= 100);--> statement-breakpoint
ALTER TABLE "members_relationships" ADD CONSTRAINT "members_relationships_income_non_negative" CHECK ("members_relationships"."income" >= 0);--> statement-breakpoint
ALTER TABLE "members_relationships" ADD CONSTRAINT "members_relationships_profession_time_non_negative" CHECK ("members_relationships"."profession_time" >= 0);--> statement-breakpoint
ALTER TABLE "members_relationships" ADD CONSTRAINT "members_relationships_rental_period_non_negative" CHECK ("members_relationships"."rental_period" is null or "members_relationships"."rental_period" >= 0);