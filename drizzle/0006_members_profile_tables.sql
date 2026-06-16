CREATE TABLE IF NOT EXISTS "members_personal_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"gender" "gender",
	"birth_date" date,
	"place_of_birth" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "members_personal_info_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "members_address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"cep_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"state_id" uuid NOT NULL,
	"city_id" uuid NOT NULL,
	"adress_type" "adress_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "members_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"whatsapp" varchar(20),
	"type" "type_user_contact" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "members_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marital_status" "marital_status",
	"spouse_name" varchar(255),
	"housing_type" "housing_type",
	"rental_period" integer,
	"mother_name" varchar(255),
	"father_name" varchar(255),
	"profession" varchar(255),
	"profession_description" varchar(255),
	"profession_time" integer,
	"income" numeric(10, 2),
	"link_with_seller" boolean,
	"to_warm_up" boolean,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "members_relationships_member_id_unique" UNIQUE("member_id"),
	CONSTRAINT "members_relationships_income_non_negative" CHECK ("members_relationships"."income" >= 0),
	CONSTRAINT "members_relationships_profession_time_non_negative" CHECK ("members_relationships"."profession_time" >= 0),
	CONSTRAINT "members_relationships_rental_period_non_negative" CHECK ("members_relationships"."rental_period" is null or "members_relationships"."rental_period" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "members_tax_infos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"renegotiation" boolean,
	"spc_registration" varchar(255),
	"spc_registry_date" date,
	"state_registration" varchar(255),
	"municipal_registration" varchar(255),
	"suframa_registration" varchar(255),
	"user_legal_name" varchar(255),
	"r3_code" integer,
	"sefaz_date" date,
	"government_entity" varchar(255),
	"benefit_code" varchar(255),
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "members_tax_infos_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "members_financial_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"icms_reduction" numeric(10, 2),
	"discount_limit" numeric(10, 2),
	"discout_arrangement" varchar(255),
	"credit_type" "credit_type",
	"request_amount" numeric(10, 2),
	"budget_price" numeric(10, 2),
	"tax_regime" varchar(255),
	"purchase_order" boolean,
	"prev_rate" numeric(10, 2),
	"rat_tax" numeric(10, 2),
	"reduction_rate" numeric(10, 2),
	"senar_tax" numeric(10, 2),
	"sale_discount" numeric(10, 2),
	"send_nf" boolean,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "members_financial_info_member_id_unique" UNIQUE("member_id"),
	CONSTRAINT "members_financial_info_icms_reduction_range" CHECK ("members_financial_info"."icms_reduction" >= 0 and "members_financial_info"."icms_reduction" <= 100),
	CONSTRAINT "members_financial_info_discount_limit_range" CHECK ("members_financial_info"."discount_limit" >= 0 and "members_financial_info"."discount_limit" <= 100),
	CONSTRAINT "members_financial_info_request_amount_non_negative" CHECK ("members_financial_info"."request_amount" >= 0),
	CONSTRAINT "members_financial_info_budget_price_non_negative" CHECK ("members_financial_info"."budget_price" >= 0),
	CONSTRAINT "members_financial_info_prev_rate_range" CHECK ("members_financial_info"."prev_rate" >= 0 and "members_financial_info"."prev_rate" <= 100),
	CONSTRAINT "members_financial_info_rat_tax_range" CHECK ("members_financial_info"."rat_tax" >= 0 and "members_financial_info"."rat_tax" <= 100),
	CONSTRAINT "members_financial_info_reduction_rate_range" CHECK ("members_financial_info"."reduction_rate" >= 0 and "members_financial_info"."reduction_rate" <= 100),
	CONSTRAINT "members_financial_info_senar_tax_range" CHECK ("members_financial_info"."senar_tax" >= 0 and "members_financial_info"."senar_tax" <= 100),
	CONSTRAINT "members_financial_info_sale_discount_range" CHECK ("members_financial_info"."sale_discount" >= 0 and "members_financial_info"."sale_discount" <= 100)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members_personal_info" ADD CONSTRAINT "members_personal_info_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members_address" ADD CONSTRAINT "members_address_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members_address" ADD CONSTRAINT "members_address_cep_id_ceps_id_fk" FOREIGN KEY ("cep_id") REFERENCES "public"."ceps"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members_address" ADD CONSTRAINT "members_address_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members_address" ADD CONSTRAINT "members_address_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members_address" ADD CONSTRAINT "members_address_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members_contact" ADD CONSTRAINT "members_contact_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members_relationships" ADD CONSTRAINT "members_relationships_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members_tax_infos" ADD CONSTRAINT "members_tax_infos_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "members_financial_info" ADD CONSTRAINT "members_financial_info_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "members_address_principal_active_unique" ON "members_address" USING btree ("member_id") WHERE "members_address"."deleted_at" is null and "members_address"."adress_type" = 'PRINCIPAL';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "members_address_member_active_idx" ON "members_address" USING btree ("member_id","deleted_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "members_contact_principal_active_unique" ON "members_contact" USING btree ("member_id") WHERE "members_contact"."deleted_at" is null and "members_contact"."type" = 'PRINCIPAL';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "members_contact_member_active_idx" ON "members_contact" USING btree ("member_id","deleted_at");
--> statement-breakpoint
DROP TABLE IF EXISTS "users_financial_info";
--> statement-breakpoint
DROP TABLE IF EXISTS "users_tax_infos";
--> statement-breakpoint
DROP TABLE IF EXISTS "users_relationships";
--> statement-breakpoint
DROP TABLE IF EXISTS "users_contact";
--> statement-breakpoint
DROP TABLE IF EXISTS "users_address";
--> statement-breakpoint
DROP TABLE IF EXISTS "users_personal_info";
