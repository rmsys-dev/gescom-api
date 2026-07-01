ALTER TABLE "members_address" RENAME TO "users_address";--> statement-breakpoint
ALTER TABLE "members_contact" RENAME TO "users_contact";--> statement-breakpoint
ALTER TABLE "members_financial_info" RENAME TO "users_financial_info";--> statement-breakpoint
ALTER TABLE "members_personal_info" RENAME TO "users_personal_info";--> statement-breakpoint
ALTER TABLE "members_relationships" RENAME TO "users_relationships";--> statement-breakpoint
ALTER TABLE "members_tax_infos" RENAME TO "users_tax_infos";--> statement-breakpoint
ALTER TABLE "users_address" RENAME COLUMN "member_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "users_contact" RENAME COLUMN "member_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "users_financial_info" RENAME COLUMN "member_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "users_personal_info" RENAME COLUMN "member_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "users_relationships" RENAME COLUMN "member_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "users_tax_infos" RENAME COLUMN "member_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT "members_financial_info_icms_reduction_range";--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT "members_financial_info_discount_limit_range";--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT "members_financial_info_request_amount_non_negative";--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT "members_financial_info_budget_price_non_negative";--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT "members_financial_info_prev_rate_range";--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT "members_financial_info_rat_tax_range";--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT "members_financial_info_reduction_rate_range";--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT "members_financial_info_senar_tax_range";--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT "members_financial_info_sale_discount_range";--> statement-breakpoint
ALTER TABLE "users_relationships" DROP CONSTRAINT "members_relationships_income_non_negative";--> statement-breakpoint
ALTER TABLE "users_relationships" DROP CONSTRAINT "members_relationships_profession_time_non_negative";--> statement-breakpoint
ALTER TABLE "users_relationships" DROP CONSTRAINT "members_relationships_rental_period_non_negative";--> statement-breakpoint
ALTER TABLE "users_address" DROP CONSTRAINT "members_address_member_id_enterprises_members_id_fk";
--> statement-breakpoint
ALTER TABLE "users_address" DROP CONSTRAINT "members_address_cep_id_ceps_id_fk";
--> statement-breakpoint
ALTER TABLE "users_contact" DROP CONSTRAINT "members_contact_member_id_enterprises_members_id_fk";
--> statement-breakpoint
ALTER TABLE "users_financial_info" DROP CONSTRAINT "members_financial_info_member_id_enterprises_members_id_fk";
--> statement-breakpoint
ALTER TABLE "users_personal_info" DROP CONSTRAINT "members_personal_info_member_id_enterprises_members_id_fk";
--> statement-breakpoint
ALTER TABLE "users_relationships" DROP CONSTRAINT "members_relationships_member_id_enterprises_members_id_fk";
--> statement-breakpoint
ALTER TABLE "users_tax_infos" DROP CONSTRAINT "members_tax_infos_member_id_enterprises_members_id_fk";
--> statement-breakpoint
DROP INDEX "members_address_principal_active_unique";--> statement-breakpoint
DROP INDEX "members_address_member_active_idx";--> statement-breakpoint
DROP INDEX "members_contact_principal_active_unique";--> statement-breakpoint
DROP INDEX "members_contact_member_active_idx";--> statement-breakpoint
DROP INDEX "members_financial_info_member_active_unique";--> statement-breakpoint
DROP INDEX "members_personal_info_member_active_unique";--> statement-breakpoint
DROP INDEX "members_relationships_member_active_unique";--> statement-breakpoint
DROP INDEX "members_tax_infos_member_active_unique";--> statement-breakpoint
ALTER TABLE "users_address" ADD CONSTRAINT "users_address_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_address" ADD CONSTRAINT "users_address_cep_id_ceps_id_fk" FOREIGN KEY ("cep_id") REFERENCES "public"."ceps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_contact" ADD CONSTRAINT "users_contact_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_personal_info" ADD CONSTRAINT "users_personal_info_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_relationships" ADD CONSTRAINT "users_relationships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_tax_infos" ADD CONSTRAINT "users_tax_infos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_address_principal_active_unique" ON "users_address" USING btree ("user_id") WHERE "users_address"."deleted_at" is null and "users_address"."adress_type" = 'PRINCIPAL';--> statement-breakpoint
CREATE INDEX "users_address_user_active_idx" ON "users_address" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_contact_principal_active_unique" ON "users_contact" USING btree ("user_id") WHERE "users_contact"."deleted_at" is null and "users_contact"."type" = 'PRINCIPAL';--> statement-breakpoint
CREATE INDEX "users_contact_user_active_idx" ON "users_contact" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_financial_info_user_active_unique" ON "users_financial_info" USING btree ("user_id") WHERE "users_financial_info"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_personal_info_user_active_unique" ON "users_personal_info" USING btree ("user_id") WHERE "users_personal_info"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_relationships_user_active_unique" ON "users_relationships" USING btree ("user_id") WHERE "users_relationships"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_tax_infos_user_active_unique" ON "users_tax_infos" USING btree ("user_id") WHERE "users_tax_infos"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_name_unique" ON "users" USING btree ("deleted_at","user_name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_registration_unique" ON "users" USING btree ("deleted_at","user_registration");--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_email_unique" ON "users" USING btree ("deleted_at","user_email");--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_icms_reduction_range" CHECK ("users_financial_info"."icms_reduction" >= 0 and "users_financial_info"."icms_reduction" <= 100);--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_discount_limit_range" CHECK ("users_financial_info"."discount_limit" >= 0 and "users_financial_info"."discount_limit" <= 100);--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_request_amount_non_negative" CHECK ("users_financial_info"."request_amount" >= 0);--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_budget_price_non_negative" CHECK ("users_financial_info"."budget_price" >= 0);--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_prev_rate_range" CHECK ("users_financial_info"."prev_rate" >= 0 and "users_financial_info"."prev_rate" <= 100);--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_rat_tax_range" CHECK ("users_financial_info"."rat_tax" >= 0 and "users_financial_info"."rat_tax" <= 100);--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_reduction_rate_range" CHECK ("users_financial_info"."reduction_rate" >= 0 and "users_financial_info"."reduction_rate" <= 100);--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_senar_tax_range" CHECK ("users_financial_info"."senar_tax" >= 0 and "users_financial_info"."senar_tax" <= 100);--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_sale_discount_range" CHECK ("users_financial_info"."sale_discount" >= 0 and "users_financial_info"."sale_discount" <= 100);--> statement-breakpoint
ALTER TABLE "users_relationships" ADD CONSTRAINT "users_relationships_income_non_negative" CHECK ("users_relationships"."income" >= 0);--> statement-breakpoint
ALTER TABLE "users_relationships" ADD CONSTRAINT "users_relationships_profession_time_non_negative" CHECK ("users_relationships"."profession_time" >= 0);--> statement-breakpoint
ALTER TABLE "users_relationships" ADD CONSTRAINT "users_relationships_rental_period_non_negative" CHECK ("users_relationships"."rental_period" is null or "users_relationships"."rental_period" >= 0);