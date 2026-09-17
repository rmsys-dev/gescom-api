CREATE TYPE "public"."access_level" AS ENUM('N0', 'N1', 'N2', 'N3', 'N4', 'N5', 'N6');--> statement-breakpoint
CREATE TYPE "public"."adress_type" AS ENUM('RESIDENCIAL', 'COMERCIAL', 'ENTREGA', 'COBRANCA', 'FATURAMENTO', 'SECUNDARIO', 'PRINCIPAL', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."auth_event" AS ENUM('LOGIN_SUCCESS', 'LOGIN_FAILED_PASSWORD', 'LOGIN_FAILED_USER', 'LOGIN_BLOCKED', 'LOGOUT', 'REFRESH', 'REFRESH_REUSE', 'SWITCH_ENTERPRISE', 'RATE_LIMITED', 'PERMISSION_DENIED', 'SIGNUP', 'SIGNUP_FAILED', 'FIRST_ACCESS_REQUESTED', 'FIRST_ACCESS_VERIFIED', 'FIRST_ACCESS_FAILED', 'FIRST_ACCESS_COMPLETED', 'INVITE_CREATED', 'INVITE_ACCEPTED', 'INVITE_DECLINED', 'INVITE_EXPIRED', 'CODE_RATE_LIMITED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_VERIFIED', 'PASSWORD_RESET_FAILED', 'PASSWORD_RESET_RATE_LIMITED', 'PASSWORD_RESET_COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."axle_type" AS ENUM('VEICULO 2 EIXOS', 'VEICULO 3 EIXOS', 'VEICULO 4 EIXOS', 'VEICULO 5 EIXOS', 'VEICULO 6 EIXOS', 'VEICULO 7 EIXOS', 'VEICULO 8 EIXOS', 'VEICULO 9 EIXOS', 'VEICULO 10 EIXOS', 'VEICULO ACIMA 10 EIXOS');--> statement-breakpoint
CREATE TYPE "public"."body_type" AS ENUM('NAO_APLICAVEL', 'ABERTA', 'FECHADA/BAU', 'GRANELERA', 'PORTA CONTAINER', 'SIDER');--> statement-breakpoint
CREATE TYPE "public"."credit_type" AS ENUM('MENSAL', 'GERAL');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('VENDA', 'ORCAMENTO');--> statement-breakpoint
CREATE TYPE "public"."entity_audit_action" AS ENUM('CREATE', 'UPDATE', 'SOFT_DELETE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('USERS', 'USERS_PERSONAL_INFO', 'USERS_ADDRESS', 'USERS_CONTACT', 'USERS_RELATIONSHIPS', 'USERS_TAX_INFOS', 'USERS_FINANCIAL_INFO', 'MEMBERS_PERSONAL_INFO', 'MEMBERS_ADDRESS', 'MEMBERS_CONTACT', 'MEMBERS_RELATIONSHIPS', 'MEMBERS_TAX_INFOS', 'MEMBERS_FINANCIAL_INFO', 'ENTERPRISES', 'ENTERPRISES_ADDRESS', 'ENTERPRISE_PARAMETERS', 'ENTERPRISES_MEMBERS', 'MEMBERS_DEPARTMENTS', 'MEMBER_PERMISSIONS_DEFAULT', 'MEMBER_EXTRA_PERMISSIONS', 'DEPARTMENTS', 'MODULES', 'MEMBER_MODULES', 'MODULE_PERMISSIONS', 'COUNTRIES', 'STATES', 'CITIES', 'CEPS', 'PRODUCTS', 'PRODUCTS_ENTERPRISES', 'MEASUREMENT_UNITS', 'PRODUCT_TYPES', 'TYPE_SPED', 'PRODUCTS_NCM', 'PRODUCTS_CEST', 'PRODUCTS_ANP', 'PRODUCTS_NBS', 'PRODUCT_GROUPS', 'PRODUCT_SUBGROUPS', 'PRODUCT_BRANDS', 'PIS_COFINS_SITUATION', 'ICMS_TAXATION', 'PRODUCT_PRICES', 'PROMOTIONAL_PRICES', 'PRODUCT_TAXATION', 'PRODUCT_APPLICATIONS', 'SECTORS', 'LOCATIONS', 'STOCK_BATCHES', 'STOCK_BATCH_BALANCES', 'SECTORS_RENTAL', 'STOCK_MIN_MAX', 'STOCK_MOVEMENTS', 'PAYMENT_TYPES', 'SALES', 'SALES_RETURNS', 'TYPE_NETWORKS', 'TYPE_SUPPLIER_CUSTOMERS', 'VEHICLES', 'VEHICLES_ENTERPRISES_MEMBERS', 'ENTERPRISES_MEMBER_SALES_ITEMS', 'MECHANIC_SALES_ITEMS');--> statement-breakpoint
CREATE TYPE "public"."fuel_type" AS ENUM('GASOLINA', 'ALCOOL', 'DIESEL', 'ELETRICO');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('FEMININO', 'MASCULINO', 'NAO_INFORMADO');--> statement-breakpoint
CREATE TYPE "public"."harbour_sale_sync_event_type" AS ENUM('SALE_FINALIZED', 'SALE_CANCELLED', 'OS_FINALIZED', 'OS_CANCELLED', 'OS_CONVERTED_TO_SALE', 'OS_ESTORNO', 'SALE_RETURNED');--> statement-breakpoint
CREATE TYPE "public"."harbour_sale_sync_status" AS ENUM('PENDING', 'PROCESSING', 'DONE', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."housing_type" AS ENUM('ALUGADO', 'PROPRIO', 'DOADO', 'EMPRESTADO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."integer_or_fractional" AS ENUM('INTEIRO', 'FRACIONADO');--> statement-breakpoint
CREATE TYPE "public"."invite_channel" AS ENUM('EMAIL', 'SMS', 'WHATSAPP');--> statement-breakpoint
CREATE TYPE "public"."invite_purpose" AS ENUM('FIRST_ACCESS', 'MEMBERSHIP_ACCEPT');--> statement-breakpoint
CREATE TYPE "public"."login_type" AS ENUM('EMAIL', 'CPF');--> statement-breakpoint
CREATE TYPE "public"."marital_status" AS ENUM('SOLTEIRO', 'CASADO', 'DIVORCIADO', 'VIUVO', 'UNIAO_ESTAVEL');--> statement-breakpoint
CREATE TYPE "public"."member_class" AS ENUM('ADMINISTRADOR', 'GERENTE', 'COLABORADOR', 'CLIENTE', 'TRANSPORTADOR', 'FORNECEDOR', 'PARCEIRO', 'SOCIO', 'INVESTIDOR', 'AUDITOR', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."order_service_model" AS ENUM('VEICULO');--> statement-breakpoint
CREATE TYPE "public"."owner_type" AS ENUM('PROPRIETARIO', 'LOCATARIO', 'OUTROS');--> statement-breakpoint
CREATE TYPE "public"."password_reset_check_status" AS ENUM('PENDENTE', 'VERIFICADO');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('A_VISTA', 'A_PRAZO', 'OUTROS');--> statement-breakpoint
CREATE TYPE "public"."pis_cofins_type" AS ENUM('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."sale_conversion_closure_kind" AS ENUM('PARCIAL', 'TOTAL');--> statement-breakpoint
CREATE TYPE "public"."sale_conversion_type" AS ENUM('ORCAMENTO-VENDA', 'ORCAMENTO-ORDEM_SERVICO', 'ORDEM_SERVICO-VENDA');--> statement-breakpoint
CREATE TYPE "public"."sale_origin" AS ENUM('WEB', 'MOBILE');--> statement-breakpoint
CREATE TYPE "public"."sale_return_kind" AS ENUM('PARCIAL', 'TOTAL');--> statement-breakpoint
CREATE TYPE "public"."sale_return_situation" AS ENUM('SEM_DEVOLUCAO', 'PARCIAL', 'TOTAL');--> statement-breakpoint
CREATE TYPE "public"."sale_return_status" AS ENUM('ABERTA', 'FINALIZADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."sale_service_type" AS ENUM('SERVICO', 'GARANTIA');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('ABERTA', 'FINALIZADA', 'CANCELADA', 'INATIVA', 'PARCIAL');--> statement-breakpoint
CREATE TYPE "public"."sale_type" AS ENUM('VENDA', 'ORCAMENTO', 'DEVOLUCAO', 'CANCELAMENTO', 'ORDEM DE SERVICO');--> statement-breakpoint
CREATE TYPE "public"."sequence_type" AS ENUM('VENDA', 'NFE', 'NFSE', 'NFCE', 'MDFE', 'CTE');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('ATIVO', 'INATIVO', 'BLOQUEADO', 'PENDENTE', 'ESPECIAL', 'COBRANCA', 'NAO_VENDER', 'FUNCIONARIO');--> statement-breakpoint
CREATE TYPE "public"."status_permission" AS ENUM('ALLOW', 'DENIED');--> statement-breakpoint
CREATE TYPE "public"."stock_batch_status" AS ENUM('ATIVO', 'BLOQUEADO', 'ESGOTADO');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE', 'PERDA', 'VENDA', 'COMPRA', 'DEVOLUCAO', 'CANCELAMENTO', 'OUTROS');--> statement-breakpoint
CREATE TYPE "public"."type_classification_customers" AS ENUM('TODOS', 'CLIENTE', 'FORNECEDOR');--> statement-breakpoint
CREATE TYPE "public"."type_service" AS ENUM('PROPRIO', 'OUTROS');--> statement-breakpoint
CREATE TYPE "public"."type_user_contact" AS ENUM('SECUNDARIO', 'PRINCIPAL', 'TRABALHO', 'RESIDENCIAL', 'COMERCIAL', 'CONJUGE', 'FILHO', 'PAI', 'MAE', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."vehicle_type" AS ENUM('TRUCK', 'TOCO', 'CAVALO MECANICO', 'VAN', 'UTILITARIO', 'OUTROS');--> statement-breakpoint
CREATE TABLE "ceps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cep_number" varchar(8) NOT NULL,
	"address" varchar(255) NOT NULL,
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
	"ibs_municipal_tax" numeric(15, 10) NOT NULL,
	"state_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "cities_ibs_municipal_tax_range" CHECK ("cities"."ibs_municipal_tax" >= 0 and "cities"."ibs_municipal_tax" <= 100.00)
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar(4) NOT NULL,
	"country_name" varchar(255) NOT NULL,
	"cbs_tax" numeric(15, 10) NOT NULL,
	"is_tax" numeric(15, 10) NOT NULL,
	"ibs_uf_tax" numeric(15, 10) NOT NULL,
	"ibs_municipal_tax" numeric(15, 10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "countries_cbs_tax_range" CHECK ("countries"."cbs_tax" >= 0 and "countries"."cbs_tax" <= 100.00),
	CONSTRAINT "countries_is_tax_range" CHECK ("countries"."is_tax" >= 0 and "countries"."is_tax" <= 100.00),
	CONSTRAINT "countries_ibs_uf_tax_range" CHECK ("countries"."ibs_uf_tax" >= 0 and "countries"."ibs_uf_tax" <= 100.00),
	CONSTRAINT "countries_ibs_municipal_tax_range" CHECK ("countries"."ibs_municipal_tax" >= 0 and "countries"."ibs_municipal_tax" <= 100.00)
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"acronym" varchar(2) NOT NULL,
	"description" varchar(255) NOT NULL,
	"internal_aliquot" numeric(15, 10) NOT NULL,
	"interstate_aliquot" numeric(15, 10) NOT NULL,
	"fcp_aliquot" numeric(15, 10) NOT NULL,
	"borders" integer NOT NULL,
	"generate_st" boolean DEFAULT false NOT NULL,
	"embed_difal" boolean DEFAULT false NOT NULL,
	"ibs_uf_tax" numeric(15, 10) NOT NULL,
	"ibs_municipal_tax" numeric(15, 10) NOT NULL,
	"country_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "states_internal_aliquot_range" CHECK ("states"."internal_aliquot" >= 0 and "states"."internal_aliquot" <= 100.00),
	CONSTRAINT "states_interstate_aliquot_range" CHECK ("states"."interstate_aliquot" >= 0 and "states"."interstate_aliquot" <= 100.00),
	CONSTRAINT "states_fcp_aliquot_range" CHECK ("states"."fcp_aliquot" >= 0 and "states"."fcp_aliquot" <= 100.00),
	CONSTRAINT "states_ibs_uf_tax_range" CHECK ("states"."ibs_uf_tax" >= 0 and "states"."ibs_uf_tax" <= 100.00),
	CONSTRAINT "states_ibs_municipal_tax_range" CHECK ("states"."ibs_municipal_tax" >= 0 and "states"."ibs_municipal_tax" <= 100.00)
);
--> statement-breakpoint
CREATE TABLE "enterprise_parameters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"parameter" varchar(255) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
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
	"number" varchar(255) NOT NULL,
	"complement" varchar(255),
	"enterprise_id" uuid NOT NULL,
	"cep_id" uuid NOT NULL,
	"adress_type" "adress_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "enterprises_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"type" "sequence_type" NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "enterprises_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" integer,
	"status" "status" DEFAULT 'PENDENTE' NOT NULL,
	"post_sales_status" "status" DEFAULT 'PENDENTE' NOT NULL,
	"class" "member_class" NOT NULL,
	"observations" varchar(500),
	"registered_on" date DEFAULT CURRENT_DATE NOT NULL,
	"sale_limit" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"exceed_discount_sale" boolean DEFAULT false NOT NULL,
	"receipt_limit_discount" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"comission_on_sight" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"comission_to_terms" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"comission_partial" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"comission_service" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"notify_maturity" boolean DEFAULT false NOT NULL,
	"user_id" uuid NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"included_by" uuid NOT NULL,
	"type_supplier_customer_id" uuid,
	"type_network_id" uuid,
	"approved_at" date,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "type_networks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(255) NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "type_supplier_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"description" varchar(255) NOT NULL,
	"icms_reduction" numeric(15, 10),
	"low" boolean DEFAULT false NOT NULL,
	"generates_st" boolean DEFAULT false NOT NULL,
	"end_consumer" boolean DEFAULT false NOT NULL,
	"classification" "type_classification_customers" DEFAULT 'CLIENTE' NOT NULL,
	"benefit_code" varchar(255),
	"customer_discount" numeric(15, 10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"check_status" "password_reset_check_status" DEFAULT 'PENDENTE' NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "invite_purpose" NOT NULL,
	"member_id" uuid,
	"code_hash" varchar(255) NOT NULL,
	"channel" "invite_channel" NOT NULL,
	"sent_to" varchar(255) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"reset_token_hash" varchar(255),
	"consumed_at" timestamp with time zone,
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
CREATE TABLE "member_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"access_level" "access_level" DEFAULT 'N0' NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "module_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_module_id" uuid NOT NULL,
	"permission" varchar(255) NOT NULL,
	"status" "status_permission" DEFAULT 'ALLOW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(255),
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"reference" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"user_registration" varchar(14),
	"user_email" varchar(255),
	"user_phone" varchar(20),
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
	"number" varchar(255) NOT NULL,
	"complement" varchar(255),
	"state_registration" varchar(255),
	"user_id" uuid NOT NULL,
	"cep_id" uuid NOT NULL,
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
	"icms_reduction" numeric(15, 10),
	"discount_limit" numeric(15, 10),
	"discout_arrangement" numeric(15, 10),
	"credit_type" "credit_type",
	"request_amount" numeric(15, 2),
	"credit_limit" numeric(15, 2),
	"tax_regime" varchar(255),
	"purchase_order" boolean,
	"prev_rate" numeric(15, 10),
	"rat_tax" numeric(15, 10),
	"billing_commission" numeric(15, 10),
	"senar_tax" numeric(15, 10),
	"sale_discount" numeric(15, 10),
	"send_nf" boolean,
	"quoted_price" boolean DEFAULT true NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_financial_info_icms_reduction_range" CHECK ("users_financial_info"."icms_reduction" >= 0 and "users_financial_info"."icms_reduction" <= 100),
	CONSTRAINT "users_financial_info_discount_limit_range" CHECK ("users_financial_info"."discount_limit" >= 0 and "users_financial_info"."discount_limit" <= 100),
	CONSTRAINT "users_financial_info_request_amount_non_negative" CHECK ("users_financial_info"."request_amount" >= 0),
	CONSTRAINT "users_financial_info_budget_price_non_negative" CHECK ("users_financial_info"."credit_limit" >= 0),
	CONSTRAINT "users_financial_info_prev_rate_range" CHECK ("users_financial_info"."prev_rate" >= 0 and "users_financial_info"."prev_rate" <= 100),
	CONSTRAINT "users_financial_info_rat_tax_range" CHECK ("users_financial_info"."rat_tax" >= 0 and "users_financial_info"."rat_tax" <= 100),
	CONSTRAINT "users_financial_info_reduction_rate_range" CHECK ("users_financial_info"."billing_commission" >= 0 and "users_financial_info"."billing_commission" <= 100),
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
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marital_status" "marital_status",
	"spouse_name" varchar(255),
	"housing_type" "housing_type",
	"rental_period" varchar(255),
	"mother_name" varchar(255),
	"father_name" varchar(255),
	"workplace" varchar(255),
	"work_address" varchar(255),
	"department_labor" varchar(255),
	"profession_time" varchar(255),
	"income" numeric(15, 2),
	"rental_price" numeric(15, 2),
	"to_warm_up" boolean,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_relationships_income_non_negative" CHECK ("users_relationships"."income" >= 0)
);
--> statement-breakpoint
CREATE TABLE "users_tax_infos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"renegotiation" boolean,
	"spc_registration" boolean DEFAULT false,
	"spc_registry_date" date,
	"municipal_registration" varchar(255),
	"suframa_registration" varchar(255),
	"user_legal_name" varchar(255),
	"r3_code" integer,
	"sefaz_date" date,
	"government_entity" varchar(1),
	"government_reduction_rate" numeric(15, 10),
	"identity_document" varchar(255),
	"partner_name1" varchar(255),
	"partner_name2" varchar(255),
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"check_status" "password_reset_check_status" DEFAULT 'PENDENTE' NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"channel" "invite_channel" NOT NULL,
	"sent_to" varchar(255) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"reset_token_hash" varchar(255),
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
	"icms_rate" numeric(15, 10),
	"simples_icms_rate" numeric(15, 10),
	"description" varchar(255) NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"alterado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "measurement_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"compatible" varchar(255),
	"whole_fractional" integer_or_fractional NOT NULL,
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
	"pis_rate" numeric(15, 10),
	"cofins_rate" numeric(15, 10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price" numeric(15, 2) NOT NULL,
	"average_cost" numeric(15, 4),
	"actual_real_cost" numeric(15, 4),
	"previous_cost" numeric(15, 4),
	"price_cost" numeric(15, 4),
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
	"enterprises_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"profit_margin" numeric(15, 10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_subgroups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"generates_comission" boolean DEFAULT false NOT NULL,
	"comission_on_sight_seller" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"comission_to_terms_seller" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"comission_partial_seller" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"comission_on_sight_manager" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"comission_to_terms_manager" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"comission_partial_manager" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "product_taxation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cst_pis_entrada_id" uuid NOT NULL,
	"cst_pis_saida_id" uuid NOT NULL,
	"cst_cofins_entrada_id" uuid NOT NULL,
	"cst_cofins_saida_id" uuid NOT NULL,
	"icms_taxation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"manufacturing" boolean DEFAULT false NOT NULL,
	"sales" boolean DEFAULT false NOT NULL,
	"type_sped_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"description" varchar(255) NOT NULL,
	"bar_code" varchar(255),
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
	"stock_balance" numeric(14, 4) DEFAULT '0.0000' NOT NULL,
	"measurement_unit_id" uuid NOT NULL,
	"product_type_id" uuid NOT NULL,
	"product_ncm_id" uuid,
	"product_cest_id" uuid,
	"product_anp_id" uuid,
	"product_nbs_id" uuid,
	"product_group_id" uuid NOT NULL,
	"product_subgroup_id" uuid NOT NULL,
	"product_brand_id" uuid NOT NULL,
	"product_pis_cofins_situation_id" uuid NOT NULL,
	"product_taxation_id" uuid NOT NULL,
	"controls_batch" boolean DEFAULT false NOT NULL,
	"controls_rental" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "products_enterprises_stock_balance_non_negative" CHECK ("products_enterprises"."stock_balance" >= 0)
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
	"price" numeric(15, 2) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "type_sped" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"generate_inventory" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "harbour_sale_sync_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"event_type" "harbour_sale_sync_event_type" NOT NULL,
	"status" "harbour_sale_sync_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mechanic_sales_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mechanic" uuid NOT NULL,
	"sales_items_id" uuid NOT NULL,
	"comission_service" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(255) NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"payment_type" "payment_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sale_conversion_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_conversion_id" uuid NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_conversion_items_quantity_positive" CHECK ("sale_conversion_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "sale_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"type_conversion" "sale_conversion_type" NOT NULL,
	"work_order_sale_id" uuid,
	"budget_sale_id" uuid,
	"generated_sale_id" uuid NOT NULL,
	"closure_kind" "sale_conversion_closure_kind" NOT NULL,
	"user_id" uuid NOT NULL,
	"user_legal_name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_conversions_source_by_type" CHECK ((
        (
          "sale_conversions"."type_conversion" IN ('ORCAMENTO-VENDA', 'ORCAMENTO-ORDEM_SERVICO')
          AND "sale_conversions"."budget_sale_id" IS NOT NULL
          AND "sale_conversions"."work_order_sale_id" IS NULL
        )
        OR
        (
          "sale_conversions"."type_conversion" = 'ORDEM_SERVICO-VENDA'
          AND "sale_conversions"."work_order_sale_id" IS NOT NULL
          AND "sale_conversions"."budget_sale_id" IS NULL
        )
      ))
);
--> statement-breakpoint
CREATE TABLE "sale_unclosed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_conversion_id" uuid NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"quantity_not_converted" numeric(15, 4) NOT NULL,
	"justification" varchar(500) NOT NULL,
	"user_id" uuid NOT NULL,
	"user_legal_name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_unclosed_items_quantity_positive" CHECK ("sale_unclosed_items"."quantity_not_converted" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"user_legal_name" varchar(255) NOT NULL,
	"seller_id" uuid NOT NULL,
	"seller_legal_name" varchar(255) NOT NULL,
	"member_id" uuid NOT NULL,
	"type" "sale_type" NOT NULL,
	"model_service" "order_service_model",
	"sub_total" numeric(15, 2) NOT NULL,
	"discount_value_items" numeric(15, 2),
	"value_acresce_items" numeric(15, 2),
	"percentage_discount_product" numeric(15, 10),
	"value_discount_financial_product" numeric(15, 2),
	"percentage_discount_service" numeric(15, 10),
	"value_discount_financial_service" numeric(15, 2),
	"percentage_acresce_product" numeric(15, 10),
	"value_acresce_financial_product" numeric(15, 2),
	"percentage_acresce_service" numeric(15, 10),
	"value_acresce_financial_service" numeric(15, 2),
	"value_product" numeric(15, 2),
	"value_service" numeric(15, 2),
	"value_liquid" numeric(15, 2),
	"status" "sale_status" NOT NULL,
	"return_situation" "sale_return_situation" DEFAULT 'SEM_DEVOLUCAO' NOT NULL,
	"source_budget_sale_id" uuid,
	"source_work_order_sale_id" uuid,
	"origin" "sale_origin" DEFAULT 'WEB',
	"completedion_date" date,
	"vehicle_mileage" integer DEFAULT 0 NOT NULL,
	"observations" varchar(500) DEFAULT '' NOT NULL,
	"defect" varchar(500) DEFAULT '' NOT NULL,
	"service_type" "sale_service_type" DEFAULT 'SERVICO' NOT NULL,
	"user_modification_service_id" uuid,
	"user_closed_service_id" uuid,
	"vehicles_enterprises_members_id" uuid,
	"enterprises_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales_dues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"value_installment" numeric(15, 2) NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"sales_payment_id" uuid NOT NULL,
	"sales_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"value_unit" numeric(15, 4) NOT NULL,
	"value_discount" numeric(15, 4) NOT NULL,
	"value_acresce" numeric(15, 4) NOT NULL,
	"value_total" numeric(15, 4) NOT NULL,
	"value_liquid_items_header" numeric(15, 4) DEFAULT '0' NOT NULL,
	"description" varchar(255),
	"average_cost" numeric(15, 4),
	"actual_real_cost" numeric(15, 4),
	"price_cost" numeric(15, 4),
	"price_sale" numeric(15, 4),
	"promotional_price_id" uuid,
	"sales_id" uuid NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"product_type_id" uuid NOT NULL,
	"sector_id" uuid,
	"locations_id" uuid,
	"stock_batch_id" uuid,
	"quantity_returned" numeric(15, 4) DEFAULT '0' NOT NULL,
	"quantity_converted" numeric(15, 4) DEFAULT '0' NOT NULL,
	"source_budget_item_id" uuid,
	"source_work_order_item_id" uuid,
	"type_service" "type_service" DEFAULT 'PROPRIO' NOT NULL,
	"user_id" uuid NOT NULL,
	"user_legal_name" varchar(255) NOT NULL,
	"seller_id" uuid NOT NULL,
	"seller_legal_name" varchar(255) NOT NULL,
	"percentage_comission_seller" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"percentage_comission_manager" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"origin" "sale_origin" DEFAULT 'WEB' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_id" uuid NOT NULL,
	"member_legal_name" varchar(255),
	"member_address" varchar(255),
	"member_cep" varchar(8),
	"member_city" varchar(255),
	"member_state" varchar(2),
	"registration" varchar(14),
	"member_phone" varchar(20),
	"member_mobile" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"value_total" numeric(15, 2) NOT NULL,
	"payment_type_id" uuid NOT NULL,
	"sales_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_order" integer NOT NULL,
	"sales_id" uuid NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "sales_returns_quantity_positive" CHECK ("sales_returns"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate" varchar(255) NOT NULL,
	"model" varchar(255),
	"color" varchar(255),
	"fuel_type" "fuel_type" DEFAULT 'GASOLINA' NOT NULL,
	"owner_type" "owner_type" DEFAULT 'PROPRIETARIO' NOT NULL,
	"ipva_payment_month" integer,
	"vehicle_year" integer,
	"renavam" varchar(255),
	"licensing_state_id" uuid,
	"tare_weight" numeric(15, 4),
	"capacity_m3" numeric(15, 4),
	"capacity_kg" numeric(15, 4),
	"entire_code" varchar(255),
	"rntrc_code" varchar(255),
	"vehicle_type" "vehicle_type" DEFAULT 'TRUCK' NOT NULL,
	"body_type" "body_type" DEFAULT 'NAO_APLICAVEL' NOT NULL,
	"axle_type" "axle_type" DEFAULT 'VEICULO 2 EIXOS' NOT NULL,
	"location" varchar(255),
	"refueling_mileage" numeric(15, 4),
	"fleet_number" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vehicles_enterprises_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"vehicles_id" uuid NOT NULL,
	"enterprises_members_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"box" varchar(64),
	"description" varchar(255),
	"sector_id" uuid NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sectors_rental" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"locations_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stock_batch_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_batch_id" uuid NOT NULL,
	"locations_id" uuid NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "batch_balances_quantity_non_negative" CHECK ("stock_batch_balances"."quantity" >= 0)
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
	"from_sector_id" uuid,
	"from_locations_id" uuid,
	"from_stock_batch_id" uuid,
	"to_sector_id" uuid,
	"to_locations_id" uuid,
	"to_stock_batch_id" uuid,
	"quantity" numeric(15, 4) NOT NULL,
	"from_quantity_before" numeric(15, 4),
	"from_quantity_after" numeric(15, 4),
	"to_quantity_before" numeric(15, 4),
	"to_quantity_after" numeric(15, 4),
	"user_id" uuid,
	"notes" varchar(500),
	"document_ref" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_quantity_positive" CHECK ("stock_movements"."quantity" > 0),
	CONSTRAINT "stock_movements_transfer_requires_sectors" CHECK ("stock_movements"."type" <> 'TRANSFERENCIA' OR ("stock_movements"."from_sector_id" IS NOT NULL AND "stock_movements"."to_sector_id" IS NOT NULL)),
	CONSTRAINT "stock_movements_transfer_requires_locations" CHECK ("stock_movements"."type" <> 'TRANSFERENCIA' OR ("stock_movements"."from_locations_id" IS NOT NULL AND "stock_movements"."to_locations_id" IS NOT NULL AND "stock_movements"."from_locations_id" <> "stock_movements"."to_locations_id")),
	CONSTRAINT "stock_movements_transfer_requires_batches" CHECK ("stock_movements"."type" <> 'TRANSFERENCIA' OR ("stock_movements"."from_stock_batch_id" IS NOT NULL AND "stock_movements"."to_stock_batch_id" IS NOT NULL AND "stock_movements"."from_stock_batch_id" <> "stock_movements"."to_stock_batch_id" AND "stock_movements"."from_stock_batch_id" IS NOT NULL AND "stock_movements"."to_stock_batch_id" IS NOT NULL)),
	CONSTRAINT "stock_movements_transfer_requires_locations_and_batches" CHECK ("stock_movements"."type" <> 'TRANSFERENCIA' OR ("stock_movements"."from_locations_id" IS NOT NULL AND "stock_movements"."to_locations_id" IS NOT NULL AND "stock_movements"."from_stock_batch_id" IS NOT NULL AND "stock_movements"."to_stock_batch_id" IS NOT NULL AND "stock_movements"."from_locations_id" <> "stock_movements"."to_locations_id" AND "stock_movements"."from_stock_batch_id" <> "stock_movements"."to_stock_batch_id" AND "stock_movements"."from_locations_id" IS NOT NULL AND "stock_movements"."to_locations_id" IS NOT NULL))
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
ALTER TABLE "enterprise_parameters" ADD CONSTRAINT "enterprise_parameters_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_address" ADD CONSTRAINT "enterprises_address_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_address" ADD CONSTRAINT "enterprises_address_cep_id_ceps_id_fk" FOREIGN KEY ("cep_id") REFERENCES "public"."ceps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_sequences" ADD CONSTRAINT "enterprises_sequences_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_included_by_users_id_fk" FOREIGN KEY ("included_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_type_supplier_customer_id_type_supplier_customers_id_fk" FOREIGN KEY ("type_supplier_customer_id") REFERENCES "public"."type_supplier_customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_type_network_id_type_networks_id_fk" FOREIGN KEY ("type_network_id") REFERENCES "public"."type_networks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_modules" ADD CONSTRAINT "member_modules_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_modules" ADD CONSTRAINT "member_modules_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_permissions" ADD CONSTRAINT "module_permissions_member_module_id_member_modules_id_fk" FOREIGN KEY ("member_module_id") REFERENCES "public"."member_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_address" ADD CONSTRAINT "users_address_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_address" ADD CONSTRAINT "users_address_cep_id_ceps_id_fk" FOREIGN KEY ("cep_id") REFERENCES "public"."ceps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "product_brands" ADD CONSTRAINT "product_brands_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_groups" ADD CONSTRAINT "product_groups_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_subgroups" ADD CONSTRAINT "product_subgroups_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_taxation" ADD CONSTRAINT "product_taxation_cst_pis_entrada_id_pis_cofins_situation_id_fk" FOREIGN KEY ("cst_pis_entrada_id") REFERENCES "public"."pis_cofins_situation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_taxation" ADD CONSTRAINT "product_taxation_cst_pis_saida_id_pis_cofins_situation_id_fk" FOREIGN KEY ("cst_pis_saida_id") REFERENCES "public"."pis_cofins_situation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_taxation" ADD CONSTRAINT "product_taxation_cst_cofins_entrada_id_pis_cofins_situation_id_fk" FOREIGN KEY ("cst_cofins_entrada_id") REFERENCES "public"."pis_cofins_situation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_taxation" ADD CONSTRAINT "product_taxation_cst_cofins_saida_id_pis_cofins_situation_id_fk" FOREIGN KEY ("cst_cofins_saida_id") REFERENCES "public"."pis_cofins_situation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_taxation" ADD CONSTRAINT "product_taxation_icms_taxation_id_icms_taxation_id_fk" FOREIGN KEY ("icms_taxation_id") REFERENCES "public"."icms_taxation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_types" ADD CONSTRAINT "products_types_type_sped_id_type_sped_id_fk" FOREIGN KEY ("type_sped_id") REFERENCES "public"."type_sped"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_cest" ADD CONSTRAINT "products_cest_products_ncm_id_products_ncm_id_fk" FOREIGN KEY ("products_ncm_id") REFERENCES "public"."products_ncm"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_measurement_unit_id_measurement_units_id_fk" FOREIGN KEY ("measurement_unit_id") REFERENCES "public"."measurement_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_type_id_products_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."products_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_ncm_id_products_ncm_id_fk" FOREIGN KEY ("product_ncm_id") REFERENCES "public"."products_ncm"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_cest_id_products_cest_id_fk" FOREIGN KEY ("product_cest_id") REFERENCES "public"."products_cest"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_anp_id_products_anp_id_fk" FOREIGN KEY ("product_anp_id") REFERENCES "public"."products_anp"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_nbs_id_products_nbs_id_fk" FOREIGN KEY ("product_nbs_id") REFERENCES "public"."products_nbs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_group_id_product_groups_id_fk" FOREIGN KEY ("product_group_id") REFERENCES "public"."product_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_subgroup_id_product_subgroups_id_fk" FOREIGN KEY ("product_subgroup_id") REFERENCES "public"."product_subgroups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_brand_id_product_brands_id_fk" FOREIGN KEY ("product_brand_id") REFERENCES "public"."product_brands"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_pis_cofins_situation_id_pis_cofins_situation_id_fk" FOREIGN KEY ("product_pis_cofins_situation_id") REFERENCES "public"."pis_cofins_situation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_taxation_id_product_taxation_id_fk" FOREIGN KEY ("product_taxation_id") REFERENCES "public"."product_taxation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotional_prices" ADD CONSTRAINT "promotional_prices_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harbour_sale_sync_events" ADD CONSTRAINT "harbour_sale_sync_events_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harbour_sale_sync_events" ADD CONSTRAINT "harbour_sale_sync_events_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mechanic_sales_items" ADD CONSTRAINT "mechanic_sales_items_mechanic_enterprises_members_id_fk" FOREIGN KEY ("mechanic") REFERENCES "public"."enterprises_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mechanic_sales_items" ADD CONSTRAINT "mechanic_sales_items_sales_items_id_sales_items_id_fk" FOREIGN KEY ("sales_items_id") REFERENCES "public"."sales_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_conversion_items" ADD CONSTRAINT "sale_conversion_items_sale_conversion_id_sale_conversions_id_fk" FOREIGN KEY ("sale_conversion_id") REFERENCES "public"."sale_conversions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_conversion_items" ADD CONSTRAINT "sale_conversion_items_sale_item_id_sales_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sales_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_conversions" ADD CONSTRAINT "sale_conversions_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_conversions" ADD CONSTRAINT "sale_conversions_work_order_sale_id_sales_id_fk" FOREIGN KEY ("work_order_sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_conversions" ADD CONSTRAINT "sale_conversions_budget_sale_id_sales_id_fk" FOREIGN KEY ("budget_sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_conversions" ADD CONSTRAINT "sale_conversions_generated_sale_id_sales_id_fk" FOREIGN KEY ("generated_sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_conversions" ADD CONSTRAINT "sale_conversions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_unclosed_items" ADD CONSTRAINT "sale_unclosed_items_sale_conversion_id_sale_conversions_id_fk" FOREIGN KEY ("sale_conversion_id") REFERENCES "public"."sale_conversions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_unclosed_items" ADD CONSTRAINT "sale_unclosed_items_sale_item_id_sales_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sales_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_unclosed_items" ADD CONSTRAINT "sale_unclosed_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_source_budget_sale_id_sales_id_fk" FOREIGN KEY ("source_budget_sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_source_work_order_sale_id_sales_id_fk" FOREIGN KEY ("source_work_order_sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_modification_service_id_users_id_fk" FOREIGN KEY ("user_modification_service_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_closed_service_id_users_id_fk" FOREIGN KEY ("user_closed_service_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_vehicles_enterprises_members_id_vehicles_enterprises_members_id_fk" FOREIGN KEY ("vehicles_enterprises_members_id") REFERENCES "public"."vehicles_enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_dues" ADD CONSTRAINT "sales_dues_sales_payment_id_sales_payments_id_fk" FOREIGN KEY ("sales_payment_id") REFERENCES "public"."sales_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_dues" ADD CONSTRAINT "sales_dues_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_promotional_price_id_promotional_prices_id_fk" FOREIGN KEY ("promotional_price_id") REFERENCES "public"."promotional_prices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_unit_id_measurement_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."measurement_units"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_product_type_id_products_types_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."products_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_locations_id_locations_id_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_stock_batch_id_stock_batches_id_fk" FOREIGN KEY ("stock_batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_source_budget_item_id_sales_items_id_fk" FOREIGN KEY ("source_budget_item_id") REFERENCES "public"."sales_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_source_work_order_item_id_sales_items_id_fk" FOREIGN KEY ("source_work_order_item_id") REFERENCES "public"."sales_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_members" ADD CONSTRAINT "sales_members_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_payment_type_id_payment_types_id_fk" FOREIGN KEY ("payment_type_id") REFERENCES "public"."payment_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_sale_item_id_sales_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sales_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_licensing_state_id_states_id_fk" FOREIGN KEY ("licensing_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles_enterprises_members" ADD CONSTRAINT "vehicles_enterprises_members_vehicles_id_vehicles_id_fk" FOREIGN KEY ("vehicles_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles_enterprises_members" ADD CONSTRAINT "vehicles_enterprises_members_enterprises_members_id_enterprises_members_id_fk" FOREIGN KEY ("enterprises_members_id") REFERENCES "public"."enterprises_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sectors_rental" ADD CONSTRAINT "sectors_rental_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sectors_rental" ADD CONSTRAINT "sectors_rental_locations_id_locations_id_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_batch_balances" ADD CONSTRAINT "stock_batch_balances_stock_batch_id_stock_batches_id_fk" FOREIGN KEY ("stock_batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_batch_balances" ADD CONSTRAINT "stock_batch_balances_locations_id_locations_id_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_min_max" ADD CONSTRAINT "stock_min_max_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_sector_id_sectors_id_fk" FOREIGN KEY ("from_sector_id") REFERENCES "public"."sectors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_locations_id_locations_id_fk" FOREIGN KEY ("from_locations_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_stock_batch_id_stock_batches_id_fk" FOREIGN KEY ("from_stock_batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_sector_id_sectors_id_fk" FOREIGN KEY ("to_sector_id") REFERENCES "public"."sectors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_locations_id_locations_id_fk" FOREIGN KEY ("to_locations_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_stock_batch_id_stock_batches_id_fk" FOREIGN KEY ("to_stock_batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
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
CREATE UNIQUE INDEX "enterprise_parameters_enterprise_parameter_active_unique" ON "enterprise_parameters" USING btree ("enterprise_id","parameter") WHERE "enterprise_parameters"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "enterprise_parameters_enterprise_active_idx" ON "enterprise_parameters" USING btree ("enterprise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_registration_active_unique" ON "enterprises" USING btree ("registration") WHERE "enterprises"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_legal_name_active_unique" ON "enterprises" USING btree ("legal_name") WHERE "enterprises"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_trade_name_active_unique" ON "enterprises" USING btree ("trade_name") WHERE "enterprises"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_address_principal_active_unique" ON "enterprises_address" USING btree ("enterprise_id") WHERE "enterprises_address"."deleted_at" is null and "enterprises_address"."adress_type" = 'PRINCIPAL';--> statement-breakpoint
CREATE INDEX "enterprises_address_enterprise_active_idx" ON "enterprises_address" USING btree ("enterprise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_sequences_enterprise_type_uidx" ON "enterprises_sequences" USING btree ("enterprise_id","type") WHERE "enterprises_sequences"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_members_user_enterprise_class_active_unique" ON "enterprises_members" USING btree ("user_id","enterprise_id","class") WHERE "enterprises_members"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "enterprises_members_user_enterprise_active_idx" ON "enterprises_members" USING btree ("enterprise_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "type_networks_description_active_unique" ON "type_networks" USING btree ("description");--> statement-breakpoint
CREATE UNIQUE INDEX "type_supplier_customers_description_active_unique" ON "type_supplier_customers" USING btree ("description");--> statement-breakpoint
CREATE UNIQUE INDEX "user_invitations_first_access_user_pending_unique" ON "user_invitations" USING btree ("user_id") WHERE "user_invitations"."purpose" = 'FIRST_ACCESS'::invite_purpose and "user_invitations"."consumed_at" is null and "user_invitations"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "user_invitations_membership_member_pending_unique" ON "user_invitations" USING btree ("member_id") WHERE "user_invitations"."purpose" = 'MEMBERSHIP_ACCEPT'::invite_purpose and "user_invitations"."member_id" is not null and "user_invitations"."consumed_at" is null and "user_invitations"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "user_invitations_user_member_purpose_idx" ON "user_invitations" USING btree ("user_id","member_id","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX "member_modules_member_id_module_id_active_unique" ON "member_modules" USING btree ("member_id","module_id") WHERE "member_modules"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "module_permissions_member_module_permission_unique" ON "module_permissions" USING btree ("member_module_id","permission");--> statement-breakpoint
CREATE UNIQUE INDEX "modules_name_active_unique" ON "modules" USING btree ("name") WHERE "modules"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "modules_reference_active_unique" ON "modules" USING btree ("reference") WHERE "modules"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "users_active_name_idx" ON "users" USING btree ("deleted_at","user_name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_identity_unique" ON "users" USING btree ("user_name","user_registration","user_email") WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_address_state_registration_adress_type_active_unique" ON "users_address" USING btree ("user_id","state_registration","adress_type") WHERE "users_address"."deleted_at" is null and "users_address"."state_registration" is not null;--> statement-breakpoint
CREATE INDEX "users_address_user_active_idx" ON "users_address" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_contact_principal_active_unique" ON "users_contact" USING btree ("user_id") WHERE "users_contact"."deleted_at" is null and "users_contact"."type" = 'PRINCIPAL';--> statement-breakpoint
CREATE INDEX "users_contact_user_active_idx" ON "users_contact" USING btree ("user_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_financial_info_user_active_unique" ON "users_financial_info" USING btree ("user_id") WHERE "users_financial_info"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_personal_info_user_active_unique" ON "users_personal_info" USING btree ("user_id") WHERE "users_personal_info"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_relationships_user_active_unique" ON "users_relationships" USING btree ("user_id") WHERE "users_relationships"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_tax_infos_user_active_unique" ON "users_tax_infos" USING btree ("user_id") WHERE "users_tax_infos"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_user_pending_unique" ON "password_reset_tokens" USING btree ("user_id") WHERE "password_reset_tokens"."consumed_at" is null and "password_reset_tokens"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_created_idx" ON "password_reset_tokens" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_jti_active_unique" ON "user_sessions" USING btree ("jti") WHERE "user_sessions"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "user_sessions_user_member_idx" ON "user_sessions" USING btree ("user_id","member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_credentials_login_type_normalized_active_unique" ON "users_credentials" USING btree ("login_type","login_normalized") WHERE "users_credentials"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_credentials_user_login_type_active_unique" ON "users_credentials" USING btree ("user_id","login_type") WHERE "users_credentials"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "icms_taxation_icms_unique" ON "icms_taxation" USING btree ("icms");--> statement-breakpoint
CREATE UNIQUE INDEX "measurement_units_unit_unique" ON "measurement_units" USING btree ("unit");--> statement-breakpoint
CREATE UNIQUE INDEX "pis_cofins_situation_cst_unique" ON "pis_cofins_situation" USING btree ("cst");--> statement-breakpoint
CREATE UNIQUE INDEX "prices_products_enterprises_id_unique" ON "prices" USING btree ("products_enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_application_products_enterprises_id_description_unique" ON "product_application" USING btree ("products_enterprises_id","description");--> statement-breakpoint
CREATE UNIQUE INDEX "product_brands_enterprise_description_unique" ON "product_brands" USING btree ("enterprises_id","description");--> statement-breakpoint
CREATE INDEX "product_brands_enterprise_idx" ON "product_brands" USING btree ("enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_groups_enterprise_description_unique" ON "product_groups" USING btree ("enterprises_id","description");--> statement-breakpoint
CREATE INDEX "product_groups_enterprise_idx" ON "product_groups" USING btree ("enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_subgroups_enterprise_description_unique" ON "product_subgroups" USING btree ("enterprises_id","description");--> statement-breakpoint
CREATE INDEX "product_subgroups_enterprise_idx" ON "product_subgroups" USING btree ("enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_taxation_cst_icms_unique" ON "product_taxation" USING btree ("cst_pis_entrada_id","cst_pis_saida_id","cst_cofins_entrada_id","cst_cofins_saida_id","icms_taxation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_types_type_unique" ON "products_types" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "products_description_bar_code_active_unique" ON "products" USING btree ("description","bar_code");--> statement-breakpoint
CREATE UNIQUE INDEX "products_bar_code_unique" ON "products" USING btree ("bar_code") WHERE "products"."bar_code" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "products_anp_unique" ON "products_anp" USING btree ("anp");--> statement-breakpoint
CREATE UNIQUE INDEX "products_cest_cest_ncm_unique" ON "products_cest" USING btree ("cest","products_ncm_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_enterprises_product_id_enterprises_id_unique" ON "products_enterprises" USING btree ("product_id","enterprises_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "products_nbs_lc116_nbs_cclasstrib_unique" ON "products_nbs" USING btree ("lc116_item","nbs","c_class_trib");--> statement-breakpoint
CREATE UNIQUE INDEX "products_ncm_ncm_unique" ON "products_ncm" USING btree ("ncm");--> statement-breakpoint
CREATE INDEX "promotional_prices_description_date_idx" ON "promotional_prices" USING btree ("description","start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "type_sped_type_unique" ON "type_sped" USING btree ("type");--> statement-breakpoint
CREATE INDEX "harbour_sale_sync_events_sale_id_idx" ON "harbour_sale_sync_events" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "harbour_sale_sync_events_pending_idx" ON "harbour_sale_sync_events" USING btree ("enterprises_id","created_at") WHERE "harbour_sale_sync_events"."status" = 'PENDING';--> statement-breakpoint
CREATE UNIQUE INDEX "harbour_sale_sync_events_pending_unique" ON "harbour_sale_sync_events" USING btree ("enterprises_id","sale_id","event_type") WHERE "harbour_sale_sync_events"."status" = 'PENDING';--> statement-breakpoint
CREATE UNIQUE INDEX "mechanic_sales_items_unique" ON "mechanic_sales_items" USING btree ("mechanic","sales_items_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_types_description_active_unique" ON "payment_types" USING btree ("description");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_conversion_items_sale_conversion_id_sale_item_id_unique" ON "sale_conversion_items" USING btree ("sale_conversion_id","sale_item_id");--> statement-breakpoint
CREATE INDEX "sale_conversions_budget_sale_id_idx" ON "sale_conversions" USING btree ("budget_sale_id");--> statement-breakpoint
CREATE INDEX "sale_conversions_work_order_sale_id_idx" ON "sale_conversions" USING btree ("work_order_sale_id");--> statement-breakpoint
CREATE INDEX "sale_conversions_generated_sale_id_idx" ON "sale_conversions" USING btree ("generated_sale_id");--> statement-breakpoint
CREATE INDEX "sale_conversions_type_conversion_idx" ON "sale_conversions" USING btree ("type_conversion");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_unclosed_items_sale_conversion_id_sale_item_id_unique" ON "sale_unclosed_items" USING btree ("sale_conversion_id","sale_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_enterprises_id_order_number_unique" ON "sales" USING btree ("enterprises_id","order_number");--> statement-breakpoint
CREATE INDEX "sales_source_budget_sale_id_idx" ON "sales" USING btree ("source_budget_sale_id");--> statement-breakpoint
CREATE INDEX "sales_source_work_order_sale_id_idx" ON "sales" USING btree ("source_work_order_sale_id");--> statement-breakpoint
CREATE INDEX "sales_vehicles_enterprises_members_id_idx" ON "sales" USING btree ("vehicles_enterprises_members_id");--> statement-breakpoint
CREATE INDEX "sales_analytics_realized_idx" ON "sales" USING btree ("enterprises_id","completedion_date") WHERE "sales"."type" = 'VENDA' AND "sales"."status" = 'FINALIZADA';--> statement-breakpoint
CREATE INDEX "sales_analytics_pipeline_idx" ON "sales" USING btree ("enterprises_id","created_at") WHERE "sales"."status" = 'ABERTA';--> statement-breakpoint
CREATE INDEX "sales_seller_id_idx" ON "sales" USING btree ("enterprises_id","seller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_dues_sales_payment_id_due_date_sales_id_unique" ON "sales_dues" USING btree ("sales_id","sales_payment_id","due_date");--> statement-breakpoint
CREATE INDEX "sales_items_products_enterprises_id_idx" ON "sales_items" USING btree ("products_enterprises_id");--> statement-breakpoint
CREATE INDEX "sales_items_seller_id_idx" ON "sales_items" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "sales_items_promotional_price_id_idx" ON "sales_items" USING btree ("promotional_price_id");--> statement-breakpoint
CREATE INDEX "sales_items_source_work_order_item_id_idx" ON "sales_items" USING btree ("source_work_order_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_members_sales_id_unique" ON "sales_members" USING btree ("sales_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_payments_sales_id_payment_type_id_unique" ON "sales_payments" USING btree ("sales_id","payment_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_returns_sales_id_return_order_unique" ON "sales_returns" USING btree ("sales_id","sale_item_id","return_order");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_plate_unique" ON "vehicles" USING btree ("plate");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_enterprises_members_unique" ON "vehicles_enterprises_members" USING btree ("vehicles_id","enterprises_members_id") WHERE "vehicles_enterprises_members"."status" = 'ATIVO';--> statement-breakpoint
CREATE UNIQUE INDEX "locations_sector_box_unique" ON "locations" USING btree ("sector_id","box");--> statement-breakpoint
CREATE INDEX "locations_sector_idx" ON "locations" USING btree ("sector_id");--> statement-breakpoint
CREATE INDEX "locations_box_idx" ON "locations" USING btree ("box");--> statement-breakpoint
CREATE UNIQUE INDEX "sectors_enterprise_description_unique" ON "sectors" USING btree ("enterprises_id","description");--> statement-breakpoint
CREATE INDEX "sectors_enterprise_idx" ON "sectors" USING btree ("enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sectors_rental_product_location_unique" ON "sectors_rental" USING btree ("products_enterprises_id","locations_id");--> statement-breakpoint
CREATE UNIQUE INDEX "batch_balances_batch_locations_unique" ON "stock_batch_balances" USING btree ("stock_batch_id","locations_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_batches_product_batch_unique" ON "stock_batches" USING btree ("products_enterprises_id","batch_number");--> statement-breakpoint
CREATE INDEX "stock_batches_expiry_idx" ON "stock_batches" USING btree ("expiry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_min_max_products_enterprises_id_unique" ON "stock_min_max" USING btree ("products_enterprises_id");--> statement-breakpoint
CREATE INDEX "stock_movements_products_enterprises_created_idx" ON "stock_movements" USING btree ("products_enterprises_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_transfer_group_idx" ON "stock_movements" USING btree ("transfer_group_id");--> statement-breakpoint
CREATE INDEX "stock_movements_from_sector_idx" ON "stock_movements" USING btree ("from_sector_id");--> statement-breakpoint
CREATE INDEX "stock_movements_to_sector_idx" ON "stock_movements" USING btree ("to_sector_id");--> statement-breakpoint
CREATE INDEX "stock_movements_from_locations_idx" ON "stock_movements" USING btree ("from_locations_id");--> statement-breakpoint
CREATE INDEX "stock_movements_to_locations_idx" ON "stock_movements" USING btree ("to_locations_id");--> statement-breakpoint
CREATE INDEX "stock_movements_from_batch_idx" ON "stock_movements" USING btree ("from_stock_batch_id");--> statement-breakpoint
CREATE INDEX "stock_movements_to_batch_idx" ON "stock_movements" USING btree ("to_stock_batch_id");--> statement-breakpoint
CREATE INDEX "entity_audit_entity_idx" ON "entity_audit_log" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "entity_audit_enterprise_idx" ON "entity_audit_log" USING btree ("enterprise_id","created_at");--> statement-breakpoint
CREATE INDEX "entity_audit_actor_user_idx" ON "entity_audit_log" USING btree ("actor_user_id","created_at");