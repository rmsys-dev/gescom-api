CREATE TYPE "public"."adress_type" AS ENUM('RESIDENCIAL', 'COMERCIAL', 'ENTREGA', 'COBRANCA', 'FATURAMENTO', 'SECUNDARIO', 'PRINCIPAL', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."auth_event" AS ENUM('LOGIN_SUCCESS', 'LOGIN_FAILED_PASSWORD', 'LOGIN_FAILED_USER', 'LOGIN_BLOCKED', 'LOGOUT', 'REFRESH', 'REFRESH_REUSE', 'SWITCH_ENTERPRISE', 'RATE_LIMITED', 'PERMISSION_DENIED', 'SIGNUP', 'SIGNUP_FAILED', 'FIRST_ACCESS_REQUESTED', 'FIRST_ACCESS_VERIFIED', 'FIRST_ACCESS_FAILED', 'INVITE_CREATED', 'INVITE_ACCEPTED', 'INVITE_DECLINED', 'INVITE_EXPIRED', 'CODE_RATE_LIMITED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_VERIFIED', 'PASSWORD_RESET_FAILED', 'PASSWORD_RESET_RATE_LIMITED');--> statement-breakpoint
CREATE TYPE "public"."budget_closure_situation" AS ENUM('ABERTO', 'PARCIAL', 'FECHADO');--> statement-breakpoint
CREATE TYPE "public"."budget_conversion_kind" AS ENUM('PARCIAL', 'TOTAL');--> statement-breakpoint
CREATE TYPE "public"."credit_type" AS ENUM('CREDITO', 'DEBITO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('VENDA', 'ORCAMENTO');--> statement-breakpoint
CREATE TYPE "public"."entity_audit_action" AS ENUM('CREATE', 'UPDATE', 'SOFT_DELETE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('USERS', 'USERS_PERSONAL_INFO', 'USERS_ADDRESS', 'USERS_CONTACT', 'USERS_RELATIONSHIPS', 'USERS_TAX_INFOS', 'USERS_FINANCIAL_INFO', 'ENTERPRISES', 'ENTERPRISES_ADDRESS', 'ENTERPRISES_MEMBERS', 'MEMBERS_DEPARTMENTS', 'MEMBER_PERMISSIONS_DEFAULT', 'MEMBER_EXTRA_PERMISSIONS', 'DEPARTMENTS', 'COUNTRIES', 'STATES', 'CITIES', 'CEPS', 'PRODUCTS', 'PRODUCTS_ENTERPRISES', 'MEASUREMENT_UNITS', 'PRODUCT_TYPES', 'PRODUCTS_NCM', 'PRODUCTS_CEST', 'PRODUCTS_ANP', 'PRODUCTS_NBS', 'PRODUCT_GROUPS', 'PRODUCT_SUBGROUPS', 'PRODUCT_BRANDS', 'PIS_COFINS_SITUATION', 'ICMS_TAXATION', 'PRODUCT_PRICES', 'PROMOTIONAL_PRICES', 'PRODUCT_TAXATION', 'PRODUCT_APPLICATIONS', 'STOCK_SECTORS', 'STOCK_LOCATIONS', 'STOCK_BATCHES', 'STOCK_BATCH_BALANCES', 'STOCK_SECTORS_RENTAL', 'STOCK_MIN_MAX', 'STOCK_MOVEMENTS', 'PAYMENT_TYPES', 'SALES', 'SALES_RETURNS');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('FEMININO', 'MASCULINO, NÃO_INFORMADO');--> statement-breakpoint
CREATE TYPE "public"."housing_type" AS ENUM('ALUGADO', 'PRÓPRIO', 'DOADO', 'EMPRESTADO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."invite_channel" AS ENUM('EMAIL', 'SMS', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."invite_purpose" AS ENUM('FIRST_ACCESS', 'MEMBERSHIP_ACCEPT');--> statement-breakpoint
CREATE TYPE "public"."login_type" AS ENUM('EMAIL', 'CPF');--> statement-breakpoint
CREATE TYPE "public"."marital_status" AS ENUM('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL');--> statement-breakpoint
CREATE TYPE "public"."member_class" AS ENUM('ADMINISTRADOR', 'GERENTE', 'COLABORADOR', 'CLIENTE', 'FORNECEDOR', 'PARCEIRO', 'SOCIO', 'INVESTIDOR', 'AUDITOR', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."pis_cofins_type" AS ENUM('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."sale_return_kind" AS ENUM('PARCIAL', 'TOTAL');--> statement-breakpoint
CREATE TYPE "public"."sale_return_situation" AS ENUM('SEM_DEVOLUCAO', 'PARCIAL', 'TOTAL');--> statement-breakpoint
CREATE TYPE "public"."sale_return_status" AS ENUM('ABERTA', 'FINALIZADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('ABERTA', 'FINALIZADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."sale_type" AS ENUM('VENDA', 'ORCAMENTO', 'DEVOLUCAO', 'CANCELAMENTO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('ATIVO', 'INATIVO', 'BLOQUEADO', 'PENDENTE', 'ESPECIAL', 'COBRANCA', 'NAO_VENDER');--> statement-breakpoint
CREATE TYPE "public"."status_permission" AS ENUM('ALLOW', 'DENIED');--> statement-breakpoint
CREATE TYPE "public"."stock_batch_status" AS ENUM('ATIVO', 'BLOQUEADO', 'ESGOTADO');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE', 'PERDA', 'VENDA', 'COMPRA', 'DEVOLUCAO', 'CANCELAMENTO', 'OUTROS');--> statement-breakpoint
CREATE TYPE "public"."type_user_contact" AS ENUM('SECUNDARIO', 'PRINCIPAL', 'TRABALHO', 'RESIDENCIAL', 'COMERCIAL', 'CONJUGE', 'FILHO', 'PAI', 'MAE', 'AMIGO', 'OUTRO');--> statement-breakpoint
CREATE TABLE "ceps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cep_number" varchar(8) NOT NULL,
	"address" varchar(255) NOT NULL,
	"number" varchar(255) NOT NULL,
	"complement" varchar(255),
	"neighborhood" varchar(255) NOT NULL,
	"city_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ibge_code" integer NOT NULL,
	"city_name" varchar(255) NOT NULL,
	"city_code" varchar(2) NOT NULL,
	"city_digit" integer NOT NULL,
	"ibs_municipal_tax" numeric(10, 2) NOT NULL,
	"state_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "cities_ibs_municipal_tax_range" CHECK ("cities"."ibs_municipal_tax" >= 0 and "cities"."ibs_municipal_tax" <= 100)
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"country_name" varchar(255) NOT NULL,
	"cbs_tax" numeric(10, 2) NOT NULL,
	"is_tax" numeric(10, 2) NOT NULL,
	"ibs_uf_tax" numeric(10, 2) NOT NULL,
	"ibs_municipal_tax" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "countries_cbs_tax_range" CHECK ("countries"."cbs_tax" >= 0 and "countries"."cbs_tax" <= 100),
	CONSTRAINT "countries_is_tax_range" CHECK ("countries"."is_tax" >= 0 and "countries"."is_tax" <= 100),
	CONSTRAINT "countries_ibs_uf_tax_range" CHECK ("countries"."ibs_uf_tax" >= 0 and "countries"."ibs_uf_tax" <= 100),
	CONSTRAINT "countries_ibs_municipal_tax_range" CHECK ("countries"."ibs_municipal_tax" >= 0 and "countries"."ibs_municipal_tax" <= 100)
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"acronym" varchar(2) NOT NULL,
	"description" varchar(255) NOT NULL,
	"internal_aliquot" numeric(10, 2) NOT NULL,
	"interstate_aliquot" numeric(10, 2) NOT NULL,
	"fcp_aliquot" numeric(10, 2) NOT NULL,
	"borders" integer NOT NULL,
	"embed_tax" boolean NOT NULL,
	"ibs_uf_tax" numeric(10, 2) NOT NULL,
	"ibs_municipal_tax" numeric(10, 2) NOT NULL,
	"country_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "states_internal_aliquot_range" CHECK ("states"."internal_aliquot" >= 0 and "states"."internal_aliquot" <= 100),
	CONSTRAINT "states_interstate_aliquot_range" CHECK ("states"."interstate_aliquot" >= 0 and "states"."interstate_aliquot" <= 100),
	CONSTRAINT "states_fcp_aliquot_range" CHECK ("states"."fcp_aliquot" >= 0 and "states"."fcp_aliquot" <= 100),
	CONSTRAINT "states_borders_non_negative" CHECK ("states"."borders" >= 0),
	CONSTRAINT "states_ibs_uf_tax_range" CHECK ("states"."ibs_uf_tax" >= 0 and "states"."ibs_uf_tax" <= 100),
	CONSTRAINT "states_ibs_municipal_tax_range" CHECK ("states"."ibs_municipal_tax" >= 0 and "states"."ibs_municipal_tax" <= 100)
);
--> statement-breakpoint
CREATE TABLE "department_default_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"permission" varchar(255) NOT NULL,
	"status" "status_permission" DEFAULT 'ALLOW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(255),
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"permission_reference" varchar(255) NOT NULL,
	"registered_on" date DEFAULT CURRENT_DATE NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "enterprises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"registration" varchar(14) NOT NULL,
	"legal_name" varchar(255) NOT NULL,
	"trade_name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"whatsapp" varchar(20),
	"registered_on" date DEFAULT CURRENT_DATE NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "enterprises_address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
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
CREATE TABLE "enterprises_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"user_id" uuid NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"class" "member_class" NOT NULL,
	"observations" varchar(500),
	"included_by" uuid NOT NULL,
	"registered_on" date DEFAULT CURRENT_DATE NOT NULL,
	"approved_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "member_extra_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission" varchar(255) NOT NULL,
	"status" "status_permission" DEFAULT 'ALLOW' NOT NULL,
	"member_department_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "member_permissions_default" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"permission" varchar(255) NOT NULL,
	"status" "status_permission" DEFAULT 'ALLOW' NOT NULL,
	"member_department_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "members_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"member_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"main_department" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "invite_purpose" NOT NULL,
	"member_id" uuid,
	"code_hash" varchar(255) NOT NULL,
	"channel" "invite_channel" NOT NULL,
	"sent_to" varchar(255) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"expires_at" date NOT NULL,
	"consumed_at" date,
	"ip_address" varchar(64),
	"user_agent" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_invitations_attempts_non_negative" CHECK ("user_invitations"."attempts" >= 0),
	CONSTRAINT "user_invitations_attempts_le_max" CHECK ("user_invitations"."attempts" <= "user_invitations"."max_attempts"),
	CONSTRAINT "user_invitations_membership_member_required" CHECK ("user_invitations"."purpose" <> 'MEMBERSHIP_ACCEPT'::invite_purpose or "user_invitations"."member_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "enterprises_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"sequence" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"user_registration" varchar(14) NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"user_phone" varchar(20) NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"registered_on" date DEFAULT CURRENT_DATE NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users_address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
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
CREATE TABLE "users_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"whatsapp" varchar(20),
	"type" "type_user_contact" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users_financial_info" (
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
	"low" boolean,
	"sale_discount" numeric(10, 2),
	"do_st" boolean,
	"send_nf" boolean,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_financial_info_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "users_financial_info_icms_reduction_range" CHECK ("users_financial_info"."icms_reduction" >= 0 and "users_financial_info"."icms_reduction" <= 100),
	CONSTRAINT "users_financial_info_discount_limit_range" CHECK ("users_financial_info"."discount_limit" >= 0 and "users_financial_info"."discount_limit" <= 100),
	CONSTRAINT "users_financial_info_request_amount_non_negative" CHECK ("users_financial_info"."request_amount" >= 0),
	CONSTRAINT "users_financial_info_budget_price_non_negative" CHECK ("users_financial_info"."budget_price" >= 0),
	CONSTRAINT "users_financial_info_prev_rate_range" CHECK ("users_financial_info"."prev_rate" >= 0 and "users_financial_info"."prev_rate" <= 100),
	CONSTRAINT "users_financial_info_rat_tax_range" CHECK ("users_financial_info"."rat_tax" >= 0 and "users_financial_info"."rat_tax" <= 100),
	CONSTRAINT "users_financial_info_reduction_rate_range" CHECK ("users_financial_info"."reduction_rate" >= 0 and "users_financial_info"."reduction_rate" <= 100),
	CONSTRAINT "users_financial_info_senar_tax_range" CHECK ("users_financial_info"."senar_tax" >= 0 and "users_financial_info"."senar_tax" <= 100),
	CONSTRAINT "users_financial_info_sale_discount_range" CHECK ("users_financial_info"."sale_discount" >= 0 and "users_financial_info"."sale_discount" <= 100)
);
--> statement-breakpoint
CREATE TABLE "users_personal_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gender" "gender",
	"birth_date" date,
	"place_of_birth" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_personal_info_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users_relationships" (
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
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_relationships_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "users_relationships_income_non_negative" CHECK ("users_relationships"."income" >= 0),
	CONSTRAINT "users_relationships_profession_time_non_negative" CHECK ("users_relationships"."profession_time" >= 0),
	CONSTRAINT "users_relationships_rental_period_non_negative" CHECK ("users_relationships"."rental_period" is null or "users_relationships"."rental_period" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users_tax_infos" (
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
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_tax_infos_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"channel" "invite_channel" NOT NULL,
	"sent_to" varchar(255) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip_address" varchar(64),
	"user_agent" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "password_reset_tokens_attempts_non_negative" CHECK ("password_reset_tokens"."attempts" >= 0),
	CONSTRAINT "password_reset_tokens_attempts_le_max" CHECK ("password_reset_tokens"."attempts" <= "password_reset_tokens"."max_attempts")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"jti" uuid NOT NULL,
	"member_id" uuid,
	"refresh_token_hash" varchar(255) NOT NULL,
	"user_agent" varchar(500),
	"ip_address" varchar(64),
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" varchar(64),
	"replaced_by_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "user_sessions_member_required" CHECK ("user_sessions"."member_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "users_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"login" varchar(255) NOT NULL,
	"login_type" "login_type" NOT NULL,
	"login_normalized" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"password_updated_at" timestamp with time zone,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_failed_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_credentials_failed_attempts_non_negative" CHECK ("users_credentials"."failed_attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "icms_taxation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"icms" varchar(255) NOT NULL,
	"icms_rate" numeric(14, 2),
	"simples_icms_rate" numeric(14, 2),
	"description" varchar(255) NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"alterado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "measurementUnits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"compatible" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pis_cofins_situation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cst" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"type" "pis_cofins_type" NOT NULL,
	"framing" integer NOT NULL,
	"pis_rate" numeric(14, 4),
	"cofins_rate" numeric(14, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price" numeric(14, 4) NOT NULL,
	"average_cost" numeric(14, 4),
	"price_cost" numeric(14, 4),
	"products_enterprises_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_application" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(255) NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(255) NOT NULL,
	"profit_margin" numeric(14, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_subgroups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_taxation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cst_pis_entrada" varchar(255) NOT NULL,
	"cst_pis_saida" varchar(255) NOT NULL,
	"cst_cofins_entrada" varchar(255) NOT NULL,
	"cst_cofins_saida" varchar(255) NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"icms_taxation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"description" varchar(255) NOT NULL,
	"bar_code" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products_anp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anp" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"alterado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products_cest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cest" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"products_ncm_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"alterado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products_enterprises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" integer,
	"description" varchar(255) NOT NULL,
	"origin" varchar(255),
	"manufacturer" varchar(255),
	"product_id" uuid NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"measurement_unit_id" uuid NOT NULL,
	"product_type_id" uuid NOT NULL,
	"product_ncm_id" uuid,
	"product_cest_id" uuid,
	"product_anp_id" uuid,
	"product_nbs_id" uuid,
	"product_group_id" uuid NOT NULL,
	"product_subgroup_id" uuid NOT NULL,
	"product_brand_id" uuid NOT NULL,
	"controls_batch" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products_nbs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lc116_item" varchar(32) NOT NULL,
	"lc116_description" varchar(255) NOT NULL,
	"nbs" varchar(32) NOT NULL,
	"description" varchar(255) NOT NULL,
	"ps_onerosa" varchar(1) NOT NULL,
	"adq_exterior" varchar(1) NOT NULL,
	"indop" varchar(64) NOT NULL,
	"c_class_trib" varchar(64) NOT NULL,
	"c_class_trib_name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products_ncm" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ncm" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "promotional_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(255),
	"price" numeric(14, 4) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(255) NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"user_legal_name" varchar(255) NOT NULL,
	"member_id" uuid,
	"type" "sale_type" NOT NULL,
	"sub_total" numeric(14, 2) NOT NULL,
	"percentage_discount" numeric(13, 10),
	"discount_value_items" numeric(14, 2),
	"value_discount_financial" numeric(14, 2),
	"percentage_acresce" numeric(13, 10),
	"value_acresce_items" numeric(14, 2),
	"value_acresce_financial" numeric(14, 2),
	"value_pie" numeric(14, 2),
	"value_service" numeric(14, 2),
	"value_liquid" numeric(14, 2),
	"status" "sale_status" NOT NULL,
	"return_situation" "sale_return_situation" DEFAULT 'SEM_DEVOLUCAO' NOT NULL,
	"budget_closure_situation" "budget_closure_situation" DEFAULT 'ABERTO' NOT NULL,
	"source_budget_sale_id" uuid,
	"completedion_date" date,
	"enterprises_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales_budget_conversion_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversion_id" uuid NOT NULL,
	"budget_item_id" uuid NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_budget_conversion_items_quantity_positive" CHECK ("sales_budget_conversion_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales_budget_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"budget_sale_id" uuid NOT NULL,
	"generated_sale_id" uuid NOT NULL,
	"closure_kind" "budget_conversion_kind" NOT NULL,
	"user_id" uuid NOT NULL,
	"user_legal_name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_dues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"value_installment" numeric(14, 2) NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"sales_payment_id" uuid NOT NULL,
	"sales_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"value_unit" numeric(14, 4) NOT NULL,
	"value_discount" numeric(14, 4) NOT NULL,
	"value_acresce" numeric(14, 4) NOT NULL,
	"value_total" numeric(14, 4) NOT NULL,
	"sales_id" uuid NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"product_type_id" uuid NOT NULL,
	"stock_sector_id" uuid,
	"stock_location_id" uuid,
	"stock_batch_id" uuid,
	"quantity_returned" numeric(14, 4) DEFAULT '0' NOT NULL,
	"quantity_converted" numeric(14, 4) DEFAULT '0' NOT NULL,
	"source_budget_item_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "sales_items_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "sales_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"value_total" numeric(14, 2) NOT NULL,
	"payment_type_id" uuid NOT NULL,
	"sales_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales_return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_return_id" uuid NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"value_unit" numeric(14, 4) NOT NULL,
	"value_total" numeric(14, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "sales_return_items_quantity_positive" CHECK ("sales_return_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_number" integer NOT NULL,
	"sale_id" uuid NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "sale_return_status" DEFAULT 'ABERTA' NOT NULL,
	"kind" "sale_return_kind" NOT NULL,
	"value_total" numeric(14, 2) NOT NULL,
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_batch_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_batch_id" uuid NOT NULL,
	"stock_location_id" uuid NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "stock_batch_balances_quantity_non_negative" CHECK ("stock_batch_balances"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_number" varchar(64) NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"manufacturing_date" date,
	"expiry_date" date,
	"document_ref" varchar(100),
	"status" "stock_batch_status" DEFAULT 'ATIVO' NOT NULL,
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"description" varchar(255),
	"stock_sector_id" uuid NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_min_max" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quantity_min" numeric(14, 4) NOT NULL,
	"quantity_max" numeric(14, 4) NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_group_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"from_stock_sector_id" uuid,
	"from_stock_location_id" uuid,
	"from_stock_batch_id" uuid,
	"to_stock_sector_id" uuid,
	"to_stock_location_id" uuid,
	"to_stock_batch_id" uuid,
	"quantity" numeric(14, 4) NOT NULL,
	"from_quantity_before" numeric(14, 4),
	"from_quantity_after" numeric(14, 4),
	"to_quantity_before" numeric(14, 4),
	"to_quantity_after" numeric(14, 4),
	"user_id" uuid,
	"notes" varchar(500),
	"document_ref" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_quantity_positive" CHECK ("stock_movements"."quantity" > 0),
	CONSTRAINT "stock_movements_transfer_requires_sectors" CHECK ("stock_movements"."type" <> 'TRANSFERENCIA' OR ("stock_movements"."from_stock_sector_id" IS NOT NULL AND "stock_movements"."to_stock_sector_id" IS NOT NULL)),
	CONSTRAINT "stock_movements_transfer_requires_locations" CHECK ("stock_movements"."type" <> 'TRANSFERENCIA' OR ("stock_movements"."from_stock_location_id" IS NOT NULL AND "stock_movements"."to_stock_location_id" IS NOT NULL AND "stock_movements"."from_stock_location_id" <> "stock_movements"."to_stock_location_id")),
	CONSTRAINT "stock_movements_transfer_batches_consistent" CHECK ("stock_movements"."type" <> 'TRANSFERENCIA' OR (("stock_movements"."from_stock_batch_id" IS NULL AND "stock_movements"."to_stock_batch_id" IS NULL) OR ("stock_movements"."from_stock_batch_id" IS NOT NULL AND "stock_movements"."to_stock_batch_id" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "stock_sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_sectors_rental" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"stock_location_id" uuid NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "stock_sectors_rental_quantity_non_negative" CHECK ("stock_sectors_rental"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "auth_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"login_attempt" varchar(255),
	"login_type" "login_type",
	"event" "auth_event" NOT NULL,
	"enterprise_id" uuid,
	"session_id" uuid,
	"ip_address" varchar(64),
	"user_agent" varchar(500),
	"request_id" varchar(64),
	"reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "entity_audit_action" NOT NULL,
	"changes" jsonb,
	"actor_user_id" uuid,
	"actor_member_id" uuid,
	"enterprise_id" uuid,
	"request_id" varchar(64),
	"ip_address" varchar(64),
	"user_agent" varchar(500),
	"source" varchar(255),
	"reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ceps" ADD CONSTRAINT "ceps_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_default_permissions" ADD CONSTRAINT "department_default_permissions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_address" ADD CONSTRAINT "enterprises_address_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_address" ADD CONSTRAINT "enterprises_address_cep_id_ceps_id_fk" FOREIGN KEY ("cep_id") REFERENCES "public"."ceps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_address" ADD CONSTRAINT "enterprises_address_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_address" ADD CONSTRAINT "enterprises_address_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_address" ADD CONSTRAINT "enterprises_address_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_included_by_users_id_fk" FOREIGN KEY ("included_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_extra_permissions" ADD CONSTRAINT "member_extra_permissions_member_department_id_members_departments_id_fk" FOREIGN KEY ("member_department_id") REFERENCES "public"."members_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_permissions_default" ADD CONSTRAINT "member_permissions_default_member_department_id_members_departments_id_fk" FOREIGN KEY ("member_department_id") REFERENCES "public"."members_departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_departments" ADD CONSTRAINT "members_departments_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_departments" ADD CONSTRAINT "members_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_sequences" ADD CONSTRAINT "enterprises_sequences_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_address" ADD CONSTRAINT "users_address_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_address" ADD CONSTRAINT "users_address_cep_id_ceps_id_fk" FOREIGN KEY ("cep_id") REFERENCES "public"."ceps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_address" ADD CONSTRAINT "users_address_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_address" ADD CONSTRAINT "users_address_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_address" ADD CONSTRAINT "users_address_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_contact" ADD CONSTRAINT "users_contact_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_financial_info" ADD CONSTRAINT "users_financial_info_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_personal_info" ADD CONSTRAINT "users_personal_info_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_relationships" ADD CONSTRAINT "users_relationships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_tax_infos" ADD CONSTRAINT "users_tax_infos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_credentials" ADD CONSTRAINT "users_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_application" ADD CONSTRAINT "product_application_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_taxation" ADD CONSTRAINT "product_taxation_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_taxation" ADD CONSTRAINT "product_taxation_icms_taxation_id_icms_taxation_id_fk" FOREIGN KEY ("icms_taxation_id") REFERENCES "public"."icms_taxation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_cest" ADD CONSTRAINT "products_cest_products_ncm_id_products_ncm_id_fk" FOREIGN KEY ("products_ncm_id") REFERENCES "public"."products_ncm"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_measurement_unit_id_measurementUnits_id_fk" FOREIGN KEY ("measurement_unit_id") REFERENCES "public"."measurementUnits"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_type_id_products_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."products_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_ncm_id_products_ncm_id_fk" FOREIGN KEY ("product_ncm_id") REFERENCES "public"."products_ncm"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_cest_id_products_cest_id_fk" FOREIGN KEY ("product_cest_id") REFERENCES "public"."products_cest"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_anp_id_products_anp_id_fk" FOREIGN KEY ("product_anp_id") REFERENCES "public"."products_anp"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_nbs_id_products_nbs_id_fk" FOREIGN KEY ("product_nbs_id") REFERENCES "public"."products_nbs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_group_id_product_groups_id_fk" FOREIGN KEY ("product_group_id") REFERENCES "public"."product_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_subgroup_id_product_subgroups_id_fk" FOREIGN KEY ("product_subgroup_id") REFERENCES "public"."product_subgroups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_brand_id_product_brands_id_fk" FOREIGN KEY ("product_brand_id") REFERENCES "public"."product_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotional_prices" ADD CONSTRAINT "promotional_prices_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_source_budget_sale_id_sales_id_fk" FOREIGN KEY ("source_budget_sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_budget_conversion_items" ADD CONSTRAINT "sales_budget_conversion_items_conversion_id_sales_budget_conversions_id_fk" FOREIGN KEY ("conversion_id") REFERENCES "public"."sales_budget_conversions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_budget_conversion_items" ADD CONSTRAINT "sales_budget_conversion_items_budget_item_id_sales_items_id_fk" FOREIGN KEY ("budget_item_id") REFERENCES "public"."sales_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_budget_conversion_items" ADD CONSTRAINT "sales_budget_conversion_items_sale_item_id_sales_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sales_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_budget_conversions" ADD CONSTRAINT "sales_budget_conversions_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_budget_conversions" ADD CONSTRAINT "sales_budget_conversions_budget_sale_id_sales_id_fk" FOREIGN KEY ("budget_sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_budget_conversions" ADD CONSTRAINT "sales_budget_conversions_generated_sale_id_sales_id_fk" FOREIGN KEY ("generated_sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_budget_conversions" ADD CONSTRAINT "sales_budget_conversions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_dues" ADD CONSTRAINT "sales_dues_sales_payment_id_sales_payments_id_fk" FOREIGN KEY ("sales_payment_id") REFERENCES "public"."sales_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_dues" ADD CONSTRAINT "sales_dues_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_unit_id_measurementUnits_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."measurementUnits"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_product_type_id_products_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."products_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_stock_sector_id_stock_sectors_id_fk" FOREIGN KEY ("stock_sector_id") REFERENCES "public"."stock_sectors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_stock_location_id_stock_locations_id_fk" FOREIGN KEY ("stock_location_id") REFERENCES "public"."stock_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_stock_batch_id_stock_batches_id_fk" FOREIGN KEY ("stock_batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_source_budget_item_id_sales_items_id_fk" FOREIGN KEY ("source_budget_item_id") REFERENCES "public"."sales_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_payment_type_id_payment_types_id_fk" FOREIGN KEY ("payment_type_id") REFERENCES "public"."payment_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_sales_return_id_sales_returns_id_fk" FOREIGN KEY ("sales_return_id") REFERENCES "public"."sales_returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_return_items" ADD CONSTRAINT "sales_return_items_sale_item_id_sales_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sales_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_batch_balances" ADD CONSTRAINT "stock_batch_balances_stock_batch_id_stock_batches_id_fk" FOREIGN KEY ("stock_batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_batch_balances" ADD CONSTRAINT "stock_batch_balances_stock_location_id_stock_locations_id_fk" FOREIGN KEY ("stock_location_id") REFERENCES "public"."stock_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_locations" ADD CONSTRAINT "stock_locations_stock_sector_id_stock_sectors_id_fk" FOREIGN KEY ("stock_sector_id") REFERENCES "public"."stock_sectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_min_max" ADD CONSTRAINT "stock_min_max_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_stock_sector_id_stock_sectors_id_fk" FOREIGN KEY ("from_stock_sector_id") REFERENCES "public"."stock_sectors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_stock_location_id_stock_locations_id_fk" FOREIGN KEY ("from_stock_location_id") REFERENCES "public"."stock_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_stock_batch_id_stock_batches_id_fk" FOREIGN KEY ("from_stock_batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_stock_sector_id_stock_sectors_id_fk" FOREIGN KEY ("to_stock_sector_id") REFERENCES "public"."stock_sectors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_stock_location_id_stock_locations_id_fk" FOREIGN KEY ("to_stock_location_id") REFERENCES "public"."stock_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_stock_batch_id_stock_batches_id_fk" FOREIGN KEY ("to_stock_batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_sectors_rental" ADD CONSTRAINT "stock_sectors_rental_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_sectors_rental" ADD CONSTRAINT "stock_sectors_rental_stock_location_id_stock_locations_id_fk" FOREIGN KEY ("stock_location_id") REFERENCES "public"."stock_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_audit_log" ADD CONSTRAINT "auth_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_audit_log" ADD CONSTRAINT "auth_audit_log_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_audit_log" ADD CONSTRAINT "entity_audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_audit_log" ADD CONSTRAINT "entity_audit_log_actor_member_id_enterprises_members_id_fk" FOREIGN KEY ("actor_member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_audit_log" ADD CONSTRAINT "entity_audit_log_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ceps_city_cep_active_unique" ON "ceps" USING btree ("city_id","cep_number") WHERE "ceps"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "cities_ibge_code_active_unique" ON "cities" USING btree ("ibge_code") WHERE "cities"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "cities_state_name_active_unique" ON "cities" USING btree ("state_id","city_name") WHERE "cities"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "countries_country_code_active_unique" ON "countries" USING btree ("country_code") WHERE "countries"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "states_country_acronym_active_unique" ON "states" USING btree ("country_id","acronym") WHERE "states"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "department_default_permissions_dept_perm_active_unique" ON "department_default_permissions" USING btree ("department_id","permission") WHERE "department_default_permissions"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "departments_name_active_unique" ON "departments" USING btree ("name") WHERE "departments"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_registration_active_unique" ON "enterprises" USING btree ("registration") WHERE "enterprises"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_legal_name_active_unique" ON "enterprises" USING btree ("legal_name") WHERE "enterprises"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_trade_name_active_unique" ON "enterprises" USING btree ("trade_name") WHERE "enterprises"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_address_principal_active_unique" ON "enterprises_address" USING btree ("enterprise_id") WHERE "enterprises_address"."deleted_at" is null and "enterprises_address"."adress_type" = 'PRINCIPAL';--> statement-breakpoint
CREATE INDEX "enterprises_address_enterprise_active_idx" ON "enterprises_address" USING btree ("enterprise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_members_user_enterprise_active_unique" ON "enterprises_members" USING btree ("user_id","enterprise_id") WHERE "enterprises_members"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "enterprises_members_enterprise_active_idx" ON "enterprises_members" USING btree ("enterprise_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "member_extra_permissions_member_dept_perm_active_unique" ON "member_extra_permissions" USING btree ("member_department_id","permission") WHERE "member_extra_permissions"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "member_permissions_default_member_dept_perm_active_unique" ON "member_permissions_default" USING btree ("member_department_id","permission") WHERE "member_permissions_default"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "members_departments_member_department_active_unique" ON "members_departments" USING btree ("member_id","department_id") WHERE "members_departments"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "members_departments_main_unique" ON "members_departments" USING btree ("member_id") WHERE "members_departments"."main_department" = true and "members_departments"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "members_departments_member_department_idx" ON "members_departments" USING btree ("member_id","department_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_invitations_first_access_user_pending_unique" ON "user_invitations" USING btree ("user_id") WHERE "user_invitations"."purpose" = 'FIRST_ACCESS'::invite_purpose and "user_invitations"."consumed_at" is null and "user_invitations"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_invitations_membership_member_pending_unique" ON "user_invitations" USING btree ("member_id") WHERE "user_invitations"."purpose" = 'MEMBERSHIP_ACCEPT'::invite_purpose and "user_invitations"."member_id" is not null and "user_invitations"."consumed_at" is null and "user_invitations"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "user_invitations_user_member_purpose_idx" ON "user_invitations" USING btree ("user_id","member_id","purpose");--> statement-breakpoint
CREATE INDEX "enterprises_sequences_enterprise_idx" ON "enterprises_sequences" USING btree ("enterprise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_registration_active_unique" ON "users" USING btree ("user_registration") WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_active_unique" ON "users" USING btree ("user_email") WHERE "users"."user_email" is not null and "users"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_active_unique" ON "users" USING btree ("user_phone") WHERE "users"."user_phone" is not null and "users"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "users_active_name_idx" ON "users" USING btree ("deleted_at","user_name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_address_principal_active_unique" ON "users_address" USING btree ("user_id") WHERE "users_address"."deleted_at" is null and "users_address"."adress_type" = 'PRINCIPAL';--> statement-breakpoint
CREATE INDEX "users_address_user_active_idx" ON "users_address" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_contact_principal_active_unique" ON "users_contact" USING btree ("user_id") WHERE "users_contact"."deleted_at" is null and "users_contact"."type" = 'PRINCIPAL';--> statement-breakpoint
CREATE INDEX "users_contact_user_active_idx" ON "users_contact" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_user_pending_unique" ON "password_reset_tokens" USING btree ("user_id") WHERE "password_reset_tokens"."consumed_at" is null and "password_reset_tokens"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_created_idx" ON "password_reset_tokens" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_jti_active_unique" ON "user_sessions" USING btree ("jti") WHERE "user_sessions"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "user_sessions_user_member_idx" ON "user_sessions" USING btree ("user_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_credentials_login_type_normalized_active_unique" ON "users_credentials" USING btree ("login_type","login_normalized") WHERE "users_credentials"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_credentials_user_login_type_active_unique" ON "users_credentials" USING btree ("user_id","login_type") WHERE "users_credentials"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "icms_taxation_icms_unique" ON "icms_taxation" USING btree ("icms");--> statement-breakpoint
CREATE UNIQUE INDEX "measurement_units_unit_active_unique" ON "measurementUnits" USING btree ("unit");--> statement-breakpoint
CREATE UNIQUE INDEX "pis_cofins_situation_cst_unique" ON "pis_cofins_situation" USING btree ("cst");--> statement-breakpoint
CREATE UNIQUE INDEX "prices_products_enterprises_id_unique" ON "prices" USING btree ("products_enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_application_products_enterprises_id_description_unique" ON "product_application" USING btree ("products_enterprises_id","description");--> statement-breakpoint
CREATE UNIQUE INDEX "product_taxation_products_enterprises_id_unique" ON "product_taxation" USING btree ("products_enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_types_type_active_unique" ON "products_types" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "products_bar_code_active_unique" ON "products" USING btree ("bar_code");--> statement-breakpoint
CREATE UNIQUE INDEX "products_anp_unique" ON "products_anp" USING btree ("anp");--> statement-breakpoint
CREATE UNIQUE INDEX "products_cest_cest_active_unique" ON "products_cest" USING btree ("cest","products_ncm_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_enterprises_product_id_enterprises_id_unique" ON "products_enterprises" USING btree ("product_id","enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_nbs_lc116_nbs_cclasstrib_unique" ON "products_nbs" USING btree ("lc116_item","nbs","c_class_trib");--> statement-breakpoint
CREATE UNIQUE INDEX "products_ncm_ncm_active_unique" ON "products_ncm" USING btree ("ncm");--> statement-breakpoint
CREATE UNIQUE INDEX "promotional_prices_products_enterprises_id_unique" ON "promotional_prices" USING btree ("products_enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movements_type_status_unique" ON "payment_types" USING btree ("description") WHERE "payment_types"."status" = 'ATIVO';--> statement-breakpoint
CREATE UNIQUE INDEX "sales_enterprises_id_order_number_unique" ON "sales" USING btree ("enterprises_id","order_number");--> statement-breakpoint
CREATE INDEX "sales_source_budget_sale_id_idx" ON "sales" USING btree ("source_budget_sale_id");--> statement-breakpoint
CREATE INDEX "sales_analytics_realized_idx" ON "sales" USING btree ("enterprises_id","completedion_date") WHERE "sales"."type" = 'VENDA' AND "sales"."status" = 'FINALIZADA';--> statement-breakpoint
CREATE INDEX "sales_analytics_pipeline_idx" ON "sales" USING btree ("enterprises_id","created_at") WHERE "sales"."status" = 'ABERTA';--> statement-breakpoint
CREATE UNIQUE INDEX "sales_budget_conversion_items_conversion_budget_item_unique" ON "sales_budget_conversion_items" USING btree ("conversion_id","budget_item_id");--> statement-breakpoint
CREATE INDEX "sales_budget_conversions_budget_sale_id_idx" ON "sales_budget_conversions" USING btree ("budget_sale_id");--> statement-breakpoint
CREATE INDEX "sales_budget_conversions_generated_sale_id_idx" ON "sales_budget_conversions" USING btree ("generated_sale_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_dues_sales_payment_id_due_date_unique" ON "sales_dues" USING btree ("sales_payment_id","due_date");--> statement-breakpoint
CREATE INDEX "sales_dues_due_date_idx" ON "sales_dues" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "sales_items_products_enterprises_id_idx" ON "sales_items" USING btree ("products_enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_payments_sales_id_payment_type_id_unique" ON "sales_payments" USING btree ("sales_id","payment_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_return_items_return_sale_item_unique" ON "sales_return_items" USING btree ("sales_return_id","sale_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_returns_enterprise_return_number_unique" ON "sales_returns" USING btree ("enterprises_id","return_number");--> statement-breakpoint
CREATE INDEX "sales_returns_sale_id_idx" ON "sales_returns" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sales_returns_analytics_idx" ON "sales_returns" USING btree ("enterprises_id","created_at") WHERE "sales_returns"."status" = 'FINALIZADA';--> statement-breakpoint
CREATE UNIQUE INDEX "stock_batch_balances_batch_location_unique" ON "stock_batch_balances" USING btree ("stock_batch_id","stock_location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_batches_product_batch_unique" ON "stock_batches" USING btree ("products_enterprises_id","batch_number");--> statement-breakpoint
CREATE INDEX "stock_batches_expiry_idx" ON "stock_batches" USING btree ("expiry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_locations_sector_code_unique" ON "stock_locations" USING btree ("stock_sector_id","code");--> statement-breakpoint
CREATE INDEX "stock_locations_sector_idx" ON "stock_locations" USING btree ("stock_sector_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_min_max_products_enterprises_id_unique" ON "stock_min_max" USING btree ("products_enterprises_id");--> statement-breakpoint
CREATE INDEX "stock_movements_products_enterprises_created_idx" ON "stock_movements" USING btree ("products_enterprises_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_transfer_group_idx" ON "stock_movements" USING btree ("transfer_group_id");--> statement-breakpoint
CREATE INDEX "stock_movements_from_sector_idx" ON "stock_movements" USING btree ("from_stock_sector_id");--> statement-breakpoint
CREATE INDEX "stock_movements_to_sector_idx" ON "stock_movements" USING btree ("to_stock_sector_id");--> statement-breakpoint
CREATE INDEX "stock_movements_from_location_idx" ON "stock_movements" USING btree ("from_stock_location_id");--> statement-breakpoint
CREATE INDEX "stock_movements_to_location_idx" ON "stock_movements" USING btree ("to_stock_location_id");--> statement-breakpoint
CREATE INDEX "stock_movements_from_batch_idx" ON "stock_movements" USING btree ("from_stock_batch_id");--> statement-breakpoint
CREATE INDEX "stock_movements_to_batch_idx" ON "stock_movements" USING btree ("to_stock_batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_sectors_rental_product_location_unique" ON "stock_sectors_rental" USING btree ("products_enterprises_id","stock_location_id");--> statement-breakpoint
CREATE INDEX "entity_audit_entity_idx" ON "entity_audit_log" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "entity_audit_enterprise_idx" ON "entity_audit_log" USING btree ("enterprise_id","created_at");--> statement-breakpoint
CREATE INDEX "entity_audit_actor_user_idx" ON "entity_audit_log" USING btree ("actor_user_id","created_at");