CREATE TYPE "public"."access_level" AS ENUM('N0', 'N1', 'N2', 'N3', 'N4', 'N5', 'N6');--> statement-breakpoint
CREATE TYPE "public"."adress_type" AS ENUM('RESIDENCIAL', 'COMERCIAL', 'ENTREGA', 'COBRANCA', 'FATURAMENTO', 'SECUNDARIO', 'PRINCIPAL', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."auth_event" AS ENUM('LOGIN_SUCCESS', 'LOGIN_FAILED_PASSWORD', 'LOGIN_FAILED_USER', 'LOGIN_BLOCKED', 'LOGOUT', 'REFRESH', 'REFRESH_REUSE', 'SWITCH_ENTERPRISE', 'RATE_LIMITED', 'PERMISSION_DENIED', 'SIGNUP', 'SIGNUP_FAILED', 'FIRST_ACCESS_REQUESTED', 'FIRST_ACCESS_VERIFIED', 'FIRST_ACCESS_FAILED', 'FIRST_ACCESS_COMPLETED', 'INVITE_CREATED', 'INVITE_ACCEPTED', 'INVITE_DECLINED', 'INVITE_EXPIRED', 'CODE_RATE_LIMITED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_VERIFIED', 'PASSWORD_RESET_FAILED', 'PASSWORD_RESET_RATE_LIMITED', 'PASSWORD_RESET_COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."axle_type" AS ENUM('VEICULO 2 EIXOS', 'VEICULO 3 EIXOS', 'VEICULO 4 EIXOS', 'VEICULO 5 EIXOS', 'VEICULO 6 EIXOS', 'VEICULO 7 EIXOS', 'VEICULO 8 EIXOS', 'VEICULO 9 EIXOS', 'VEICULO 10 EIXOS', 'VEICULO ACIMA 10 EIXOS');--> statement-breakpoint
CREATE TYPE "public"."bank_channel" AS ENUM('API', 'CNAB');--> statement-breakpoint
CREATE TYPE "public"."bank_slip_event_kind" AS ENUM('EMISSAO', 'REGISTRO', 'REJEICAO', 'ALTERACAO_VENCIMENTO', 'LIQUIDACAO', 'BAIXA', 'WEBHOOK', 'RETORNO');--> statement-breakpoint
CREATE TYPE "public"."bank_slip_status" AS ENUM('RASCUNHO', 'AGUARDANDO_REGISTRO', 'REGISTRADO', 'REJEITADO', 'LIQUIDADO', 'BAIXADO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."body_type" AS ENUM('NAO_APLICAVEL', 'ABERTA', 'FECHADA/BAU', 'GRANELERA', 'PORTA CONTAINER', 'SIDER');--> statement-breakpoint
CREATE TYPE "public"."cfop_moviment_type" AS ENUM('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'DEVOLUCAO');--> statement-breakpoint
CREATE TYPE "public"."cnab_layout" AS ENUM('CNAB240', 'CNAB400');--> statement-breakpoint
CREATE TYPE "public"."credit_type" AS ENUM('MENSAL', 'GERAL');--> statement-breakpoint
CREATE TYPE "public"."cst_origin" AS ENUM('0', '1', '2', '3', '4', '5', '6', '7', '8');--> statement-breakpoint
CREATE TYPE "public"."difal_calculation" AS ENUM('0', '1', '2');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('VENDA', 'ORCAMENTO');--> statement-breakpoint
CREATE TYPE "public"."entity_audit_action" AS ENUM('CREATE', 'UPDATE', 'SOFT_DELETE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('USERS', 'USERS_PERSONAL_INFO', 'USERS_ADDRESS', 'USERS_CONTACT', 'USERS_RELATIONSHIPS', 'USERS_TAX_INFOS', 'USERS_FINANCIAL_INFO', 'MEMBERS_PERSONAL_INFO', 'MEMBERS_ADDRESS', 'MEMBERS_CONTACT', 'MEMBERS_RELATIONSHIPS', 'MEMBERS_TAX_INFOS', 'MEMBERS_FINANCIAL_INFO', 'ENTERPRISES', 'ENTERPRISES_ADDRESS', 'ENTERPRISE_PARAMETERS', 'ENTERPRISES_MEMBERS', 'MEMBERS_DEPARTMENTS', 'MEMBER_PERMISSIONS_DEFAULT', 'MEMBER_EXTRA_PERMISSIONS', 'DEPARTMENTS', 'MODULES', 'MEMBER_MODULES', 'MODULE_PERMISSIONS', 'COUNTRIES', 'STATES', 'CITIES', 'CEPS', 'PRODUCTS', 'PRODUCTS_ENTERPRISES', 'MEASUREMENT_UNITS', 'PRODUCT_TYPES', 'TYPE_SPED', 'PRODUCTS_NCM', 'PRODUCTS_CEST', 'PRODUCTS_ANP', 'PRODUCTS_NBS', 'PRODUCT_GROUPS', 'PRODUCT_SUBGROUPS', 'PRODUCT_BRANDS', 'PIS_COFINS_SITUATION', 'ICMS_TAXATION', 'PRODUCT_PRICES', 'PROMOTIONAL_PRICES', 'PRODUCT_TAXATION', 'PRODUCT_APPLICATIONS', 'SECTORS', 'LOCATIONS', 'STOCK_BATCHES', 'STOCK_BATCH_BALANCES', 'SECTORS_RENTAL', 'STOCK_MIN_MAX', 'STOCK_MOVEMENTS', 'PAYMENT_TYPES', 'SALES', 'SALES_RETURNS', 'TYPE_NETWORKS', 'TYPE_SUPPLIER_CUSTOMERS', 'VEHICLES', 'VEHICLES_ENTERPRISES_MEMBERS', 'ENTERPRISES_MEMBER_SALES_ITEMS', 'MECHANIC_SALES_ITEMS', 'NFE_PARAMETERS', 'ENTERPRISES_NFE', 'ENTERPRISES_NFE_CERTIFICATES', 'CFOPS', 'CFOPS_ENTERPRISES', 'SITUATION_TRIBUTARY_CST', 'BENEFIT_CODE', 'CST_COMPATIVEL_BENEFIT', 'CST_IBS_CBS', 'CLASSIFICATION_IBS_CBS', 'ANEXOS_RT', 'NFE_HEADERS', 'NFE_OPERATIONS', 'NFE_OPERATIONS_STATES', 'BENEFIT_CODE_BY_CFOP', 'BENEFIT_TYPE_COSTUMERS', 'BENEFIT_CODE_BY_STATE_AND_PRODUCTS', 'STATES_DIVISIONS', 'PRESUMED_CREDIT', 'ENTERPRISE_GROUPS', 'PAYMENT_METHODS', 'TYPE_FLAGS', 'PAYMENT_TYPES_METHODS_FLAGS', 'FISCAL_DOCUMENT_MODELS', 'PRINTERS');--> statement-breakpoint
CREATE TYPE "public"."financial_direction" AS ENUM('RECEBER', 'PAGAR');--> statement-breakpoint
CREATE TYPE "public"."financial_installment_status" AS ENUM('ABERTA', 'PARCIAL', 'QUITADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."financial_kind" AS ENUM('PEDIDO', 'NFE', 'BOLETO', 'AVULSO', 'COMPRA');--> statement-breakpoint
CREATE TYPE "public"."financial_schedule_source" AS ENUM('PEDIDO', 'NFE', 'BOLETO');--> statement-breakpoint
CREATE TYPE "public"."financial_settlement_kind" AS ENUM('BAIXA', 'ABATIMENTO_DEVOLUCAO', 'ABATIMENTO_CREDITO', 'ESTORNO');--> statement-breakpoint
CREATE TYPE "public"."financial_source" AS ENUM('VENDA', 'MANUAL', 'COMPRA', 'DEVOLUCAO');--> statement-breakpoint
CREATE TYPE "public"."financial_title_status" AS ENUM('ABERTO', 'PARCIAL', 'QUITADO', 'CANCELADO', 'CONSOLIDADO');--> statement-breakpoint
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
CREATE TYPE "public"."marketplace_coupon_discount_type" AS ENUM('valor_fixo', 'porcentagem');--> statement-breakpoint
CREATE TYPE "public"."marketplace_coupon_redemption_status" AS ENUM('aplicado', 'liberado');--> statement-breakpoint
CREATE TYPE "public"."marketplace_coupon_scope" AS ENUM('qualquer_produto', 'produto');--> statement-breakpoint
CREATE TYPE "public"."marketplace_delivery_status" AS ENUM('pendente', 'preparando', 'enviado', 'pronto_retirada', 'entregue', 'retirado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."marketplace_delivery_type" AS ENUM('entrega', 'retirada');--> statement-breakpoint
CREATE TYPE "public"."marketplace_order_status" AS ENUM('confirmado', 'preparando', 'enviado', 'entregue', 'criado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."marketplace_payment_attempt_outcome" AS ENUM('pending', 'approved', 'rejected', 'canceled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."marketplace_payment_auth_type" AS ENUM('API_KEY', 'BEARER_TOKEN', 'OAUTH2', 'BASIC_AUTH', 'MTLS', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."marketplace_payment_config_status" AS ENUM('RASCUNHO', 'ATIVO', 'INATIVO');--> statement-breakpoint
CREATE TYPE "public"."marketplace_payment_environment" AS ENUM('sandbox', 'production');--> statement-breakpoint
CREATE TYPE "public"."marketplace_payment_provider" AS ENUM('mercadopago');--> statement-breakpoint
CREATE TYPE "public"."marketplace_payment_status" AS ENUM('pendente', 'aprovado', 'recusado', 'cancelado', 'estornado', 'expirado');--> statement-breakpoint
CREATE TYPE "public"."marketplace_store_payment_method" AS ENUM('pix', 'credito', 'boleto');--> statement-breakpoint
CREATE TYPE "public"."member_class" AS ENUM('ADMINISTRADOR', 'GERENTE', 'COLABORADOR', 'CLIENTE', 'TRANSPORTADOR', 'FORNECEDOR', 'PARCEIRO', 'SOCIO', 'INVESTIDOR', 'AUDITOR', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."member_credit_origin" AS ENUM('DEVOLUCAO', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."member_credit_status" AS ENUM('ABERTO', 'PARCIAL', 'UTILIZADO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."nfe_additional_note_type" AS ENUM('OBS_CONT', 'OBS_FISCO');--> statement-breakpoint
CREATE TYPE "public"."nfe_certificate_status" AS ENUM('ATIVO', 'SUBSTITUIDO');--> statement-breakpoint
CREATE TYPE "public"."nfe_entry_transport_kind" AS ENUM('DESPACHO', 'REDESPACHO');--> statement-breakpoint
CREATE TYPE "public"."nfe_event_type" AS ENUM('CANCELAMENTO', 'CARTA_CORRECAO', 'INUTILIZACAO', 'CANCELAMENTO_SUBSTITUICAO');--> statement-breakpoint
CREATE TYPE "public"."nfe_invoice_status" AS ENUM('PENDENTE', 'ASSINADA', 'AUTORIZADA', 'REJEITADA', 'CANCELADA', 'DENEGADA', 'INUTILIZADA');--> statement-breakpoint
CREATE TYPE "public"."nfe_issuance_type" AS ENUM('PROPRIA', 'TERCEIRO');--> statement-breakpoint
CREATE TYPE "public"."nfe_manifestation_type" AS ENUM('CIENCIA', 'CONFIRMACAO', 'DESCONHECIMENTO', 'OPERACAO_NAO_REALIZADA');--> statement-breakpoint
CREATE TYPE "public"."nfe_moviments" AS ENUM('ENTRADA', 'SAIDA');--> statement-breakpoint
CREATE TYPE "public"."nfe_place_type" AS ENUM('RETIRADA', 'ENTREGA');--> statement-breakpoint
CREATE TYPE "public"."nfe_reference_type" AS ENUM('NFE', 'CTE', 'NF', 'NFP', 'ECF');--> statement-breakpoint
CREATE TYPE "public"."order_service_model" AS ENUM('VEICULO');--> statement-breakpoint
CREATE TYPE "public"."owner_type" AS ENUM('PROPRIETARIO', 'LOCATARIO', 'OUTROS');--> statement-breakpoint
CREATE TYPE "public"."password_reset_check_status" AS ENUM('PENDENTE', 'VERIFICADO');--> statement-breakpoint
CREATE TYPE "public"."payment_method_integration" AS ENUM('0', '1', '2');--> statement-breakpoint
CREATE TYPE "public"."payment_method_type" AS ENUM('1', '2', '3', '4', '5');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('A_VISTA', 'A_PRAZO', 'OUTROS');--> statement-breakpoint
CREATE TYPE "public"."pis_cofins_framing" AS ENUM('1', '2', '3', '4', '5', '6', '7');--> statement-breakpoint
CREATE TYPE "public"."pis_cofins_type" AS ENUM('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."regime_tributario" AS ENUM('1', '2', '3', '4');--> statement-breakpoint
CREATE TYPE "public"."remittance_movement" AS ENUM('REGISTRO', 'ALTERACAO_VENCIMENTO', 'PEDIDO_BAIXA');--> statement-breakpoint
CREATE TYPE "public"."remittance_status" AS ENUM('GERADA', 'PROCESSADA');--> statement-breakpoint
CREATE TYPE "public"."return_occurrence" AS ENUM('REGISTRO_CONFIRMADO', 'REGISTRO_REJEITADO', 'LIQUIDACAO', 'BAIXA');--> statement-breakpoint
CREATE TYPE "public"."sale_conversion_closure_kind" AS ENUM('PARCIAL', 'TOTAL');--> statement-breakpoint
CREATE TYPE "public"."sale_conversion_type" AS ENUM('ORCAMENTO-VENDA', 'ORCAMENTO-ORDEM_SERVICO', 'ORDEM_SERVICO-VENDA');--> statement-breakpoint
CREATE TYPE "public"."sale_origin" AS ENUM('WEB', 'MOBILE', 'DESKTOP');--> statement-breakpoint
CREATE TYPE "public"."sale_return_kind" AS ENUM('PARCIAL', 'TOTAL');--> statement-breakpoint
CREATE TYPE "public"."sale_return_situation" AS ENUM('SEM_DEVOLUCAO', 'PARCIAL', 'TOTAL');--> statement-breakpoint
CREATE TYPE "public"."sale_return_status" AS ENUM('ABERTA', 'FINALIZADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."sale_service_type" AS ENUM('SERVICO', 'GARANTIA');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('ABERTA', 'FINALIZADA', 'CANCELADA', 'INATIVA', 'PARCIAL');--> statement-breakpoint
CREATE TYPE "public"."sale_type" AS ENUM('VENDA', 'ORCAMENTO', 'DEVOLUCAO', 'CANCELAMENTO', 'ORDEM DE SERVICO');--> statement-breakpoint
CREATE TYPE "public"."sequence_type" AS ENUM('VENDA', 'NFE', 'NFSE', 'NFCE', 'MDFE', 'CTE', 'MEMBRO', 'PRODUTO');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('ATIVO', 'INATIVO', 'BLOQUEADO', 'PENDENTE', 'ESPECIAL', 'COBRANCA', 'NAO_VENDER', 'FUNCIONARIO');--> statement-breakpoint
CREATE TYPE "public"."status_permission" AS ENUM('ALLOW', 'DENIED');--> statement-breakpoint
CREATE TYPE "public"."stock_batch_status" AS ENUM('ATIVO', 'BLOQUEADO', 'ESGOTADO');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE', 'PERDA', 'VENDA', 'COMPRA', 'DEVOLUCAO', 'CANCELAMENTO', 'OUTROS');--> statement-breakpoint
CREATE TYPE "public"."taxation_type" AS ENUM('1', '2', '3', '4');--> statement-breakpoint
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
	"generate_st" boolean DEFAULT false NOT NULL,
	"difal_calculation" "difal_calculation" DEFAULT '0',
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
CREATE TABLE "states_divisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"states_id" uuid NOT NULL,
	"uf" varchar(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "enterprise_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
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
	"state_registration" varchar(14),
	"municipal_registration" varchar(15),
	"suframa_registration" varchar(9),
	"crt" "regime_tributario",
	"logo_url" varchar(500),
	"pdf_folder" varchar(500),
	"group_id" uuid,
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
	"additional_member" text,
	"post_sales_status" "status" DEFAULT 'PENDENTE' NOT NULL,
	"class" "member_class" NOT NULL,
	"observations" varchar(500),
	"photo_url" varchar(500),
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
	"enterprise_id" uuid NOT NULL,
	"description" varchar(255) NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "type_supplier_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"description" varchar(255) NOT NULL,
	"low" boolean DEFAULT false NOT NULL,
	"generates_st" boolean DEFAULT false NOT NULL,
	"end_consumer" boolean DEFAULT false NOT NULL,
	"classification" "type_classification_customers" DEFAULT 'CLIENTE' NOT NULL,
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
	"icms" varchar(4) NOT NULL,
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
	"framing" "pis_cofins_framing" NOT NULL,
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
	"additional_product" text,
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
	"product_taxation_id" uuid NOT NULL,
	"classification_ibs_cbs_id" uuid,
	"controls_batch" boolean DEFAULT false NOT NULL,
	"controls_rental" boolean DEFAULT false NOT NULL,
	"photo_url" varchar(500),
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
CREATE TABLE "marketplace_cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"enterprises_members_id" uuid NOT NULL,
	"marketplace_product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "marketplace_cart_items_quantity_chk" CHECK ("marketplace_cart_items"."quantity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "marketplace_delivery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_delivery_items_quantity_chk" CHECK ("marketplace_delivery_items"."quantity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "marketplace_deliverys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"type" "marketplace_delivery_type" NOT NULL,
	"status" "marketplace_delivery_status" DEFAULT 'pendente' NOT NULL,
	"recipient_name" varchar(255),
	"recipient_phone" varchar(32),
	"address_label" varchar(100),
	"address_zip" varchar(16),
	"address_street" varchar(255),
	"address_number" varchar(32),
	"address_complement" varchar(255),
	"address_district" varchar(255),
	"address_city" varchar(255),
	"address_state" varchar(2),
	"shipping" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" varchar(500),
	"tracking_code" varchar(100),
	"estimated_at" timestamp with time zone,
	"ready_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketplace_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"enterprises_members_id" uuid NOT NULL,
	"marketplace_product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"marketplace_product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"image" varchar(500),
	"unit_price" numeric(15, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_order_items_quantity_chk" CHECK ("marketplace_order_items"."quantity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "marketplace_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"enterprises_members_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"status" "marketplace_order_status" DEFAULT 'criado' NOT NULL,
	"payment_method" "marketplace_store_payment_method",
	"payment_status" "marketplace_payment_status" DEFAULT 'pendente' NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"contact_phone" varchar(32),
	"address_label" varchar(100),
	"address_recipient" varchar(255),
	"address_phone" varchar(32),
	"address_zip" varchar(16),
	"address_street" varchar(255),
	"address_number" varchar(32),
	"address_complement" varchar(255),
	"address_district" varchar(255),
	"address_city" varchar(255),
	"address_state" varchar(2),
	"subtotal" numeric(15, 2) NOT NULL,
	"shipping" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"coupon_code" varchar(32),
	"coupon_id" uuid,
	"total" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "marketplace_orders_discount_amount_chk" CHECK ("marketplace_orders"."discount_amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "marketplace_product_characteristics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marketplace_product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"value" varchar(500) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketplace_product_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marketplace_product_id" uuid NOT NULL,
	"photo_url" varchar(500) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketplace_product_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marketplace_product_id" uuid NOT NULL,
	"enterprises_members_id" uuid,
	"question" text NOT NULL,
	"answer" text,
	"answered_at" timestamp with time zone,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketplace_product_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marketplace_product_id" uuid NOT NULL,
	"enterprises_members_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(255),
	"comment" text,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "marketplace_product_reviews_rating_chk" CHECK ("marketplace_product_reviews"."rating" >= 1 and "marketplace_product_reviews"."rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE "marketplace_product_variant_option_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"value" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketplace_product_variant_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marketplace_product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketplace_product_variant_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"option_value_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marketplace_product_id" uuid NOT NULL,
	"sku" varchar(100),
	"products_enterprises_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketplace_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"slug" varchar(255) NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"free_shipping" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"store_title" varchar(255),
	"store_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketplace_coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"coupon_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"enterprises_members_id" uuid NOT NULL,
	"discount_amount" numeric(15, 2) NOT NULL,
	"status" "marketplace_coupon_redemption_status" DEFAULT 'aplicado' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketplace_coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"discount_type" "marketplace_coupon_discount_type" NOT NULL,
	"discount_value" numeric(15, 2) NOT NULL,
	"scope" "marketplace_coupon_scope" NOT NULL,
	"marketplace_product_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"max_uses" integer,
	"max_uses_per_customer" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "marketplace_coupons_discount_value_positive_chk" CHECK ("marketplace_coupons"."discount_value" > 0),
	CONSTRAINT "marketplace_coupons_percentage_max_chk" CHECK ("marketplace_coupons"."discount_type" <> 'porcentagem' OR "marketplace_coupons"."discount_value" <= 100),
	CONSTRAINT "marketplace_coupons_scope_product_chk" CHECK (("marketplace_coupons"."scope" = 'produto' AND "marketplace_coupons"."marketplace_product_id" IS NOT NULL)
        OR ("marketplace_coupons"."scope" = 'qualquer_produto' AND "marketplace_coupons"."marketplace_product_id" IS NULL)),
	CONSTRAINT "marketplace_coupons_max_uses_chk" CHECK ("marketplace_coupons"."max_uses" IS NULL OR "marketplace_coupons"."max_uses" >= 1),
	CONSTRAINT "marketplace_coupons_max_uses_per_customer_chk" CHECK ("marketplace_coupons"."max_uses_per_customer" >= 1),
	CONSTRAINT "marketplace_coupons_validity_chk" CHECK ("marketplace_coupons"."starts_at" IS NULL OR "marketplace_coupons"."ends_at" IS NULL OR "marketplace_coupons"."starts_at" <= "marketplace_coupons"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "marketplace_payment_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"provider" "marketplace_payment_provider" NOT NULL,
	"environment" "marketplace_payment_environment" NOT NULL,
	"auth_type" "marketplace_payment_auth_type" DEFAULT 'BEARER_TOKEN' NOT NULL,
	"status" "marketplace_payment_config_status" DEFAULT 'RASCUNHO' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"label" varchar(120),
	"external_account_id" varchar(120),
	"public_key" varchar(255),
	"settings" jsonb,
	"api_key_header" varchar(120),
	"client_id" varchar(255),
	"basic_username" varchar(255),
	"certificate_pem" text,
	"token_expires_at" timestamp with time zone,
	"api_key_encrypted" text,
	"access_token_encrypted" text,
	"client_secret_encrypted" text,
	"refresh_token_encrypted" text,
	"basic_password_encrypted" text,
	"private_key_encrypted" text,
	"certificate_password_encrypted" text,
	"webhook_secret_encrypted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "marketplace_payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"provider" "marketplace_payment_provider" NOT NULL,
	"event_id" varchar(160) NOT NULL,
	"kind" varchar(64) NOT NULL,
	"summary" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"config_id" uuid NOT NULL,
	"provider" "marketplace_payment_provider" NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"provider_order_id" varchar(120),
	"provider_payment_id" varchar(120),
	"method" "marketplace_store_payment_method" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"outcome" "marketplace_payment_attempt_outcome" DEFAULT 'pending' NOT NULL,
	"provider_status" varchar(64),
	"provider_status_detail" varchar(64),
	"client_action" jsonb,
	"expires_at" timestamp with time zone,
	"last_polled_at" timestamp with time zone,
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
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"payment_code" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"type" "payment_method_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"description" varchar(255) NOT NULL,
	"payment_type" "payment_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_types_methods_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"payment_methods_id" uuid NOT NULL,
	"payment_types_id" uuid NOT NULL,
	"type_flags_id" uuid,
	"sped1601" boolean DEFAULT false NOT NULL,
	"generate_charge" boolean DEFAULT false NOT NULL,
	"integration" "payment_method_integration" NOT NULL,
	"band_member_id" uuid,
	"intermediary_member_id" uuid,
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
	"payment_types_methods_flags_id" uuid,
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
CREATE TABLE "type_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"flag_code" varchar(255) NOT NULL,
	"description" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
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
CREATE TABLE "anexos_rt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"products_ncm_id" uuid NOT NULL,
	"date_fim" date NOT NULL,
	"legislation" varchar(50) NOT NULL,
	"anexo" varchar(20) NOT NULL,
	"cst_ibs_cbs_id" uuid NOT NULL,
	"classification_ibs_cbs_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "benefit_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uf" varchar(2) NOT NULL,
	"code_benefit" varchar(10) NOT NULL,
	"description_benefit" text,
	"observation_benefit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "benefit_code_uf_chk" CHECK ("benefit_code"."uf" in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'))
);
--> statement-breakpoint
CREATE TABLE "benefit_code_by_cfop" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cfop" varchar(4) NOT NULL,
	"cst" varchar(2) NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"benefit_code_id" uuid NOT NULL,
	"reduction_percentage" numeric(15, 10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "benefit_code_by_cfop_cfop_chk" CHECK ("benefit_code_by_cfop"."cfop" ~ '^[0-9]{4}$'),
	CONSTRAINT "benefit_code_by_cfop_cst_chk" CHECK ("benefit_code_by_cfop"."cst" ~ '^[0-9]{2}$'),
	CONSTRAINT "benefit_code_by_cfop_benefit_code_chk" CHECK ("benefit_code_by_cfop"."benefit_code_id" is not null),
	CONSTRAINT "benefit_code_by_cfop_enterprises_chk" CHECK ("benefit_code_by_cfop"."enterprises_id" is not null),
	CONSTRAINT "benefit_code_by_cfop_reduction_percentage_chk" CHECK ("benefit_code_by_cfop"."reduction_percentage" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "benefit_code_by_state_and_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"state_id" uuid NOT NULL,
	"cfop" varchar(4) NOT NULL,
	"cst" varchar(2) NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"benefit_code_id" uuid NOT NULL,
	"reduction_percentage" numeric(15, 10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "benefit_state_products_state_chk" CHECK ("benefit_code_by_state_and_products"."state_id" is not null),
	CONSTRAINT "benefit_state_products_cfop_chk" CHECK ("benefit_code_by_state_and_products"."cfop" ~ '^[0-9]{4}$'),
	CONSTRAINT "benefit_state_products_cst_chk" CHECK ("benefit_code_by_state_and_products"."cst" ~ '^[0-9]{2}$'),
	CONSTRAINT "benefit_state_products_products_enterprises_chk" CHECK ("benefit_code_by_state_and_products"."products_enterprises_id" is not null),
	CONSTRAINT "benefit_state_products_reduction_percentage_chk" CHECK ("benefit_code_by_state_and_products"."reduction_percentage" between 0 and 100),
	CONSTRAINT "benefit_state_products_enterprises_chk" CHECK ("benefit_code_by_state_and_products"."enterprises_id" is not null),
	CONSTRAINT "benefit_state_products_benefit_code_chk" CHECK ("benefit_code_by_state_and_products"."benefit_code_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "benefit_type_costumers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cfop" varchar(4) NOT NULL,
	"cst" varchar(2) NOT NULL,
	"type_supplier_customer_id" uuid NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"benefit_code_id" uuid NOT NULL,
	"reduction_percentage" numeric(15, 10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "benefit_type_costumers_cfop_chk" CHECK ("benefit_type_costumers"."cfop" ~ '^[0-9]{4}$'),
	CONSTRAINT "benefit_type_costumers_cst_chk" CHECK ("benefit_type_costumers"."cst" ~ '^[0-9]{2}$'),
	CONSTRAINT "benefit_type_costumers_reduction_percentage_chk" CHECK ("benefit_type_costumers"."reduction_percentage" between 0 and 100),
	CONSTRAINT "benefit_type_costumers_enterprises_chk" CHECK ("benefit_type_costumers"."enterprise_id" is not null),
	CONSTRAINT "benefit_type_costumers_benefit_code_chk" CHECK ("benefit_type_costumers"."benefit_code_id" is not null),
	CONSTRAINT "benefit_type_costumers_type_supplier_customer_chk" CHECK ("benefit_type_costumers"."type_supplier_customer_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "cfops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cfop" varchar(4) NOT NULL,
	"description" varchar(255) NOT NULL,
	"generate_revenue" boolean DEFAULT false NOT NULL,
	"issued_nfce" boolean DEFAULT false NOT NULL,
	"moviment_type" "cfop_moviment_type" NOT NULL,
	"cfop_for_fuels" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "cfops_generate_revenue_chk" CHECK ("cfops"."generate_revenue" = true or "cfops"."generate_revenue" = false),
	CONSTRAINT "cfops_issued_nfce_chk" CHECK ("cfops"."issued_nfce" = true or "cfops"."issued_nfce" = false),
	CONSTRAINT "cfops_moviment_type_chk" CHECK ("cfops"."moviment_type" in ('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'DEVOLUCAO')),
	CONSTRAINT "cfops_cfop_for_fuels_chk" CHECK ("cfops"."cfop_for_fuels" = true or "cfops"."cfop_for_fuels" = false)
);
--> statement-breakpoint
CREATE TABLE "cfops_enterprises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"cfop_id" uuid NOT NULL,
	"addition_cfop" text,
	"edit_description" boolean DEFAULT false NOT NULL,
	"calculates_difal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "cfops_enterprises_edit_description_chk" CHECK ("cfops_enterprises"."edit_description" = true or "cfops_enterprises"."edit_description" = false),
	CONSTRAINT "cfops_enterprises_calculates_difal_chk" CHECK ("cfops_enterprises"."calculates_difal" = true or "cfops_enterprises"."calculates_difal" = false)
);
--> statement-breakpoint
CREATE TABLE "classification_ibs_cbs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cst_ibs_cbs_id" uuid NOT NULL,
	"c_class_trib" varchar(6) NOT NULL,
	"name_class_trib" varchar(255) NOT NULL,
	"description_class_trib" text,
	"lc_redacao" text,
	"lc_214_25" varchar(255),
	"p_red_ibs" numeric(15, 10),
	"p_red_cbs" numeric(15, 10),
	"ind_g_trib_regular" varchar(1) NOT NULL,
	"c_class_trib_regular" varchar(6),
	"ind_g_cred_pres_oper" varchar(1) NOT NULL,
	"ind_g_mono_padrao" varchar(1) NOT NULL,
	"ind_mono_reten" varchar(1) NOT NULL,
	"ind_mono_ret" varchar(1) NOT NULL,
	"ind_mono_dif" varchar(1) NOT NULL,
	"ind_g_estorno_cred" varchar(1) NOT NULL,
	"credito_para" varchar(1) NOT NULL,
	"d_ini_vig" date,
	"d_fim_vig" date,
	"update_date" date,
	"ind_nfe_abi" varchar(1) NOT NULL,
	"ind_nfe" varchar(1) NOT NULL,
	"ind_nfce" varchar(1) NOT NULL,
	"ind_cte" varchar(1) NOT NULL,
	"ind_cte_os" varchar(1) NOT NULL,
	"ind_bpe" varchar(1) NOT NULL,
	"ind_bpe_ta" varchar(1) NOT NULL,
	"ind_bpe_tm" varchar(1) NOT NULL,
	"ind_nf3e" varchar(1) NOT NULL,
	"ind_nfse" varchar(1) NOT NULL,
	"ind_nfse_via" varchar(1) NOT NULL,
	"ind_nfcom" varchar(1) NOT NULL,
	"ind_nfag" varchar(1) NOT NULL,
	"ind_nfgas" varchar(1) NOT NULL,
	"ind_dere" varchar(1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "classification_ibs_cbs_c_class_trib_chk" CHECK ("classification_ibs_cbs"."c_class_trib" between '000001' and '999999'),
	CONSTRAINT "classification_ibs_cbs_name_class_trib_chk" CHECK ("classification_ibs_cbs"."name_class_trib" is not null),
	CONSTRAINT "classification_ibs_cbs_description_class_trib_chk" CHECK ("classification_ibs_cbs"."description_class_trib" is not null),
	CONSTRAINT "classification_ibs_cbs_ind_gTribRegular_chk" CHECK ("classification_ibs_cbs"."ind_g_trib_regular" = '0' or "classification_ibs_cbs"."ind_g_trib_regular" = '1'),
	CONSTRAINT "classification_ibs_cbs_c_class_trib_regular_chk" CHECK (("classification_ibs_cbs"."ind_g_trib_regular" = '1' and "classification_ibs_cbs"."c_class_trib_regular" ~ '^[0-9]{6}$') or ("classification_ibs_cbs"."ind_g_trib_regular" = '0' and "classification_ibs_cbs"."c_class_trib_regular" is null)),
	CONSTRAINT "classification_ibs_cbs_ind_gCredPresOper_chk" CHECK ("classification_ibs_cbs"."ind_g_cred_pres_oper" = '0' or "classification_ibs_cbs"."ind_g_cred_pres_oper" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_gMonoPadrao_chk" CHECK ("classification_ibs_cbs"."ind_g_mono_padrao" = '0' or "classification_ibs_cbs"."ind_g_mono_padrao" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_mono_reten_chk" CHECK ("classification_ibs_cbs"."ind_mono_reten" = '0' or "classification_ibs_cbs"."ind_mono_reten" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_mono_ret_chk" CHECK ("classification_ibs_cbs"."ind_mono_ret" = '0' or "classification_ibs_cbs"."ind_mono_ret" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_mono_dif_chk" CHECK ("classification_ibs_cbs"."ind_mono_dif" = '0' or "classification_ibs_cbs"."ind_mono_dif" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_gEstornoCred_chk" CHECK ("classification_ibs_cbs"."ind_g_estorno_cred" = '0' or "classification_ibs_cbs"."ind_g_estorno_cred" = '1'),
	CONSTRAINT "classification_ibs_cbs_credito_para_chk" CHECK ("classification_ibs_cbs"."credito_para" = '0' or "classification_ibs_cbs"."credito_para" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_nfe_abi_chk" CHECK ("classification_ibs_cbs"."ind_nfe_abi" = '0' or "classification_ibs_cbs"."ind_nfe_abi" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_nfe_chk" CHECK ("classification_ibs_cbs"."ind_nfe" = '0' or "classification_ibs_cbs"."ind_nfe" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_nfce_chk" CHECK ("classification_ibs_cbs"."ind_nfce" = '0' or "classification_ibs_cbs"."ind_nfce" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_cte_chk" CHECK ("classification_ibs_cbs"."ind_cte" = '0' or "classification_ibs_cbs"."ind_cte" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_cte_os_chk" CHECK ("classification_ibs_cbs"."ind_cte_os" = '0' or "classification_ibs_cbs"."ind_cte_os" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_bpe_chk" CHECK ("classification_ibs_cbs"."ind_bpe" = '0' or "classification_ibs_cbs"."ind_bpe" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_bpe_ta_chk" CHECK ("classification_ibs_cbs"."ind_bpe_ta" = '0' or "classification_ibs_cbs"."ind_bpe_ta" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_bpe_tm_chk" CHECK ("classification_ibs_cbs"."ind_bpe_tm" = '0' or "classification_ibs_cbs"."ind_bpe_tm" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_nf3e_chk" CHECK ("classification_ibs_cbs"."ind_nf3e" = '0' or "classification_ibs_cbs"."ind_nf3e" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_nfse_chk" CHECK ("classification_ibs_cbs"."ind_nfse" = '0' or "classification_ibs_cbs"."ind_nfse" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_nfse_via_chk" CHECK ("classification_ibs_cbs"."ind_nfse_via" = '0' or "classification_ibs_cbs"."ind_nfse_via" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_nfcom_chk" CHECK ("classification_ibs_cbs"."ind_nfcom" = '0' or "classification_ibs_cbs"."ind_nfcom" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_nfag_chk" CHECK ("classification_ibs_cbs"."ind_nfag" = '0' or "classification_ibs_cbs"."ind_nfag" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_nfgas_chk" CHECK ("classification_ibs_cbs"."ind_nfgas" = '0' or "classification_ibs_cbs"."ind_nfgas" = '1'),
	CONSTRAINT "classification_ibs_cbs_ind_dere_chk" CHECK ("classification_ibs_cbs"."ind_dere" = '0' or "classification_ibs_cbs"."ind_dere" = '1')
);
--> statement-breakpoint
CREATE TABLE "cst_compativel_benefit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benefit_code_id" uuid NOT NULL,
	"situation_tributary_cst_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "cst_compativel_benefit_benefit_code_chk" CHECK ("cst_compativel_benefit"."benefit_code_id" is not null),
	CONSTRAINT "cst_compativel_benefit_situation_tributary_cst_chk" CHECK ("cst_compativel_benefit"."situation_tributary_cst_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "cst_ibs_cbs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" boolean DEFAULT true NOT NULL,
	"cst" varchar(3) NOT NULL,
	"description" varchar(255) NOT NULL,
	"ind_gIBSCBS" varchar(1) NOT NULL,
	"ind_gIBSCBSMono" varchar(1) NOT NULL,
	"ind_gRED" varchar(1) NOT NULL,
	"ind_gDif" varchar(1) NOT NULL,
	"ind_gTransfCred" varchar(1) NOT NULL,
	"ind_gCredPresIBSZFM" varchar(1) NOT NULL,
	"ind_gAjusteCompet" varchar(1) NOT NULL,
	"ind_RedutorBC" varchar(1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "cst_ibs_cbs_status_chk" CHECK ("cst_ibs_cbs"."status" = true or "cst_ibs_cbs"."status" = false),
	CONSTRAINT "cst_ibs_cbs_ind_gIBSCBS_chk" CHECK ("cst_ibs_cbs"."ind_gIBSCBS" = '0' or "cst_ibs_cbs"."ind_gIBSCBS" = '1'),
	CONSTRAINT "cst_ibs_cbs_ind_gIBSCBSMono_chk" CHECK ("cst_ibs_cbs"."ind_gIBSCBSMono" = '0' or "cst_ibs_cbs"."ind_gIBSCBSMono" = '1'),
	CONSTRAINT "cst_ibs_cbs_ind_gRED_chk" CHECK ("cst_ibs_cbs"."ind_gRED" = '0' or "cst_ibs_cbs"."ind_gRED" = '1'),
	CONSTRAINT "cst_ibs_cbs_ind_gDif_chk" CHECK ("cst_ibs_cbs"."ind_gDif" = '0' or "cst_ibs_cbs"."ind_gDif" = '1'),
	CONSTRAINT "cst_ibs_cbs_ind_gTransfCred_chk" CHECK ("cst_ibs_cbs"."ind_gTransfCred" = '0' or "cst_ibs_cbs"."ind_gTransfCred" = '1'),
	CONSTRAINT "cst_ibs_cbs_ind_gCredPresIBSZFM_chk" CHECK ("cst_ibs_cbs"."ind_gCredPresIBSZFM" = '0' or "cst_ibs_cbs"."ind_gCredPresIBSZFM" = '1'),
	CONSTRAINT "cst_ibs_cbs_ind_gAjusteCompet_chk" CHECK ("cst_ibs_cbs"."ind_gAjusteCompet" = '0' or "cst_ibs_cbs"."ind_gAjusteCompet" = '1'),
	CONSTRAINT "cst_ibs_cbs_ind_RedutorBC_chk" CHECK ("cst_ibs_cbs"."ind_RedutorBC" = '0' or "cst_ibs_cbs"."ind_RedutorBC" = '1')
);
--> statement-breakpoint
CREATE TABLE "enterprises_nfe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"ambiente" smallint DEFAULT 2 NOT NULL,
	"serie_nfe" integer DEFAULT 1 NOT NULL,
	"serie_nfce" integer DEFAULT 1 NOT NULL,
	"id_csc" varchar(6),
	"csc_encrypted" text,
	"tipo_emissao" smallint DEFAULT 1 NOT NULL,
	"resp_tec_cnpj" varchar(14),
	"resp_tec_contato" varchar(60),
	"resp_tec_email" varchar(60),
	"resp_tec_fone" varchar(14),
	"resp_tec_id_csrt" varchar(2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "enterprises_nfe_ambiente_chk" CHECK ("enterprises_nfe"."ambiente" in (1, 2)),
	CONSTRAINT "enterprises_nfe_serie_nfe_chk" CHECK ("enterprises_nfe"."serie_nfe" >= 0 and "enterprises_nfe"."serie_nfe" <= 999),
	CONSTRAINT "enterprises_nfe_serie_nfce_chk" CHECK ("enterprises_nfe"."serie_nfce" >= 0 and "enterprises_nfe"."serie_nfce" <= 999),
	CONSTRAINT "enterprises_nfe_tipo_emissao_chk" CHECK ("enterprises_nfe"."tipo_emissao" in (1, 2, 4, 5, 6, 7, 9))
);
--> statement-breakpoint
CREATE TABLE "enterprises_nfe_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"pfx" "bytea" NOT NULL,
	"password_encrypted" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"cnpj" varchar(14),
	"subject" varchar(500),
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"status" "nfe_certificate_status" DEFAULT 'ATIVO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "enterprises_print_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"document_model_code" varchar(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fiscal_document_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(2) NOT NULL,
	"description" varchar(255) NOT NULL,
	"electronic" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "fiscal_document_models_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "nfe_additional_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_header_id" uuid NOT NULL,
	"note_type" "nfe_additional_note_type" NOT NULL,
	"n_seq" integer NOT NULL,
	"x_campo" varchar(20) NOT NULL,
	"x_texto" varchar(60) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_additional_notes_seq_chk" CHECK ("nfe_additional_notes"."n_seq" >= 1 and "nfe_additional_notes"."n_seq" <= 10)
);
--> statement-breakpoint
CREATE TABLE "nfe_advance_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_header_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"ref_nfe" varchar(44) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_advance_payments_seq_chk" CHECK ("nfe_advance_payments"."n_seq" >= 1 and "nfe_advance_payments"."n_seq" <= 100),
	CONSTRAINT "nfe_advance_payments_ref_nfe_chk" CHECK ("nfe_advance_payments"."ref_nfe" ~ '^[0-9]{44}$')
);
--> statement-breakpoint
CREATE TABLE "nfe_dfe_cursors" (
	"enterprise_id" uuid PRIMARY KEY NOT NULL,
	"ult_nsu" varchar(15) DEFAULT '000000000000000' NOT NULL,
	"max_nsu" varchar(15),
	"blocked_until" timestamp with time zone,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_dfe_cursors_ult_nsu_chk" CHECK ("nfe_dfe_cursors"."ult_nsu" ~ '^[0-9]{15}$'),
	CONSTRAINT "nfe_dfe_cursors_max_nsu_chk" CHECK ("nfe_dfe_cursors"."max_nsu" is null or "nfe_dfe_cursors"."max_nsu" ~ '^[0-9]{15}$')
);
--> statement-breakpoint
CREATE TABLE "nfe_duplicates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_header_id" uuid NOT NULL,
	"n_dup" varchar(60) NOT NULL,
	"d_venc" date NOT NULL,
	"v_dup" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nfe_entry_transports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_header_id" uuid NOT NULL,
	"kind" "nfe_entry_transport_kind" NOT NULL,
	"member_id" uuid,
	"paid" boolean DEFAULT false NOT NULL,
	"freight_value" numeric(15, 2),
	"ipi" boolean DEFAULT false NOT NULL,
	"calculation_base" boolean DEFAULT false NOT NULL,
	"incidence_rate" numeric(15, 10),
	"incidence_value" numeric(15, 2),
	"knowledge" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nfe_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"nfe_header_id" uuid,
	"event_type" "nfe_event_type" NOT NULL,
	"tp_evento" varchar(6),
	"n_seq_evento" integer DEFAULT 1 NOT NULL,
	"dh_evento" timestamp with time zone NOT NULL,
	"descricao" text,
	"n_prot" varchar(15),
	"c_stat" varchar(3),
	"x_motivo" varchar(255),
	"xml_evento" text,
	"mod" varchar(2),
	"serie" varchar(3),
	"ano" varchar(2),
	"n_nf_ini" integer,
	"n_nf_fin" integer,
	"chave" varchar(44),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_events_header_chk" CHECK (("nfe_events"."event_type" = 'INUTILIZACAO' and "nfe_events"."nfe_header_id" is null) or ("nfe_events"."event_type" <> 'INUTILIZACAO' and "nfe_events"."nfe_header_id" is not null)),
	CONSTRAINT "nfe_events_seq_chk" CHECK ("nfe_events"."n_seq_evento" >= 1 and "nfe_events"."n_seq_evento" <= 20),
	CONSTRAINT "nfe_events_chave_chk" CHECK ("nfe_events"."chave" is null or "nfe_events"."chave" ~ '^[0-9]{44}$')
);
--> statement-breakpoint
CREATE TABLE "nfe_headers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"issuance_type" "nfe_issuance_type" DEFAULT 'PROPRIA' NOT NULL,
	"moviments" "nfe_moviments" DEFAULT 'SAIDA' NOT NULL,
	"status" "nfe_invoice_status" DEFAULT 'PENDENTE' NOT NULL,
	"chave" varchar(44) NOT NULL,
	"c_uf" varchar(2) NOT NULL,
	"c_nf" varchar(8) NOT NULL,
	"versao" varchar(10),
	"nat_op" varchar(60),
	"mod" varchar(2) NOT NULL,
	"serie" varchar(3) NOT NULL,
	"n_nf" integer NOT NULL,
	"entry_date" timestamp with time zone,
	"entry_dispensed_at" timestamp with time zone,
	"dh_emi" timestamp with time zone NOT NULL,
	"dh_sai_ent" timestamp with time zone,
	"tp_nf" varchar(1),
	"id_dest" varchar(1),
	"c_mun_fg" integer NOT NULL,
	"c_mun_fg_ibs" integer,
	"tp_imp" varchar(1),
	"tp_emis" smallint NOT NULL,
	"c_dv" varchar(1),
	"tp_amb" smallint NOT NULL,
	"fin_nfe" varchar(1),
	"tp_nf_debito" varchar(2),
	"tp_nf_credito" varchar(2),
	"tp_ente_gov" varchar(1),
	"p_redutor" numeric(15, 4),
	"tp_oper_gov" varchar(1),
	"ind_final" varchar(1),
	"ind_pres" varchar(1),
	"ind_intermed" varchar(1),
	"intermed_cnpj" varchar(14),
	"intermed_id_cad_int_tran" varchar(60),
	"proc_emi" varchar(1),
	"ver_proc" varchar(20),
	"dh_cont" timestamp with time zone,
	"x_just" varchar(256),
	"c_stat" varchar(3),
	"x_motivo" varchar(255),
	"n_prot" varchar(15),
	"dh_recbto" timestamp with time zone,
	"dig_val" varchar(28),
	"xml_arquivo" varchar(512),
	"xml_autorizado" text,
	"emit_member_id" uuid,
	"emit_cnpj" varchar(14),
	"emit_cpf" varchar(11),
	"emit_x_nome" varchar(60),
	"emit_x_fant" varchar(60),
	"emit_ie" varchar(14),
	"emit_iest" varchar(14),
	"emit_im" varchar(15),
	"emit_cnae" varchar(7),
	"emit_crt" varchar(1),
	"emit_xlgr" varchar(60),
	"emit_nro" varchar(60),
	"emit_xcpl" varchar(60),
	"emit_xbairro" varchar(60),
	"emit_cmun" varchar(7),
	"emit_xmun" varchar(60),
	"emit_uf" varchar(2),
	"emit_cep" varchar(8),
	"emit_cpais" varchar(4),
	"emit_xpais" varchar(60),
	"emit_fone" varchar(14),
	"dest_member_id" uuid,
	"dest_cnpj" varchar(14),
	"dest_cpf" varchar(11),
	"dest_id_estrangeiro" varchar(20),
	"dest_x_nome" varchar(60),
	"dest_ind_ie_dest" varchar(1),
	"dest_ie" varchar(14),
	"dest_isuf" varchar(9),
	"dest_im" varchar(15),
	"dest_email" varchar(60),
	"dest_xlgr" varchar(60),
	"dest_nro" varchar(60),
	"dest_xcpl" varchar(60),
	"dest_xbairro" varchar(60),
	"dest_cmun" varchar(7),
	"dest_xmun" varchar(60),
	"dest_uf" varchar(2),
	"dest_cep" varchar(8),
	"dest_cpais" varchar(4),
	"dest_xpais" varchar(60),
	"dest_fone" varchar(14),
	"exporta_uf_saida_pais" varchar(2),
	"exporta_x_loc_exporta" varchar(60),
	"exporta_x_loc_despacho" varchar(60),
	"inf_ad_fisco" varchar(2000),
	"inf_cpl" varchar(5000),
	"qr_code" text,
	"url_chave" varchar(85),
	"v_bc" numeric(15, 2),
	"v_icms" numeric(15, 2),
	"v_icms_deson" numeric(15, 2),
	"v_fcp_uf_dest" numeric(15, 2),
	"v_icms_uf_dest" numeric(15, 2),
	"v_icms_uf_remet" numeric(15, 2),
	"v_fcp" numeric(15, 2),
	"v_bc_st" numeric(15, 2),
	"v_st" numeric(15, 2),
	"v_fcp_st" numeric(15, 2),
	"v_fcp_st_ret" numeric(15, 2),
	"v_icms_mono" numeric(15, 2),
	"v_icms_mono_reten" numeric(15, 2),
	"v_icms_mono_ret" numeric(15, 2),
	"v_prod" numeric(15, 2),
	"v_frete" numeric(15, 2),
	"v_seg" numeric(15, 2),
	"v_desc" numeric(15, 2),
	"v_ii" numeric(15, 2),
	"v_ipi" numeric(15, 2),
	"v_ipi_devol" numeric(15, 2),
	"v_pis" numeric(15, 2),
	"v_cofins" numeric(15, 2),
	"v_outro" numeric(15, 2),
	"v_nf" numeric(15, 2),
	"v_tot_trib" numeric(15, 2),
	"issqn_v_serv" numeric(15, 2),
	"issqn_v_bc" numeric(15, 2),
	"issqn_v_iss" numeric(15, 2),
	"issqn_v_pis" numeric(15, 2),
	"issqn_v_cofins" numeric(15, 2),
	"issqn_d_compet" date,
	"issqn_v_deducao" numeric(15, 2),
	"issqn_v_outro" numeric(15, 2),
	"issqn_v_desc_incond" numeric(15, 2),
	"issqn_v_desc_cond" numeric(15, 2),
	"issqn_v_iss_ret" numeric(15, 2),
	"issqn_c_reg_trib" varchar(2),
	"v_ret_pis" numeric(15, 2),
	"v_ret_cofins" numeric(15, 2),
	"v_ret_csll" numeric(15, 2),
	"v_bc_irrf" numeric(15, 2),
	"v_irrf" numeric(15, 2),
	"v_bc_ret_prev" numeric(15, 2),
	"v_ret_prev" numeric(15, 2),
	"v_is" numeric(15, 2),
	"v_bc_ibs_cbs" numeric(15, 2),
	"v_ibs_uf" numeric(15, 2),
	"v_ibs_mun" numeric(15, 2),
	"v_ibs" numeric(15, 2),
	"v_cbs" numeric(15, 2),
	"v_dif_ibs_uf" numeric(15, 2),
	"v_dev_trib_ibs_uf" numeric(15, 2),
	"v_dif_ibs_mun" numeric(15, 2),
	"v_dev_trib_ibs_mun" numeric(15, 2),
	"v_cred_pres_ibs" numeric(15, 2),
	"v_cred_pres_cond_sus_ibs" numeric(15, 2),
	"v_dif_cbs" numeric(15, 2),
	"v_dev_trib_cbs" numeric(15, 2),
	"v_cred_pres_cbs" numeric(15, 2),
	"v_cred_pres_cond_sus_cbs" numeric(15, 2),
	"v_ibs_mono" numeric(15, 2),
	"v_cbs_mono" numeric(15, 2),
	"v_ibs_mono_reten" numeric(15, 2),
	"v_cbs_mono_reten" numeric(15, 2),
	"v_ibs_mono_ret" numeric(15, 2),
	"v_cbs_mono_ret" numeric(15, 2),
	"v_ibs_est_cred" numeric(15, 2),
	"v_cbs_est_cred" numeric(15, 2),
	"v_nf_tot" numeric(15, 2),
	"n_fat" varchar(60),
	"v_orig" numeric(15, 2),
	"cobr_v_desc" numeric(15, 2),
	"v_liq" numeric(15, 2),
	"v_troco" numeric(15, 2),
	"aut_xml" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "nfe_headers_chave_chk" CHECK ("nfe_headers"."chave" ~ '^[0-9]{44}$'),
	CONSTRAINT "nfe_headers_c_nf_chk" CHECK ("nfe_headers"."c_nf" ~ '^[0-9]{8}$'),
	CONSTRAINT "nfe_headers_c_uf_chk" CHECK ("nfe_headers"."c_uf" in ('11','12','13','14','15','16','17','21','22','23','24','25','26','27','28','29','31','32','33','35','41','42','43','50','51','52','53')),
	CONSTRAINT "nfe_headers_mod_chk" CHECK ("nfe_headers"."mod" in ('55', '65')),
	CONSTRAINT "nfe_headers_serie_chk" CHECK ("nfe_headers"."serie" ~ '^[0-9]{1,3}$'),
	CONSTRAINT "nfe_headers_n_nf_chk" CHECK ("nfe_headers"."n_nf" >= 1 and "nfe_headers"."n_nf" <= 999999999),
	CONSTRAINT "nfe_headers_tp_amb_chk" CHECK ("nfe_headers"."tp_amb" in (1, 2)),
	CONSTRAINT "nfe_headers_tp_emis_chk" CHECK ("nfe_headers"."tp_emis" in (1, 2, 4, 5, 6, 7, 9)),
	CONSTRAINT "nfe_headers_intermed_chk" CHECK (("nfe_headers"."intermed_cnpj" is null and "nfe_headers"."intermed_id_cad_int_tran" is null) or ("nfe_headers"."intermed_cnpj" is not null and "nfe_headers"."intermed_id_cad_int_tran" is not null)),
	CONSTRAINT "nfe_headers_exporta_chk" CHECK (("nfe_headers"."exporta_uf_saida_pais" is null and "nfe_headers"."exporta_x_loc_exporta" is null) or ("nfe_headers"."exporta_uf_saida_pais" is not null and "nfe_headers"."exporta_x_loc_exporta" is not null)),
	CONSTRAINT "nfe_headers_exporta_uf_chk" CHECK ("nfe_headers"."exporta_uf_saida_pais" is null or "nfe_headers"."exporta_uf_saida_pais" in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
	CONSTRAINT "nfe_headers_compra_gov_chk" CHECK (("nfe_headers"."tp_ente_gov" is null and "nfe_headers"."p_redutor" is null and "nfe_headers"."tp_oper_gov" is null) or ("nfe_headers"."tp_ente_gov" is not null and "nfe_headers"."p_redutor" is not null and "nfe_headers"."tp_oper_gov" is not null)),
	CONSTRAINT "nfe_headers_tp_ente_gov_chk" CHECK ("nfe_headers"."tp_ente_gov" is null or "nfe_headers"."tp_ente_gov" in ('1', '2', '3', '4')),
	CONSTRAINT "nfe_headers_tp_oper_gov_chk" CHECK ("nfe_headers"."tp_oper_gov" is null or "nfe_headers"."tp_oper_gov" in ('1', '2'))
);
--> statement-breakpoint
CREATE TABLE "nfe_item_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"n_draw" varchar(11),
	"n_re" varchar(12),
	"ch_nfe" varchar(44),
	"q_export" numeric(15, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_item_exports_seq_chk" CHECK ("nfe_item_exports"."n_seq" >= 1),
	CONSTRAINT "nfe_item_exports_ind_chk" CHECK (("nfe_item_exports"."n_re" is null and "nfe_item_exports"."ch_nfe" is null and "nfe_item_exports"."q_export" is null) or ("nfe_item_exports"."n_re" is not null and "nfe_item_exports"."ch_nfe" is not null and "nfe_item_exports"."q_export" is not null)),
	CONSTRAINT "nfe_item_exports_chave_chk" CHECK ("nfe_item_exports"."ch_nfe" is null or "nfe_item_exports"."ch_nfe" ~ '^[0-9]{44}$')
);
--> statement-breakpoint
CREATE TABLE "nfe_item_fuel_nozzles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_fuel_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"n_bico" integer NOT NULL,
	"n_bomba" integer,
	"n_tanque" integer NOT NULL,
	"v_enc_ini" numeric(15, 3) NOT NULL,
	"v_enc_fin" numeric(15, 3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_item_fuel_nozzles_seq_chk" CHECK ("nfe_item_fuel_nozzles"."n_seq" >= 1)
);
--> statement-breakpoint
CREATE TABLE "nfe_item_fuel_origins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_fuel_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"ind_import" varchar(1) NOT NULL,
	"c_uf_orig" varchar(2) NOT NULL,
	"p_orig" numeric(15, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_item_fuel_origins_seq_chk" CHECK ("nfe_item_fuel_origins"."n_seq" >= 1 and "nfe_item_fuel_origins"."n_seq" <= 30),
	CONSTRAINT "nfe_item_fuel_origins_ind_import_chk" CHECK ("nfe_item_fuel_origins"."ind_import" in ('0', '1')),
	CONSTRAINT "nfe_item_fuel_origins_c_uf_orig_chk" CHECK ("nfe_item_fuel_origins"."c_uf_orig" in ('11','12','13','14','15','16','17','21','22','23','24','25','26','27','28','29','31','32','33','35','41','42','43','50','51','52','53'))
);
--> statement-breakpoint
CREATE TABLE "nfe_item_fuels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_id" uuid NOT NULL,
	"c_prod_anp" varchar(9) NOT NULL,
	"desc_anp" varchar(95) NOT NULL,
	"p_glp" numeric(15, 4),
	"p_gnn" numeric(15, 4),
	"p_gni" numeric(15, 4),
	"v_part" numeric(15, 2),
	"codif" varchar(21),
	"q_temp" numeric(15, 4),
	"uf_cons" varchar(2) NOT NULL,
	"cide_q_bc_prod" numeric(15, 4),
	"cide_v_aliq_prod" numeric(15, 4),
	"cide_v_cide" numeric(15, 2),
	"p_bio" numeric(15, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_item_fuels_c_prod_anp_chk" CHECK ("nfe_item_fuels"."c_prod_anp" ~ '^[0-9]{9}$'),
	CONSTRAINT "nfe_item_fuels_uf_cons_chk" CHECK ("nfe_item_fuels"."uf_cons" in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
	CONSTRAINT "nfe_item_fuels_cide_chk" CHECK (("nfe_item_fuels"."cide_q_bc_prod" is null and "nfe_item_fuels"."cide_v_aliq_prod" is null and "nfe_item_fuels"."cide_v_cide" is null) or ("nfe_item_fuels"."cide_q_bc_prod" is not null and "nfe_item_fuels"."cide_v_aliq_prod" is not null and "nfe_item_fuels"."cide_v_cide" is not null))
);
--> statement-breakpoint
CREATE TABLE "nfe_item_import_additions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_import_id" uuid NOT NULL,
	"n_adicao" integer NOT NULL,
	"n_seq_adic" integer NOT NULL,
	"c_fabricante" varchar(60) NOT NULL,
	"v_desc_di" numeric(15, 2),
	"n_draw" varchar(11),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_item_import_additions_n_adicao_chk" CHECK ("nfe_item_import_additions"."n_adicao" >= 1 and "nfe_item_import_additions"."n_adicao" <= 999),
	CONSTRAINT "nfe_item_import_additions_n_seq_chk" CHECK ("nfe_item_import_additions"."n_seq_adic" >= 1 and "nfe_item_import_additions"."n_seq_adic" <= 999)
);
--> statement-breakpoint
CREATE TABLE "nfe_item_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"n_di" varchar(15) NOT NULL,
	"d_di" date NOT NULL,
	"x_loc_desemb" varchar(60) NOT NULL,
	"uf_desemb" varchar(2) NOT NULL,
	"d_desemb" date NOT NULL,
	"tp_via_transp" varchar(2) NOT NULL,
	"v_afrmm" numeric(15, 2),
	"tp_intermedio" varchar(1) NOT NULL,
	"cnpj" varchar(14),
	"uf_terceiro" varchar(2),
	"c_exportador" varchar(60) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_item_imports_seq_chk" CHECK ("nfe_item_imports"."n_seq" >= 1),
	CONSTRAINT "nfe_item_imports_tp_via_transp_chk" CHECK ("nfe_item_imports"."tp_via_transp" in ('1','2','3','4','5','6','7','8','9','10','11','12','13')),
	CONSTRAINT "nfe_item_imports_tp_intermedio_chk" CHECK ("nfe_item_imports"."tp_intermedio" in ('1', '2', '3')),
	CONSTRAINT "nfe_item_imports_uf_desemb_chk" CHECK ("nfe_item_imports"."uf_desemb" in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
	CONSTRAINT "nfe_item_imports_uf_terceiro_chk" CHECK ("nfe_item_imports"."uf_terceiro" is null or "nfe_item_imports"."uf_terceiro" in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'))
);
--> statement-breakpoint
CREATE TABLE "nfe_item_medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"c_prod_anvisa" varchar(13) NOT NULL,
	"x_motivo_isencao" varchar(255),
	"v_pmc" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_item_medicines_seq_chk" CHECK ("nfe_item_medicines"."n_seq" >= 1 and "nfe_item_medicines"."n_seq" <= 500)
);
--> statement-breakpoint
CREATE TABLE "nfe_item_nves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"nve" varchar(6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_item_nves_seq_chk" CHECK ("nfe_item_nves"."n_seq" >= 1 and "nfe_item_nves"."n_seq" <= 8)
);
--> statement-breakpoint
CREATE TABLE "nfe_item_presumed_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"c_cred_presumido" varchar(10) NOT NULL,
	"p_cred_presumido" numeric(15, 4) NOT NULL,
	"v_cred_presumido" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_item_presumed_credits_seq_chk" CHECK ("nfe_item_presumed_credits"."n_seq" >= 1 and "nfe_item_presumed_credits"."n_seq" <= 4)
);
--> statement-breakpoint
CREATE TABLE "nfe_item_taxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_id" uuid NOT NULL,
	"v_tot_trib" numeric(15, 2),
	"icms_grupo" varchar(20),
	"icms_orig" "cst_origin",
	"icms_cst" varchar(2),
	"icms_csosn" varchar(3),
	"icms_mod_bc" varchar(1),
	"icms_v_bc" numeric(15, 2),
	"icms_p_icms" numeric(15, 4),
	"icms_v_icms" numeric(15, 2),
	"icms_p_fcp" numeric(15, 4),
	"icms_v_fcp" numeric(15, 2),
	"icms_p_red_bc" numeric(15, 4),
	"icms_v_icms_op" numeric(15, 2),
	"icms_p_dif" numeric(15, 4),
	"icms_v_icms_dif" numeric(15, 2),
	"icms_v_icms_deson" numeric(15, 2),
	"icms_mot_des_icms" varchar(2),
	"icms_ind_deduz_deson" varchar(1),
	"icms_mod_bc_st" varchar(1),
	"icms_p_mva_st" numeric(15, 4),
	"icms_p_red_bc_st" numeric(15, 4),
	"icms_v_bc_st" numeric(15, 2),
	"icms_p_icms_st" numeric(15, 4),
	"icms_v_icms_st" numeric(15, 2),
	"icms_v_bc_fcp_st" numeric(15, 2),
	"icms_p_fcp_st" numeric(15, 4),
	"icms_v_fcp_st" numeric(15, 2),
	"icms_v_icms_st_deson" numeric(15, 2),
	"icms_mot_des_icms_st" varchar(2),
	"icms_v_bc_st_ret" numeric(15, 2),
	"icms_p_st" numeric(15, 4),
	"icms_v_icms_substituto" numeric(15, 2),
	"icms_v_icms_st_ret" numeric(15, 2),
	"icms_v_bc_fcp_st_ret" numeric(15, 2),
	"icms_p_fcp_st_ret" numeric(15, 4),
	"icms_v_fcp_st_ret" numeric(15, 2),
	"icms_p_red_bc_efet" numeric(15, 4),
	"icms_v_bc_efet" numeric(15, 2),
	"icms_p_icms_efet" numeric(15, 4),
	"icms_v_icms_efet" numeric(15, 2),
	"icms_p_cred_sn" numeric(15, 4),
	"icms_v_cred_icms_sn" numeric(15, 2),
	"icms_v_bc_uf_dest" numeric(15, 2),
	"icms_v_bc_fcp_uf_dest" numeric(15, 2),
	"icms_p_fcp_uf_dest" numeric(15, 4),
	"icms_p_icms_uf_dest" numeric(15, 4),
	"icms_p_icms_inter" numeric(15, 4),
	"icms_p_icms_inter_part" numeric(15, 4),
	"icms_v_fcp_uf_dest" numeric(15, 2),
	"icms_v_icms_uf_dest" numeric(15, 2),
	"icms_v_icms_uf_remet" numeric(15, 2),
	"icms_q_bc_mono" numeric(15, 4),
	"icms_ad_rem_icms" numeric(15, 4),
	"icms_v_icms_mono" numeric(15, 2),
	"icms_q_bc_mono_reten" numeric(15, 4),
	"icms_ad_rem_icms_reten" numeric(15, 4),
	"icms_v_icms_mono_reten" numeric(15, 2),
	"icms_p_red_ad_rem" numeric(15, 4),
	"icms_mot_red_ad_rem" varchar(1),
	"icms_v_icms_mono_op" numeric(15, 2),
	"icms_q_bc_mono_dif" numeric(15, 4),
	"icms_ad_rem_icms_dif" numeric(15, 4),
	"icms_v_icms_mono_dif" numeric(15, 2),
	"icms_q_bc_mono_ret" numeric(15, 4),
	"icms_ad_rem_icms_ret" numeric(15, 4),
	"icms_v_icms_mono_ret" numeric(15, 2),
	"ipi_cst" varchar(2),
	"ipi_c_enq" varchar(3),
	"ipi_v_bc" numeric(15, 2),
	"ipi_p_ipi" numeric(15, 4),
	"ipi_v_ipi" numeric(15, 2),
	"ipi_q_unid" numeric(15, 4),
	"ipi_v_unid" numeric(15, 4),
	"p_devol" numeric(15, 4),
	"v_ipi_devol" numeric(15, 2),
	"ii_v_bc" numeric(15, 2),
	"ii_v_desp_adu" numeric(15, 2),
	"ii_v_ii" numeric(15, 2),
	"ii_v_iof" numeric(15, 2),
	"pis_grupo" varchar(20),
	"pis_cst" varchar(2),
	"pis_v_bc" numeric(15, 2),
	"pis_p_pis" numeric(15, 4),
	"pis_v_pis" numeric(15, 2),
	"pis_q_bc_prod" numeric(15, 4),
	"pis_v_aliq_prod" numeric(15, 4),
	"pis_v_bc_st" numeric(15, 2),
	"pis_p_pis_st" numeric(15, 4),
	"pis_q_bc_prod_st" numeric(15, 4),
	"pis_v_aliq_prod_st" numeric(15, 4),
	"pis_v_pis_st" numeric(15, 2),
	"pis_ind_soma_pis_st" varchar(1),
	"cofins_grupo" varchar(20),
	"cofins_cst" varchar(2),
	"cofins_v_bc" numeric(15, 2),
	"cofins_p_cofins" numeric(15, 4),
	"cofins_v_cofins" numeric(15, 2),
	"cofins_q_bc_prod" numeric(15, 4),
	"cofins_v_aliq_prod" numeric(15, 4),
	"cofins_v_bc_st" numeric(15, 2),
	"cofins_p_cofins_st" numeric(15, 4),
	"cofins_q_bc_prod_st" numeric(15, 4),
	"cofins_v_aliq_prod_st" numeric(15, 4),
	"cofins_v_cofins_st" numeric(15, 2),
	"cofins_ind_soma_cofins_st" varchar(1),
	"issqn_v_bc" numeric(15, 2),
	"issqn_v_aliq" numeric(15, 4),
	"issqn_v_issqn" numeric(15, 2),
	"issqn_c_mun_fg" varchar(7),
	"issqn_c_list_serv" varchar(5),
	"issqn_v_deducao" numeric(15, 2),
	"issqn_v_outro" numeric(15, 2),
	"issqn_v_desc_incond" numeric(15, 2),
	"issqn_v_desc_cond" numeric(15, 2),
	"issqn_v_iss_ret" numeric(15, 2),
	"issqn_ind_iss" varchar(1),
	"issqn_c_servico" varchar(20),
	"issqn_c_mun" varchar(7),
	"issqn_c_pais" varchar(4),
	"issqn_n_processo" varchar(30),
	"issqn_ind_incentivo" varchar(1),
	"is_cst" varchar(3),
	"is_c_class_trib" varchar(6),
	"is_v_bc" numeric(15, 2),
	"is_p_is" numeric(15, 4),
	"is_p_is_espec" numeric(15, 4),
	"is_u_trib" varchar(6),
	"is_q_trib" numeric(15, 4),
	"is_v_is" numeric(15, 2),
	"ibs_cbs_cst" varchar(3),
	"ibs_cbs_c_class_trib" varchar(6),
	"ibs_cbs_ind_doacao" varchar(1),
	"ibs_cbs_v_bc" numeric(15, 2),
	"ibs_uf_p_ibs" numeric(15, 4),
	"ibs_uf_p_dif" numeric(15, 4),
	"ibs_uf_v_dif" numeric(15, 2),
	"ibs_uf_v_dev_trib" numeric(15, 2),
	"ibs_uf_p_red_aliq" numeric(15, 4),
	"ibs_uf_p_aliq_efet" numeric(15, 4),
	"ibs_uf_v_ibs" numeric(15, 2),
	"ibs_mun_p_ibs" numeric(15, 4),
	"ibs_mun_p_dif" numeric(15, 4),
	"ibs_mun_v_dif" numeric(15, 2),
	"ibs_mun_v_dev_trib" numeric(15, 2),
	"ibs_mun_p_red_aliq" numeric(15, 4),
	"ibs_mun_p_aliq_efet" numeric(15, 4),
	"ibs_mun_v_ibs" numeric(15, 2),
	"ibs_v_ibs" numeric(15, 2),
	"cbs_p_cbs" numeric(15, 4),
	"cbs_p_dif" numeric(15, 4),
	"cbs_v_dif" numeric(15, 2),
	"cbs_v_dev_trib" numeric(15, 2),
	"cbs_p_red_aliq" numeric(15, 4),
	"cbs_p_aliq_efet" numeric(15, 4),
	"cbs_v_cbs" numeric(15, 2),
	"ibs_cbs_cst_reg" varchar(3),
	"ibs_cbs_c_class_trib_reg" varchar(6),
	"ibs_uf_p_aliq_efet_reg" numeric(15, 4),
	"ibs_uf_v_trib_reg" numeric(15, 2),
	"ibs_mun_p_aliq_efet_reg" numeric(15, 4),
	"ibs_mun_v_trib_reg" numeric(15, 2),
	"cbs_p_aliq_efet_reg" numeric(15, 4),
	"cbs_v_trib_reg" numeric(15, 2),
	"ibs_c_cred_pres" varchar(2),
	"ibs_p_cred_pres" numeric(15, 4),
	"ibs_v_cred_pres" numeric(15, 2),
	"ibs_v_cred_pres_cond_sus" numeric(15, 2),
	"cbs_c_cred_pres" varchar(2),
	"cbs_p_cred_pres" numeric(15, 4),
	"cbs_v_cred_pres" numeric(15, 2),
	"cbs_v_cred_pres_cond_sus" numeric(15, 2),
	"ibs_uf_p_aliq_compra_gov" numeric(15, 4),
	"ibs_uf_v_trib_compra_gov" numeric(15, 2),
	"ibs_mun_p_aliq_compra_gov" numeric(15, 4),
	"ibs_mun_v_trib_compra_gov" numeric(15, 2),
	"cbs_p_aliq_compra_gov" numeric(15, 4),
	"cbs_v_trib_compra_gov" numeric(15, 2),
	"ibs_cbs_q_bc_mono" numeric(15, 4),
	"ibs_ad_rem" numeric(15, 4),
	"cbs_ad_rem" numeric(15, 4),
	"ibs_v_mono" numeric(15, 2),
	"cbs_v_mono" numeric(15, 2),
	"ibs_cbs_q_bc_mono_reten" numeric(15, 4),
	"ibs_ad_rem_reten" numeric(15, 4),
	"cbs_ad_rem_reten" numeric(15, 4),
	"ibs_v_mono_reten" numeric(15, 2),
	"cbs_v_mono_reten" numeric(15, 2),
	"ibs_cbs_q_bc_mono_ret" numeric(15, 4),
	"ibs_ad_rem_ret" numeric(15, 4),
	"cbs_ad_rem_ret" numeric(15, 4),
	"ibs_v_mono_ret" numeric(15, 2),
	"cbs_v_mono_ret" numeric(15, 2),
	"ibs_p_dif_mono" numeric(15, 4),
	"ibs_v_mono_dif" numeric(15, 2),
	"cbs_p_dif_mono" numeric(15, 4),
	"cbs_v_mono_dif" numeric(15, 2),
	"ibs_v_transf_cred" numeric(15, 2),
	"cbs_v_transf_cred" numeric(15, 2),
	"ibs_cbs_compet_apur" varchar(7),
	"ibs_v_ajuste_compet" numeric(15, 2),
	"cbs_v_ajuste_compet" numeric(15, 2),
	"ibs_v_est_cred" numeric(15, 2),
	"cbs_v_est_cred" numeric(15, 2),
	"ibs_tp_cred_pres_zfm" varchar(1),
	"ibs_v_cred_pres_zfm" numeric(15, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nfe_item_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"n_lote" varchar(20) NOT NULL,
	"q_lote" numeric(15, 3) NOT NULL,
	"d_fab" date NOT NULL,
	"d_val" date NOT NULL,
	"c_agreg" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_item_tracks_seq_chk" CHECK ("nfe_item_tracks"."n_seq" >= 1 and "nfe_item_tracks"."n_seq" <= 500)
);
--> statement-breakpoint
CREATE TABLE "nfe_item_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_id" uuid NOT NULL,
	"tp_op" varchar(1) NOT NULL,
	"chassi" varchar(17) NOT NULL,
	"c_cor" varchar(4) NOT NULL,
	"x_cor" varchar(40) NOT NULL,
	"pot" varchar(4) NOT NULL,
	"cilin" varchar(4) NOT NULL,
	"peso_l" varchar(9) NOT NULL,
	"peso_b" varchar(9) NOT NULL,
	"n_serie" varchar(9) NOT NULL,
	"tp_comb" varchar(2) NOT NULL,
	"n_motor" varchar(21) NOT NULL,
	"cmt" varchar(9) NOT NULL,
	"dist" varchar(4) NOT NULL,
	"ano_mod" varchar(4) NOT NULL,
	"ano_fab" varchar(4) NOT NULL,
	"tp_pint" varchar(1) NOT NULL,
	"tp_veic" varchar(2) NOT NULL,
	"esp_veic" varchar(1) NOT NULL,
	"vin" varchar(1) NOT NULL,
	"cond_veic" varchar(1) NOT NULL,
	"c_mod" varchar(6) NOT NULL,
	"c_cor_denatran" varchar(2) NOT NULL,
	"lota" integer NOT NULL,
	"tp_rest" varchar(1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_item_vehicles_tp_op_chk" CHECK ("nfe_item_vehicles"."tp_op" in ('0', '1', '2', '3')),
	CONSTRAINT "nfe_item_vehicles_vin_chk" CHECK ("nfe_item_vehicles"."vin" in ('R', 'N')),
	CONSTRAINT "nfe_item_vehicles_cond_veic_chk" CHECK ("nfe_item_vehicles"."cond_veic" in ('1', '2', '3')),
	CONSTRAINT "nfe_item_vehicles_tp_rest_chk" CHECK ("nfe_item_vehicles"."tp_rest" in ('0', '1', '2', '3', '4', '9'))
);
--> statement-breakpoint
CREATE TABLE "nfe_item_weapons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_item_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"tp_arma" varchar(1) NOT NULL,
	"n_serie" varchar(15) NOT NULL,
	"n_cano" varchar(15) NOT NULL,
	"descr" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_item_weapons_seq_chk" CHECK ("nfe_item_weapons"."n_seq" >= 1 and "nfe_item_weapons"."n_seq" <= 500),
	CONSTRAINT "nfe_item_weapons_tp_arma_chk" CHECK ("nfe_item_weapons"."tp_arma" in ('0', '1'))
);
--> statement-breakpoint
CREATE TABLE "nfe_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_header_id" uuid NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"n_item" integer NOT NULL,
	"c_prod" varchar(60),
	"c_ean" varchar(14),
	"c_barra" varchar(30),
	"x_prod" varchar(120) NOT NULL,
	"ncm" varchar(8),
	"cest" varchar(7),
	"ind_escala" varchar(1),
	"cnpj_fab" varchar(14),
	"c_benef" varchar(10),
	"extipi" varchar(3),
	"cfop" varchar(4),
	"u_com" varchar(6),
	"q_com" numeric(15, 4),
	"v_un_com" numeric(21, 10),
	"v_prod" numeric(15, 2),
	"c_ean_trib" varchar(14),
	"c_barra_trib" varchar(30),
	"u_trib" varchar(6),
	"q_trib" numeric(15, 4),
	"v_un_trib" numeric(21, 10),
	"v_frete" numeric(15, 2),
	"v_seg" numeric(15, 2),
	"v_desc" numeric(15, 2),
	"v_outro" numeric(15, 2),
	"ind_tot" varchar(1),
	"x_ped" varchar(15),
	"n_item_ped" varchar(6),
	"n_fci" varchar(36),
	"inf_ad_prod" varchar(500),
	"entry_unit_cost" numeric(21, 10),
	"entry_sale_price" numeric(15, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_items_n_item_chk" CHECK ("nfe_items"."n_item" >= 1 and "nfe_items"."n_item" <= 999999999)
);
--> statement-breakpoint
CREATE TABLE "nfe_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"description" text NOT NULL,
	"suframa" boolean DEFAULT false NOT NULL,
	"priority" boolean DEFAULT false NOT NULL,
	"onerous" boolean DEFAULT false NOT NULL,
	"tributada" boolean DEFAULT false NOT NULL,
	"presumed_credit_id" uuid,
	"classification_ibs_cbs_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nfe_operations_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"state_id" uuid NOT NULL,
	"nfe_operations_id" uuid NOT NULL,
	"cfop_enterprises_id" uuid NOT NULL,
	"icms_taxation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nfe_parameters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parameter" varchar(255) NOT NULL,
	"value" varchar(500) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nfe_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_header_id" uuid NOT NULL,
	"payment_type_id" uuid NOT NULL,
	"payment_types_methods_flags_id" uuid,
	"n_seq" integer NOT NULL,
	"ind_pag" varchar(1),
	"t_pag" varchar(2),
	"x_pag" varchar(60),
	"v_pag" numeric(15, 2),
	"card_tp_integra" varchar(1),
	"card_cnpj" varchar(14),
	"card_t_band" varchar(2),
	"card_c_aut" varchar(128),
	"cnpj_receb" varchar(14),
	"id_term_pag" varchar(40),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nfe_places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_header_id" uuid NOT NULL,
	"place_type" "nfe_place_type" NOT NULL,
	"cnpj" varchar(14),
	"cpf" varchar(11),
	"x_nome" varchar(60),
	"xlgr" varchar(60) NOT NULL,
	"nro" varchar(60) NOT NULL,
	"xcpl" varchar(60),
	"xbairro" varchar(60) NOT NULL,
	"cmun" varchar(7) NOT NULL,
	"xmun" varchar(60) NOT NULL,
	"uf" varchar(2) NOT NULL,
	"cep" varchar(8),
	"cpais" varchar(4),
	"xpais" varchar(60),
	"fone" varchar(14),
	"email" varchar(60),
	"ie" varchar(14),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_places_doc_chk" CHECK (("nfe_places"."cnpj" is not null and "nfe_places"."cpf" is null) or ("nfe_places"."cnpj" is null and "nfe_places"."cpf" is not null)),
	CONSTRAINT "nfe_places_uf_chk" CHECK ("nfe_places"."uf" in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'))
);
--> statement-breakpoint
CREATE TABLE "nfe_recipient_manifestations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"chave" varchar(44) NOT NULL,
	"emit_cnpj" varchar(14) NOT NULL,
	"event_type" "nfe_manifestation_type" NOT NULL,
	"tp_evento" varchar(6) NOT NULL,
	"n_seq_evento" integer DEFAULT 1 NOT NULL,
	"dh_evento" timestamp with time zone NOT NULL,
	"x_just" varchar(255),
	"n_prot" varchar(15),
	"c_stat" varchar(3),
	"x_motivo" varchar(255),
	"xml_evento" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_recipient_manifestations_seq_chk" CHECK ("nfe_recipient_manifestations"."n_seq_evento" = 1),
	CONSTRAINT "nfe_recipient_manifestations_chave_chk" CHECK ("nfe_recipient_manifestations"."chave" ~ '^[0-9]{44}$'),
	CONSTRAINT "nfe_recipient_manifestations_emit_cnpj_chk" CHECK ("nfe_recipient_manifestations"."emit_cnpj" ~ '^[0-9]{14}$'),
	CONSTRAINT "nfe_recipient_manifestations_just_chk" CHECK (("nfe_recipient_manifestations"."event_type" = 'OPERACAO_NAO_REALIZADA' and "nfe_recipient_manifestations"."x_just" is not null and char_length("nfe_recipient_manifestations"."x_just") between 15 and 255) or ("nfe_recipient_manifestations"."event_type" <> 'OPERACAO_NAO_REALIZADA' and "nfe_recipient_manifestations"."x_just" is null))
);
--> statement-breakpoint
CREATE TABLE "nfe_referenced_processes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_header_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"n_proc" varchar(60) NOT NULL,
	"ind_proc" varchar(1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_referenced_processes_seq_chk" CHECK ("nfe_referenced_processes"."n_seq" >= 1 and "nfe_referenced_processes"."n_seq" <= 100),
	CONSTRAINT "nfe_referenced_processes_ind_proc_chk" CHECK ("nfe_referenced_processes"."ind_proc" in ('0', '1', '2', '3', '9'))
);
--> statement-breakpoint
CREATE TABLE "nfe_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_header_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"ref_type" "nfe_reference_type" NOT NULL,
	"ref_chave" varchar(44),
	"c_uf" varchar(2),
	"aamm" varchar(4),
	"cnpj" varchar(14),
	"cpf" varchar(11),
	"ie" varchar(14),
	"mod" varchar(2),
	"serie" varchar(3),
	"n_nf" integer,
	"n_ecf" varchar(3),
	"n_coo" varchar(6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_references_seq_chk" CHECK ("nfe_references"."n_seq" >= 1),
	CONSTRAINT "nfe_references_chave_chk" CHECK ("nfe_references"."ref_chave" is null or "nfe_references"."ref_chave" ~ '^[0-9]{44}$')
);
--> statement-breakpoint
CREATE TABLE "nfe_resp_tec" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_header_id" uuid NOT NULL,
	"cnpj" varchar(14) NOT NULL,
	"x_contato" varchar(60) NOT NULL,
	"email" varchar(60) NOT NULL,
	"fone" varchar(14) NOT NULL,
	"id_csrt" varchar(2),
	"hash_csrt" varchar(28),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nfe_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_header_id" uuid NOT NULL,
	"sales_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nfe_supplier_product_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"supplier_document" varchar(14) NOT NULL,
	"c_prod" varchar(60) NOT NULL,
	"products_enterprises_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_supplier_product_links_document_chk" CHECK ("nfe_supplier_product_links"."supplier_document" ~ '^[0-9]{11}$' OR "nfe_supplier_product_links"."supplier_document" ~ '^[0-9]{14}$'),
	CONSTRAINT "nfe_supplier_product_links_c_prod_chk" CHECK (btrim("nfe_supplier_product_links"."c_prod") <> '')
);
--> statement-breakpoint
CREATE TABLE "nfe_transport_trailers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_transport_id" uuid NOT NULL,
	"n_seq" smallint NOT NULL,
	"placa" varchar(7) NOT NULL,
	"uf" varchar(2) NOT NULL,
	"rntc" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_transport_trailers_seq_chk" CHECK ("nfe_transport_trailers"."n_seq" >= 1 and "nfe_transport_trailers"."n_seq" <= 5),
	CONSTRAINT "nfe_transport_trailers_uf_chk" CHECK ("nfe_transport_trailers"."uf" in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'))
);
--> statement-breakpoint
CREATE TABLE "nfe_transport_volume_seals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_transport_volume_id" uuid NOT NULL,
	"n_lacre" varchar(60) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nfe_transport_volumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_transport_id" uuid NOT NULL,
	"n_seq" integer NOT NULL,
	"q_vol" integer,
	"esp" varchar(60),
	"marca" varchar(60),
	"n_vol" varchar(60),
	"peso_l" numeric(15, 3),
	"peso_b" numeric(15, 3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_transport_volumes_seq_chk" CHECK ("nfe_transport_volumes"."n_seq" >= 1)
);
--> statement-breakpoint
CREATE TABLE "nfe_transports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfe_header_id" uuid NOT NULL,
	"mod_frete" varchar(1) NOT NULL,
	"transp_cnpj" varchar(14),
	"transp_cpf" varchar(11),
	"transp_x_nome" varchar(60),
	"transp_ie" varchar(14),
	"transp_x_ender" varchar(60),
	"transp_x_mun" varchar(60),
	"transp_uf" varchar(2),
	"ret_v_serv" numeric(15, 2),
	"ret_v_bc" numeric(15, 2),
	"ret_p_icms" numeric(15, 4),
	"ret_v_icms" numeric(15, 2),
	"ret_cfop" varchar(4),
	"ret_c_mun_fg" varchar(7),
	"veic_placa" varchar(7),
	"veic_uf" varchar(2),
	"veic_rntc" varchar(20),
	"vagao" varchar(20),
	"balsa" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "nfe_transports_mod_frete_chk" CHECK ("nfe_transports"."mod_frete" in ('0', '1', '2', '3', '4', '9')),
	CONSTRAINT "nfe_transports_transp_uf_chk" CHECK ("nfe_transports"."transp_uf" is null or "nfe_transports"."transp_uf" in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
	CONSTRAINT "nfe_transports_veic_uf_chk" CHECK ("nfe_transports"."veic_uf" is null or "nfe_transports"."veic_uf" in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'))
);
--> statement-breakpoint
CREATE TABLE "presumed_credit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"c_cred_pres" varchar(2) NOT NULL,
	"description" text NOT NULL,
	"lc_redacao" text,
	"ind_nfe" varchar(1) NOT NULL,
	"ind_evento" varchar(1) NOT NULL,
	"ind_deduz_cred_pres" varchar(1) NOT NULL,
	"ind_g_cbs_cred_pres" varchar(1) NOT NULL,
	"ind_g_ibs_cred_pres" varchar(1) NOT NULL,
	"cbs_rate_type" varchar(100),
	"ibs_rate_type" varchar(100),
	"p_aliq_cred_pres_cbs" text,
	"p_aliq_cred_pres_ibs" text,
	"p_cred_pres_cbs" numeric(15, 10),
	"p_cred_pres_ibs" numeric(15, 10),
	"p_red_transicao_ibs" text,
	"c_class_ref" varchar(100),
	"d_ini_vig_cbs" date,
	"d_fim_vig_cbs" date,
	"d_ini_vig_ibs" date,
	"d_fim_vig_ibs" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "presumed_credit_cred_pres_chk" CHECK ("presumed_credit"."c_cred_pres" ~ '^[0-9]{2}$'),
	CONSTRAINT "presumed_credit_ind_nfe_chk" CHECK ("presumed_credit"."ind_nfe" in ('0', '1')),
	CONSTRAINT "presumed_credit_ind_evento_chk" CHECK ("presumed_credit"."ind_evento" in ('0', '1')),
	CONSTRAINT "presumed_credit_ind_deduz_chk" CHECK ("presumed_credit"."ind_deduz_cred_pres" in ('0', '1')),
	CONSTRAINT "presumed_credit_ind_g_cbs_chk" CHECK ("presumed_credit"."ind_g_cbs_cred_pres" in ('0', '1')),
	CONSTRAINT "presumed_credit_ind_g_ibs_chk" CHECK ("presumed_credit"."ind_g_ibs_cred_pres" in ('0', '1')),
	CONSTRAINT "presumed_credit_p_cred_pres_cbs_range" CHECK ("presumed_credit"."p_cred_pres_cbs" is null or ("presumed_credit"."p_cred_pres_cbs" >= 0 and "presumed_credit"."p_cred_pres_cbs" <= 100)),
	CONSTRAINT "presumed_credit_p_cred_pres_ibs_range" CHECK ("presumed_credit"."p_cred_pres_ibs" is null or ("presumed_credit"."p_cred_pres_ibs" >= 0 and "presumed_credit"."p_cred_pres_ibs" <= 100))
);
--> statement-breakpoint
CREATE TABLE "situation_tributary_cst" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"regime_tributario" "regime_tributario" NOT NULL,
	"origin" varchar(1) NOT NULL,
	"cst" varchar(3) NOT NULL,
	"description" varchar(255) NOT NULL,
	"allows_credit" boolean DEFAULT false NOT NULL,
	"features_reduction" boolean DEFAULT false NOT NULL,
	"withheld_tax" boolean DEFAULT false NOT NULL,
	"taxation_type" "taxation_type" NOT NULL,
	"observation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "situation_tributary_cst_regime_tributario_chk" CHECK ("situation_tributary_cst"."regime_tributario" in ('1', '2', '3', '4')),
	CONSTRAINT "situation_tributary_cst_origin_chk" CHECK ("situation_tributary_cst"."origin" ~ '^[0-8]$'),
	CONSTRAINT "situation_tributary_cst_cst_chk" CHECK ("situation_tributary_cst"."cst" ~ '^[0-9]{2,3}$'),
	CONSTRAINT "situation_tributary_cst_cst_crt_chk" CHECK (("situation_tributary_cst"."regime_tributario" = '3' and "situation_tributary_cst"."cst" ~ '^[0-9]{2}$') or ("situation_tributary_cst"."regime_tributario" <> '3' and "situation_tributary_cst"."cst" ~ '^[0-9]{3}$')),
	CONSTRAINT "situation_tributary_cst_allows_credit_chk" CHECK ("situation_tributary_cst"."allows_credit" = true or "situation_tributary_cst"."allows_credit" = false),
	CONSTRAINT "situation_tributary_cst_features_reduction_chk" CHECK ("situation_tributary_cst"."features_reduction" = true or "situation_tributary_cst"."features_reduction" = false),
	CONSTRAINT "situation_tributary_cst_withheld_tax_chk" CHECK ("situation_tributary_cst"."withheld_tax" = true or "situation_tributary_cst"."withheld_tax" = false)
);
--> statement-breakpoint
CREATE TABLE "cte_dfe_cursors" (
	"enterprise_id" uuid PRIMARY KEY NOT NULL,
	"ult_nsu" varchar(15) DEFAULT '000000000000000' NOT NULL,
	"max_nsu" varchar(15),
	"blocked_until" timestamp with time zone,
	"updated_at" timestamp with time zone,
	CONSTRAINT "cte_dfe_cursors_ult_nsu_chk" CHECK ("cte_dfe_cursors"."ult_nsu" ~ '^[0-9]{15}$'),
	CONSTRAINT "cte_dfe_cursors_max_nsu_chk" CHECK ("cte_dfe_cursors"."max_nsu" is null or "cte_dfe_cursors"."max_nsu" ~ '^[0-9]{15}$')
);
--> statement-breakpoint
CREATE TABLE "cte_document_nfes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cte_document_id" uuid NOT NULL,
	"chave" varchar(44) NOT NULL,
	CONSTRAINT "cte_document_nfes_chave_chk" CHECK ("cte_document_nfes"."chave" ~ '^[0-9]{44}$')
);
--> statement-breakpoint
CREATE TABLE "cte_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"chave" varchar(44) NOT NULL,
	"number" varchar(9) NOT NULL,
	"serie" varchar(3) NOT NULL,
	"emit_cnpj" varchar(14) NOT NULL,
	"emit_name" varchar(60),
	"freight_value" numeric(15, 2),
	"icms_rate" numeric(15, 10),
	"icms_value" numeric(15, 2),
	"xml_arquivo" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "cte_documents_chave_chk" CHECK ("cte_documents"."chave" ~ '^[0-9]{44}$'),
	CONSTRAINT "cte_documents_emit_cnpj_chk" CHECK ("cte_documents"."emit_cnpj" ~ '^[0-9]{14}$')
);
--> statement-breakpoint
CREATE TABLE "printers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_id" uuid NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"description" varchar(255) NOT NULL,
	"computer_name" varchar(63) NOT NULL,
	"share_name" varchar(255) NOT NULL,
	"paper_type" varchar(20) DEFAULT 'A4' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"margin_top" numeric(4, 1) DEFAULT '0' NOT NULL,
	"margin_bottom" numeric(4, 1) DEFAULT '0' NOT NULL,
	"margin_left" numeric(4, 1) DEFAULT '0' NOT NULL,
	"margin_right" numeric(4, 1) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "printers_paper_type_chk" CHECK ("printers"."paper_type" in ('A4', 'BOBINA_80', 'BOBINA_58'))
);
--> statement-breakpoint
CREATE TABLE "bank_collection_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"bank_code" varchar(3) NOT NULL,
	"branch" varchar(10) NOT NULL,
	"branch_digit" varchar(2),
	"account" varchar(20) NOT NULL,
	"account_digit" varchar(2),
	"wallet" varchar(10) NOT NULL,
	"agreement_code" varchar(20) NOT NULL,
	"wallet_variation" varchar(10),
	"beneficiary_document" varchar(14) NOT NULL,
	"beneficiary_name" varchar(120) NOT NULL,
	"channel" "bank_channel" NOT NULL,
	"cnab_layout" "cnab_layout",
	"api_provider" varchar(30),
	"credential_ref" varchar(120),
	"next_nosso_numero" bigint DEFAULT 1 NOT NULL,
	"remittance_sequence" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_collection_agreements_layout_check" CHECK (("bank_collection_agreements"."channel" = 'CNAB' AND "bank_collection_agreements"."cnab_layout" IS NOT NULL) OR ("bank_collection_agreements"."channel" = 'API' AND "bank_collection_agreements"."cnab_layout" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "bank_remittance_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"remittance_id" uuid NOT NULL,
	"slip_id" uuid NOT NULL,
	"movement" "remittance_movement" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_remittances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"agreement_id" uuid NOT NULL,
	"layout" "cnab_layout" NOT NULL,
	"sequence" integer NOT NULL,
	"file_name" varchar(120) NOT NULL,
	"status" "remittance_status" DEFAULT 'GERADA' NOT NULL,
	"content" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"slip_id" uuid,
	"occurrence_code" varchar(10) NOT NULL,
	"occurrence" "return_occurrence" NOT NULL,
	"paid_amount" numeric(15, 2),
	"paid_at" date,
	"credit_date" date,
	"nosso_numero" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"agreement_id" uuid NOT NULL,
	"file_name" varchar(120) NOT NULL,
	"layout" "cnab_layout" NOT NULL,
	"content" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_slip_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slip_id" uuid NOT NULL,
	"kind" "bank_slip_event_kind" NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"summary" jsonb
);
--> statement-breakpoint
CREATE TABLE "bank_slips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"installment_id" uuid NOT NULL,
	"agreement_id" uuid NOT NULL,
	"channel" "bank_channel" NOT NULL,
	"nosso_numero" varchar(20) NOT NULL,
	"document_number" varchar(25),
	"amount" numeric(15, 2) NOT NULL,
	"due_date" date NOT NULL,
	"status" "bank_slip_status" DEFAULT 'AGUARDANDO_REGISTRO' NOT NULL,
	"barcode" varchar(44),
	"digitable_line" varchar(54),
	"external_id" varchar(80),
	"registered_at" timestamp with time zone,
	"reject_reason" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"due_date" date NOT NULL,
	"original_amount" numeric(15, 2) NOT NULL,
	"open_amount" numeric(15, 2) NOT NULL,
	"status" "financial_installment_status" DEFAULT 'ABERTA' NOT NULL,
	"schedule_source" "financial_schedule_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_installments_open_amount_check" CHECK ("financial_installments"."open_amount" >= 0 AND "financial_installments"."open_amount" <= "financial_installments"."original_amount")
);
--> statement-breakpoint
CREATE TABLE "financial_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"title_id" uuid NOT NULL,
	"installment_id" uuid NOT NULL,
	"kind" "financial_settlement_kind" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"discount" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"increase" numeric(15, 2) DEFAULT '0.00' NOT NULL,
	"settled_at" date NOT NULL,
	"payment_types_methods_flags_id" uuid,
	"member_credit_id" uuid,
	"sales_id" uuid,
	"return_order" integer,
	"reverses_settlement_id" uuid,
	"note" varchar(500),
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_settlements_amount_check" CHECK ("financial_settlements"."amount" >= 0),
	CONSTRAINT "financial_settlements_discount_check" CHECK ("financial_settlements"."discount" >= 0),
	CONSTRAINT "financial_settlements_increase_check" CHECK ("financial_settlements"."increase" >= 0)
);
--> statement-breakpoint
CREATE TABLE "financial_title_origins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" uuid NOT NULL,
	"sales_id" uuid,
	"nfe_header_id" uuid,
	"contributed_amount" numeric(15, 2) NOT NULL,
	"returned_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"live" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_title_origins_source_check" CHECK ("financial_title_origins"."sales_id" is not null OR "financial_title_origins"."nfe_header_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "financial_titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"direction" "financial_direction" NOT NULL,
	"source" "financial_source" NOT NULL,
	"kind" "financial_kind" NOT NULL,
	"status" "financial_title_status" DEFAULT 'ABERTO' NOT NULL,
	"number" integer NOT NULL,
	"member_id" uuid NOT NULL,
	"issue_date" date NOT NULL,
	"description" varchar(500),
	"original_amount" numeric(15, 2) NOT NULL,
	"open_amount" numeric(15, 2) NOT NULL,
	"nfe_header_id" uuid,
	"payment_types_id" uuid,
	"consolidated_into_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_titles_open_amount_check" CHECK ("financial_titles"."open_amount" >= 0 AND "financial_titles"."open_amount" <= "financial_titles"."original_amount")
);
--> statement-breakpoint
CREATE TABLE "member_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprise_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"origin" "member_credit_origin" NOT NULL,
	"status" "member_credit_status" DEFAULT 'ABERTO' NOT NULL,
	"original_amount" numeric(15, 2) NOT NULL,
	"open_amount" numeric(15, 2) NOT NULL,
	"sales_id" uuid,
	"return_order" integer,
	"description" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_credits_open_amount_check" CHECK ("member_credits"."open_amount" >= 0 AND "member_credits"."open_amount" <= "member_credits"."original_amount")
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
ALTER TABLE "states_divisions" ADD CONSTRAINT "states_divisions_states_id_states_id_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_parameters" ADD CONSTRAINT "enterprise_parameters_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises" ADD CONSTRAINT "enterprises_group_id_enterprise_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."enterprise_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_address" ADD CONSTRAINT "enterprises_address_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_address" ADD CONSTRAINT "enterprises_address_cep_id_ceps_id_fk" FOREIGN KEY ("cep_id") REFERENCES "public"."ceps"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_sequences" ADD CONSTRAINT "enterprises_sequences_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_included_by_users_id_fk" FOREIGN KEY ("included_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_type_supplier_customer_id_type_supplier_customers_id_fk" FOREIGN KEY ("type_supplier_customer_id") REFERENCES "public"."type_supplier_customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_type_network_id_type_networks_id_fk" FOREIGN KEY ("type_network_id") REFERENCES "public"."type_networks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "type_networks" ADD CONSTRAINT "type_networks_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "type_supplier_customers" ADD CONSTRAINT "type_supplier_customers_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_taxation_id_product_taxation_id_fk" FOREIGN KEY ("product_taxation_id") REFERENCES "public"."product_taxation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_classification_ibs_cbs_id_classification_ibs_cbs_id_fk" FOREIGN KEY ("classification_ibs_cbs_id") REFERENCES "public"."classification_ibs_cbs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotional_prices" ADD CONSTRAINT "promotional_prices_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_cart_items" ADD CONSTRAINT "marketplace_cart_items_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_cart_items" ADD CONSTRAINT "marketplace_cart_items_enterprises_members_id_enterprises_members_id_fk" FOREIGN KEY ("enterprises_members_id") REFERENCES "public"."enterprises_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_cart_items" ADD CONSTRAINT "marketplace_cart_items_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_delivery_items" ADD CONSTRAINT "marketplace_delivery_items_delivery_id_marketplace_deliverys_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."marketplace_deliverys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_delivery_items" ADD CONSTRAINT "marketplace_delivery_items_order_item_id_marketplace_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."marketplace_order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_deliverys" ADD CONSTRAINT "marketplace_deliverys_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_deliverys" ADD CONSTRAINT "marketplace_deliverys_order_id_marketplace_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_favorites" ADD CONSTRAINT "marketplace_favorites_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_favorites" ADD CONSTRAINT "marketplace_favorites_enterprises_members_id_enterprises_members_id_fk" FOREIGN KEY ("enterprises_members_id") REFERENCES "public"."enterprises_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_favorites" ADD CONSTRAINT "marketplace_favorites_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_items" ADD CONSTRAINT "marketplace_order_items_order_id_marketplace_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_items" ADD CONSTRAINT "marketplace_order_items_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_enterprises_members_id_enterprises_members_id_fk" FOREIGN KEY ("enterprises_members_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_characteristics" ADD CONSTRAINT "marketplace_product_characteristics_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_photos" ADD CONSTRAINT "marketplace_product_photos_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_questions" ADD CONSTRAINT "marketplace_product_questions_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_questions" ADD CONSTRAINT "marketplace_product_questions_enterprises_members_id_enterprises_members_id_fk" FOREIGN KEY ("enterprises_members_id") REFERENCES "public"."enterprises_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_reviews" ADD CONSTRAINT "marketplace_product_reviews_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_reviews" ADD CONSTRAINT "marketplace_product_reviews_enterprises_members_id_enterprises_members_id_fk" FOREIGN KEY ("enterprises_members_id") REFERENCES "public"."enterprises_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_variant_option_values" ADD CONSTRAINT "marketplace_product_variant_option_values_option_id_marketplace_product_variant_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."marketplace_product_variant_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_variant_options" ADD CONSTRAINT "marketplace_product_variant_options_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_variant_selections" ADD CONSTRAINT "marketplace_product_variant_selections_variant_id_marketplace_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."marketplace_product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_variant_selections" ADD CONSTRAINT "marketplace_product_variant_selections_option_value_id_marketplace_product_variant_option_values_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."marketplace_product_variant_option_values"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_variants" ADD CONSTRAINT "marketplace_product_variants_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_variants" ADD CONSTRAINT "marketplace_product_variants_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_coupon_redemptions" ADD CONSTRAINT "marketplace_coupon_redemptions_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_coupon_redemptions" ADD CONSTRAINT "marketplace_coupon_redemptions_coupon_id_marketplace_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."marketplace_coupons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_coupon_redemptions" ADD CONSTRAINT "marketplace_coupon_redemptions_order_id_marketplace_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_coupon_redemptions" ADD CONSTRAINT "marketplace_coupon_redemptions_enterprises_members_id_enterprises_members_id_fk" FOREIGN KEY ("enterprises_members_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_coupons" ADD CONSTRAINT "marketplace_coupons_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_coupons" ADD CONSTRAINT "marketplace_coupons_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_payment_configs" ADD CONSTRAINT "marketplace_payment_configs_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_payment_events" ADD CONSTRAINT "marketplace_payment_events_payment_id_marketplace_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."marketplace_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_payments" ADD CONSTRAINT "marketplace_payments_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_payments" ADD CONSTRAINT "marketplace_payments_order_id_marketplace_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_payments" ADD CONSTRAINT "marketplace_payments_config_id_marketplace_payment_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."marketplace_payment_configs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harbour_sale_sync_events" ADD CONSTRAINT "harbour_sale_sync_events_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harbour_sale_sync_events" ADD CONSTRAINT "harbour_sale_sync_events_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mechanic_sales_items" ADD CONSTRAINT "mechanic_sales_items_mechanic_enterprises_members_id_fk" FOREIGN KEY ("mechanic") REFERENCES "public"."enterprises_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mechanic_sales_items" ADD CONSTRAINT "mechanic_sales_items_sales_items_id_sales_items_id_fk" FOREIGN KEY ("sales_items_id") REFERENCES "public"."sales_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_types" ADD CONSTRAINT "payment_types_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_types_methods_flags" ADD CONSTRAINT "payment_types_methods_flags_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_types_methods_flags" ADD CONSTRAINT "payment_types_methods_flags_payment_methods_id_payment_methods_id_fk" FOREIGN KEY ("payment_methods_id") REFERENCES "public"."payment_methods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_types_methods_flags" ADD CONSTRAINT "payment_types_methods_flags_payment_types_id_payment_types_id_fk" FOREIGN KEY ("payment_types_id") REFERENCES "public"."payment_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_types_methods_flags" ADD CONSTRAINT "payment_types_methods_flags_type_flags_id_type_flags_id_fk" FOREIGN KEY ("type_flags_id") REFERENCES "public"."type_flags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_types_methods_flags" ADD CONSTRAINT "payment_types_methods_flags_band_member_id_enterprises_members_id_fk" FOREIGN KEY ("band_member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_types_methods_flags" ADD CONSTRAINT "payment_types_methods_flags_intermediary_member_id_enterprises_members_id_fk" FOREIGN KEY ("intermediary_member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_payment_types_methods_flags_id_payment_types_methods_flags_id_fk" FOREIGN KEY ("payment_types_methods_flags_id") REFERENCES "public"."payment_types_methods_flags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "anexos_rt" ADD CONSTRAINT "anexos_rt_products_ncm_id_products_ncm_id_fk" FOREIGN KEY ("products_ncm_id") REFERENCES "public"."products_ncm"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anexos_rt" ADD CONSTRAINT "anexos_rt_cst_ibs_cbs_id_cst_ibs_cbs_id_fk" FOREIGN KEY ("cst_ibs_cbs_id") REFERENCES "public"."cst_ibs_cbs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anexos_rt" ADD CONSTRAINT "anexos_rt_classification_ibs_cbs_id_classification_ibs_cbs_id_fk" FOREIGN KEY ("classification_ibs_cbs_id") REFERENCES "public"."classification_ibs_cbs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_code_by_cfop" ADD CONSTRAINT "benefit_code_by_cfop_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_code_by_cfop" ADD CONSTRAINT "benefit_code_by_cfop_benefit_code_id_benefit_code_id_fk" FOREIGN KEY ("benefit_code_id") REFERENCES "public"."benefit_code"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_code_by_state_and_products" ADD CONSTRAINT "benefit_code_by_state_and_products_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_code_by_state_and_products" ADD CONSTRAINT "benefit_code_by_state_and_products_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_code_by_state_and_products" ADD CONSTRAINT "benefit_code_by_state_and_products_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_code_by_state_and_products" ADD CONSTRAINT "benefit_code_by_state_and_products_benefit_code_id_benefit_code_id_fk" FOREIGN KEY ("benefit_code_id") REFERENCES "public"."benefit_code"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_type_costumers" ADD CONSTRAINT "benefit_type_costumers_type_supplier_customer_id_type_supplier_customers_id_fk" FOREIGN KEY ("type_supplier_customer_id") REFERENCES "public"."type_supplier_customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_type_costumers" ADD CONSTRAINT "benefit_type_costumers_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_type_costumers" ADD CONSTRAINT "benefit_type_costumers_benefit_code_id_benefit_code_id_fk" FOREIGN KEY ("benefit_code_id") REFERENCES "public"."benefit_code"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cfops_enterprises" ADD CONSTRAINT "cfops_enterprises_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cfops_enterprises" ADD CONSTRAINT "cfops_enterprises_cfop_id_cfops_id_fk" FOREIGN KEY ("cfop_id") REFERENCES "public"."cfops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classification_ibs_cbs" ADD CONSTRAINT "classification_ibs_cbs_cst_ibs_cbs_id_cst_ibs_cbs_id_fk" FOREIGN KEY ("cst_ibs_cbs_id") REFERENCES "public"."cst_ibs_cbs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cst_compativel_benefit" ADD CONSTRAINT "cst_compativel_benefit_benefit_code_id_benefit_code_id_fk" FOREIGN KEY ("benefit_code_id") REFERENCES "public"."benefit_code"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cst_compativel_benefit" ADD CONSTRAINT "cst_compativel_benefit_situation_tributary_cst_id_situation_tributary_cst_id_fk" FOREIGN KEY ("situation_tributary_cst_id") REFERENCES "public"."situation_tributary_cst"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_nfe" ADD CONSTRAINT "enterprises_nfe_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_nfe_certificates" ADD CONSTRAINT "enterprises_nfe_certificates_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_print_models" ADD CONSTRAINT "enterprises_print_models_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprises_print_models" ADD CONSTRAINT "enterprises_print_models_document_model_code_fiscal_document_models_code_fk" FOREIGN KEY ("document_model_code") REFERENCES "public"."fiscal_document_models"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_additional_notes" ADD CONSTRAINT "nfe_additional_notes_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_advance_payments" ADD CONSTRAINT "nfe_advance_payments_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_dfe_cursors" ADD CONSTRAINT "nfe_dfe_cursors_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_duplicates" ADD CONSTRAINT "nfe_duplicates_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_entry_transports" ADD CONSTRAINT "nfe_entry_transports_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_entry_transports" ADD CONSTRAINT "nfe_entry_transports_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_events" ADD CONSTRAINT "nfe_events_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_events" ADD CONSTRAINT "nfe_events_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_events" ADD CONSTRAINT "nfe_events_mod_fiscal_document_models_code_fk" FOREIGN KEY ("mod") REFERENCES "public"."fiscal_document_models"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD CONSTRAINT "nfe_headers_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD CONSTRAINT "nfe_headers_mod_fiscal_document_models_code_fk" FOREIGN KEY ("mod") REFERENCES "public"."fiscal_document_models"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD CONSTRAINT "nfe_headers_emit_member_id_enterprises_members_id_fk" FOREIGN KEY ("emit_member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD CONSTRAINT "nfe_headers_dest_member_id_enterprises_members_id_fk" FOREIGN KEY ("dest_member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_exports" ADD CONSTRAINT "nfe_item_exports_nfe_item_id_nfe_items_id_fk" FOREIGN KEY ("nfe_item_id") REFERENCES "public"."nfe_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_fuel_nozzles" ADD CONSTRAINT "nfe_item_fuel_nozzles_nfe_item_fuel_id_nfe_item_fuels_id_fk" FOREIGN KEY ("nfe_item_fuel_id") REFERENCES "public"."nfe_item_fuels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_fuel_origins" ADD CONSTRAINT "nfe_item_fuel_origins_nfe_item_fuel_id_nfe_item_fuels_id_fk" FOREIGN KEY ("nfe_item_fuel_id") REFERENCES "public"."nfe_item_fuels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_fuels" ADD CONSTRAINT "nfe_item_fuels_nfe_item_id_nfe_items_id_fk" FOREIGN KEY ("nfe_item_id") REFERENCES "public"."nfe_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_import_additions" ADD CONSTRAINT "nfe_item_import_additions_nfe_item_import_id_nfe_item_imports_id_fk" FOREIGN KEY ("nfe_item_import_id") REFERENCES "public"."nfe_item_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_imports" ADD CONSTRAINT "nfe_item_imports_nfe_item_id_nfe_items_id_fk" FOREIGN KEY ("nfe_item_id") REFERENCES "public"."nfe_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_medicines" ADD CONSTRAINT "nfe_item_medicines_nfe_item_id_nfe_items_id_fk" FOREIGN KEY ("nfe_item_id") REFERENCES "public"."nfe_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_nves" ADD CONSTRAINT "nfe_item_nves_nfe_item_id_nfe_items_id_fk" FOREIGN KEY ("nfe_item_id") REFERENCES "public"."nfe_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_presumed_credits" ADD CONSTRAINT "nfe_item_presumed_credits_nfe_item_id_nfe_items_id_fk" FOREIGN KEY ("nfe_item_id") REFERENCES "public"."nfe_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_taxes" ADD CONSTRAINT "nfe_item_taxes_nfe_item_id_nfe_items_id_fk" FOREIGN KEY ("nfe_item_id") REFERENCES "public"."nfe_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_tracks" ADD CONSTRAINT "nfe_item_tracks_nfe_item_id_nfe_items_id_fk" FOREIGN KEY ("nfe_item_id") REFERENCES "public"."nfe_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_vehicles" ADD CONSTRAINT "nfe_item_vehicles_nfe_item_id_nfe_items_id_fk" FOREIGN KEY ("nfe_item_id") REFERENCES "public"."nfe_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_item_weapons" ADD CONSTRAINT "nfe_item_weapons_nfe_item_id_nfe_items_id_fk" FOREIGN KEY ("nfe_item_id") REFERENCES "public"."nfe_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_items" ADD CONSTRAINT "nfe_items_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_items" ADD CONSTRAINT "nfe_items_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_operations" ADD CONSTRAINT "nfe_operations_presumed_credit_id_presumed_credit_id_fk" FOREIGN KEY ("presumed_credit_id") REFERENCES "public"."presumed_credit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_operations" ADD CONSTRAINT "nfe_operations_classification_ibs_cbs_id_classification_ibs_cbs_id_fk" FOREIGN KEY ("classification_ibs_cbs_id") REFERENCES "public"."classification_ibs_cbs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_nfe_operations_id_nfe_operations_id_fk" FOREIGN KEY ("nfe_operations_id") REFERENCES "public"."nfe_operations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_cfop_enterprises_id_cfops_enterprises_id_fk" FOREIGN KEY ("cfop_enterprises_id") REFERENCES "public"."cfops_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_operations_states" ADD CONSTRAINT "nfe_operations_states_icms_taxation_id_icms_taxation_id_fk" FOREIGN KEY ("icms_taxation_id") REFERENCES "public"."icms_taxation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_payments" ADD CONSTRAINT "nfe_payments_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_payments" ADD CONSTRAINT "nfe_payments_payment_type_id_payment_types_id_fk" FOREIGN KEY ("payment_type_id") REFERENCES "public"."payment_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_payments" ADD CONSTRAINT "nfe_payments_payment_types_methods_flags_id_payment_types_methods_flags_id_fk" FOREIGN KEY ("payment_types_methods_flags_id") REFERENCES "public"."payment_types_methods_flags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_places" ADD CONSTRAINT "nfe_places_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_recipient_manifestations" ADD CONSTRAINT "nfe_recipient_manifestations_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_referenced_processes" ADD CONSTRAINT "nfe_referenced_processes_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_references" ADD CONSTRAINT "nfe_references_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_references" ADD CONSTRAINT "nfe_references_mod_fiscal_document_models_code_fk" FOREIGN KEY ("mod") REFERENCES "public"."fiscal_document_models"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_resp_tec" ADD CONSTRAINT "nfe_resp_tec_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_sales" ADD CONSTRAINT "nfe_sales_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_sales" ADD CONSTRAINT "nfe_sales_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_supplier_product_links" ADD CONSTRAINT "nfe_supplier_product_links_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_supplier_product_links" ADD CONSTRAINT "nfe_supplier_product_links_products_enterprises_id_products_enterprises_id_fk" FOREIGN KEY ("products_enterprises_id") REFERENCES "public"."products_enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_transport_trailers" ADD CONSTRAINT "nfe_transport_trailers_nfe_transport_id_nfe_transports_id_fk" FOREIGN KEY ("nfe_transport_id") REFERENCES "public"."nfe_transports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_transport_volume_seals" ADD CONSTRAINT "nfe_transport_volume_seals_nfe_transport_volume_id_nfe_transport_volumes_id_fk" FOREIGN KEY ("nfe_transport_volume_id") REFERENCES "public"."nfe_transport_volumes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_transport_volumes" ADD CONSTRAINT "nfe_transport_volumes_nfe_transport_id_nfe_transports_id_fk" FOREIGN KEY ("nfe_transport_id") REFERENCES "public"."nfe_transports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfe_transports" ADD CONSTRAINT "nfe_transports_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cte_dfe_cursors" ADD CONSTRAINT "cte_dfe_cursors_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cte_document_nfes" ADD CONSTRAINT "cte_document_nfes_cte_document_id_cte_documents_id_fk" FOREIGN KEY ("cte_document_id") REFERENCES "public"."cte_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cte_documents" ADD CONSTRAINT "cte_documents_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printers" ADD CONSTRAINT "printers_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_collection_agreements" ADD CONSTRAINT "bank_collection_agreements_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_remittance_items" ADD CONSTRAINT "bank_remittance_items_remittance_id_bank_remittances_id_fk" FOREIGN KEY ("remittance_id") REFERENCES "public"."bank_remittances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_remittance_items" ADD CONSTRAINT "bank_remittance_items_slip_id_bank_slips_id_fk" FOREIGN KEY ("slip_id") REFERENCES "public"."bank_slips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_remittances" ADD CONSTRAINT "bank_remittances_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_remittances" ADD CONSTRAINT "bank_remittances_agreement_id_bank_collection_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."bank_collection_agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_return_items" ADD CONSTRAINT "bank_return_items_return_id_bank_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."bank_returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_return_items" ADD CONSTRAINT "bank_return_items_slip_id_bank_slips_id_fk" FOREIGN KEY ("slip_id") REFERENCES "public"."bank_slips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_returns" ADD CONSTRAINT "bank_returns_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_returns" ADD CONSTRAINT "bank_returns_agreement_id_bank_collection_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."bank_collection_agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_slip_events" ADD CONSTRAINT "bank_slip_events_slip_id_bank_slips_id_fk" FOREIGN KEY ("slip_id") REFERENCES "public"."bank_slips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_slips" ADD CONSTRAINT "bank_slips_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_slips" ADD CONSTRAINT "bank_slips_installment_id_financial_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."financial_installments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_slips" ADD CONSTRAINT "bank_slips_agreement_id_bank_collection_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."bank_collection_agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_installments" ADD CONSTRAINT "financial_installments_title_id_financial_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."financial_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_title_id_financial_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."financial_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_installment_id_financial_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."financial_installments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_payment_types_methods_flags_id_payment_types_methods_flags_id_fk" FOREIGN KEY ("payment_types_methods_flags_id") REFERENCES "public"."payment_types_methods_flags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_member_credit_id_member_credits_id_fk" FOREIGN KEY ("member_credit_id") REFERENCES "public"."member_credits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_reverses_settlement_id_financial_settlements_id_fk" FOREIGN KEY ("reverses_settlement_id") REFERENCES "public"."financial_settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_title_origins" ADD CONSTRAINT "financial_title_origins_title_id_financial_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."financial_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_title_origins" ADD CONSTRAINT "financial_title_origins_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_title_origins" ADD CONSTRAINT "financial_title_origins_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_titles" ADD CONSTRAINT "financial_titles_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_titles" ADD CONSTRAINT "financial_titles_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_titles" ADD CONSTRAINT "financial_titles_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_titles" ADD CONSTRAINT "financial_titles_payment_types_id_payment_types_id_fk" FOREIGN KEY ("payment_types_id") REFERENCES "public"."payment_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_titles" ADD CONSTRAINT "financial_titles_consolidated_into_id_financial_titles_id_fk" FOREIGN KEY ("consolidated_into_id") REFERENCES "public"."financial_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_credits" ADD CONSTRAINT "member_credits_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_credits" ADD CONSTRAINT "member_credits_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_credits" ADD CONSTRAINT "member_credits_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
CREATE UNIQUE INDEX "states_divisions_state_uf_unique" ON "states_divisions" USING btree ("states_id","uf") WHERE "states_divisions"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprise_groups_name_active_unique" ON "enterprise_groups" USING btree ("name") WHERE "enterprise_groups"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprise_parameters_enterprise_parameter_active_unique" ON "enterprise_parameters" USING btree ("enterprise_id","parameter") WHERE "enterprise_parameters"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "enterprise_parameters_enterprise_active_idx" ON "enterprise_parameters" USING btree ("enterprise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_registration_active_unique" ON "enterprises" USING btree ("registration") WHERE "enterprises"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_legal_name_active_unique" ON "enterprises" USING btree ("legal_name") WHERE "enterprises"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_trade_name_active_unique" ON "enterprises" USING btree ("trade_name") WHERE "enterprises"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "enterprises_group_idx" ON "enterprises" USING btree ("group_id") WHERE "enterprises"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_address_principal_active_unique" ON "enterprises_address" USING btree ("enterprise_id") WHERE "enterprises_address"."deleted_at" is null and "enterprises_address"."adress_type" = 'PRINCIPAL';--> statement-breakpoint
CREATE INDEX "enterprises_address_enterprise_active_idx" ON "enterprises_address" USING btree ("enterprise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_sequences_enterprise_type_uidx" ON "enterprises_sequences" USING btree ("enterprise_id","type") WHERE "enterprises_sequences"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_members_user_enterprise_class_active_unique" ON "enterprises_members" USING btree ("user_id","enterprise_id","class") WHERE "enterprises_members"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_members_enterprise_code_active_unique" ON "enterprises_members" USING btree ("enterprise_id","code") WHERE "enterprises_members"."code" is not null and "enterprises_members"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "enterprises_members_user_enterprise_active_idx" ON "enterprises_members" USING btree ("enterprise_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "type_networks_enterprise_description_unique" ON "type_networks" USING btree ("enterprise_id","description");--> statement-breakpoint
CREATE UNIQUE INDEX "type_supplier_customers_enterprise_description_unique" ON "type_supplier_customers" USING btree ("enterprise_id","description");--> statement-breakpoint
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
CREATE UNIQUE INDEX "products_enterprises_enterprise_code_unique" ON "products_enterprises" USING btree ("enterprises_id","code") WHERE "products_enterprises"."code" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "products_nbs_lc116_nbs_cclasstrib_unique" ON "products_nbs" USING btree ("lc116_item","nbs","c_class_trib");--> statement-breakpoint
CREATE UNIQUE INDEX "products_ncm_ncm_unique" ON "products_ncm" USING btree ("ncm");--> statement-breakpoint
CREATE INDEX "promotional_prices_description_date_idx" ON "promotional_prices" USING btree ("description","start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "type_sped_type_unique" ON "type_sped" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_cart_items_member_product_unique" ON "marketplace_cart_items" USING btree ("enterprises_members_id","marketplace_product_id");--> statement-breakpoint
CREATE INDEX "marketplace_cart_items_enterprise_member_idx" ON "marketplace_cart_items" USING btree ("enterprises_id","enterprises_members_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_delivery_items_delivery_item_unique" ON "marketplace_delivery_items" USING btree ("delivery_id","order_item_id");--> statement-breakpoint
CREATE INDEX "marketplace_delivery_items_order_item_idx" ON "marketplace_delivery_items" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "marketplace_deliverys_order_idx" ON "marketplace_deliverys" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "marketplace_deliverys_enterprise_status_idx" ON "marketplace_deliverys" USING btree ("enterprises_id","status");--> statement-breakpoint
CREATE INDEX "marketplace_deliverys_enterprise_type_idx" ON "marketplace_deliverys" USING btree ("enterprises_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_favorites_member_product_unique" ON "marketplace_favorites" USING btree ("enterprises_members_id","marketplace_product_id");--> statement-breakpoint
CREATE INDEX "marketplace_favorites_enterprise_member_idx" ON "marketplace_favorites" USING btree ("enterprises_id","enterprises_members_id");--> statement-breakpoint
CREATE INDEX "marketplace_order_items_order_idx" ON "marketplace_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_orders_enterprise_code_unique" ON "marketplace_orders" USING btree ("enterprises_id","code");--> statement-breakpoint
CREATE INDEX "marketplace_orders_enterprise_member_idx" ON "marketplace_orders" USING btree ("enterprises_id","enterprises_members_id");--> statement-breakpoint
CREATE INDEX "marketplace_orders_enterprise_status_idx" ON "marketplace_orders" USING btree ("enterprises_id","status");--> statement-breakpoint
CREATE INDEX "marketplace_orders_coupon_idx" ON "marketplace_orders" USING btree ("coupon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_product_characteristics_name_unique" ON "marketplace_product_characteristics" USING btree ("marketplace_product_id","name");--> statement-breakpoint
CREATE INDEX "marketplace_product_characteristics_product_idx" ON "marketplace_product_characteristics" USING btree ("marketplace_product_id");--> statement-breakpoint
CREATE INDEX "marketplace_product_photos_product_idx" ON "marketplace_product_photos" USING btree ("marketplace_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_product_photos_product_url_unique" ON "marketplace_product_photos" USING btree ("marketplace_product_id","photo_url");--> statement-breakpoint
CREATE INDEX "marketplace_product_questions_product_idx" ON "marketplace_product_questions" USING btree ("marketplace_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_product_reviews_member_unique" ON "marketplace_product_reviews" USING btree ("marketplace_product_id","enterprises_members_id");--> statement-breakpoint
CREATE INDEX "marketplace_product_reviews_product_idx" ON "marketplace_product_reviews" USING btree ("marketplace_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_product_variant_option_values_unique" ON "marketplace_product_variant_option_values" USING btree ("option_id","value");--> statement-breakpoint
CREATE INDEX "marketplace_product_variant_option_values_option_idx" ON "marketplace_product_variant_option_values" USING btree ("option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_product_variant_options_name_unique" ON "marketplace_product_variant_options" USING btree ("marketplace_product_id","name");--> statement-breakpoint
CREATE INDEX "marketplace_product_variant_options_product_idx" ON "marketplace_product_variant_options" USING btree ("marketplace_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_product_variant_selections_unique" ON "marketplace_product_variant_selections" USING btree ("variant_id","option_value_id");--> statement-breakpoint
CREATE INDEX "marketplace_product_variant_selections_variant_idx" ON "marketplace_product_variant_selections" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_product_variants_sku_unique" ON "marketplace_product_variants" USING btree ("marketplace_product_id","sku") WHERE "marketplace_product_variants"."sku" is not null;--> statement-breakpoint
CREATE INDEX "marketplace_product_variants_product_idx" ON "marketplace_product_variants" USING btree ("marketplace_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_products_enterprise_pe_unique" ON "marketplace_products" USING btree ("enterprises_id","products_enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_products_enterprise_slug_unique" ON "marketplace_products" USING btree ("enterprises_id","slug");--> statement-breakpoint
CREATE INDEX "marketplace_products_enterprise_published_idx" ON "marketplace_products" USING btree ("enterprises_id","is_published");--> statement-breakpoint
CREATE INDEX "marketplace_products_slug_idx" ON "marketplace_products" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_coupon_redemptions_order_unique" ON "marketplace_coupon_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "marketplace_coupon_redemptions_coupon_status_idx" ON "marketplace_coupon_redemptions" USING btree ("coupon_id","status");--> statement-breakpoint
CREATE INDEX "marketplace_coupon_redemptions_member_coupon_idx" ON "marketplace_coupon_redemptions" USING btree ("enterprises_members_id","coupon_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_coupons_enterprise_code_unique" ON "marketplace_coupons" USING btree ("enterprises_id","code");--> statement-breakpoint
CREATE INDEX "marketplace_coupons_enterprise_active_idx" ON "marketplace_coupons" USING btree ("enterprises_id","is_active");--> statement-breakpoint
CREATE INDEX "marketplace_payment_configs_enterprise_idx" ON "marketplace_payment_configs" USING btree ("enterprises_id");--> statement-breakpoint
CREATE INDEX "marketplace_payment_configs_enterprise_provider_idx" ON "marketplace_payment_configs" USING btree ("enterprises_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_payment_configs_active_default_unique" ON "marketplace_payment_configs" USING btree ("enterprises_id") WHERE "marketplace_payment_configs"."status" = 'ATIVO' AND "marketplace_payment_configs"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_payment_events_provider_event_unique" ON "marketplace_payment_events" USING btree ("provider","event_id");--> statement-breakpoint
CREATE INDEX "marketplace_payment_events_payment_idx" ON "marketplace_payment_events" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_payments_idempotency_key_unique" ON "marketplace_payments" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_payments_provider_order_unique" ON "marketplace_payments" USING btree ("provider","provider_order_id") WHERE "marketplace_payments"."provider_order_id" is not null;--> statement-breakpoint
CREATE INDEX "marketplace_payments_order_idx" ON "marketplace_payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "marketplace_payments_enterprise_outcome_idx" ON "marketplace_payments" USING btree ("enterprises_id","outcome");--> statement-breakpoint
CREATE INDEX "harbour_sale_sync_events_sale_id_idx" ON "harbour_sale_sync_events" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "harbour_sale_sync_events_pending_idx" ON "harbour_sale_sync_events" USING btree ("enterprises_id","created_at") WHERE "harbour_sale_sync_events"."status" = 'PENDING';--> statement-breakpoint
CREATE UNIQUE INDEX "harbour_sale_sync_events_pending_unique" ON "harbour_sale_sync_events" USING btree ("enterprises_id","sale_id","event_type") WHERE "harbour_sale_sync_events"."status" = 'PENDING';--> statement-breakpoint
CREATE UNIQUE INDEX "mechanic_sales_items_unique" ON "mechanic_sales_items" USING btree ("mechanic","sales_items_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_payment_code_unique" ON "payment_methods" USING btree ("payment_code");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_types_enterprise_description_unique" ON "payment_types" USING btree ("enterprise_id","description");--> statement-breakpoint
CREATE UNIQUE INDEX "ptmf_enterprise_combo_flag_unique" ON "payment_types_methods_flags" USING btree ("enterprises_id","payment_types_id","payment_methods_id","type_flags_id") WHERE "payment_types_methods_flags"."type_flags_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "ptmf_enterprise_combo_no_flag_unique" ON "payment_types_methods_flags" USING btree ("enterprises_id","payment_types_id","payment_methods_id") WHERE "payment_types_methods_flags"."type_flags_id" is null;--> statement-breakpoint
CREATE INDEX "ptmf_enterprises_id_idx" ON "payment_types_methods_flags" USING btree ("enterprises_id");--> statement-breakpoint
CREATE INDEX "ptmf_band_member_id_idx" ON "payment_types_methods_flags" USING btree ("band_member_id");--> statement-breakpoint
CREATE INDEX "ptmf_intermediary_member_id_idx" ON "payment_types_methods_flags" USING btree ("intermediary_member_id");--> statement-breakpoint
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
CREATE UNIQUE INDEX "type_flags_flag_code_unique" ON "type_flags" USING btree ("flag_code");--> statement-breakpoint
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
CREATE UNIQUE INDEX "anexos_rt_ncm_anexo_class_unique" ON "anexos_rt" USING btree ("products_ncm_id","legislation","anexo","classification_ibs_cbs_id");--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_code_uf_code_unique" ON "benefit_code" USING btree ("uf","code_benefit");--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_code_by_cfop_unique" ON "benefit_code_by_cfop" USING btree ("enterprises_id","cfop","cst","benefit_code_id");--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_state_products_unique" ON "benefit_code_by_state_and_products" USING btree ("enterprises_id","state_id","cfop","cst","products_enterprises_id","benefit_code_id");--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_type_costumers_unique" ON "benefit_type_costumers" USING btree ("enterprise_id","type_supplier_customer_id","cfop","cst","benefit_code_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cfops_cfop_unique" ON "cfops" USING btree ("cfop");--> statement-breakpoint
CREATE UNIQUE INDEX "cfops_enterprises_cfop_enterprises_unique" ON "cfops_enterprises" USING btree ("cfop_id","enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "classification_ibs_cbs_c_class_trib_unique" ON "classification_ibs_cbs" USING btree ("c_class_trib");--> statement-breakpoint
CREATE UNIQUE INDEX "cst_compativel_benefit_benefit_cst_unique" ON "cst_compativel_benefit" USING btree ("benefit_code_id","situation_tributary_cst_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cst_ibs_cbs_cst_unique" ON "cst_ibs_cbs" USING btree ("cst");--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_nfe_enterprise_active_unique" ON "enterprises_nfe" USING btree ("enterprise_id") WHERE "enterprises_nfe"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_nfe_certificates_active_unique" ON "enterprises_nfe_certificates" USING btree ("enterprise_id") WHERE "enterprises_nfe_certificates"."deleted_at" is null and "enterprises_nfe_certificates"."status" = 'ATIVO';--> statement-breakpoint
CREATE INDEX "enterprises_nfe_certificates_enterprise_idx" ON "enterprises_nfe_certificates" USING btree ("enterprise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_print_models_unique" ON "enterprises_print_models" USING btree ("enterprise_id","document_model_code");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_additional_notes_header_type_seq_unique" ON "nfe_additional_notes" USING btree ("nfe_header_id","note_type","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_advance_payments_header_seq_unique" ON "nfe_advance_payments" USING btree ("nfe_header_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_duplicates_header_ndup_unique" ON "nfe_duplicates" USING btree ("nfe_header_id","n_dup");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_entry_transports_header_kind_unique" ON "nfe_entry_transports" USING btree ("nfe_header_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_events_header_type_seq_unique" ON "nfe_events" USING btree ("nfe_header_id","event_type","n_seq_evento") WHERE "nfe_events"."nfe_header_id" is not null;--> statement-breakpoint
CREATE INDEX "nfe_events_enterprise_idx" ON "nfe_events" USING btree ("enterprise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_headers_enterprise_chave_active_unique" ON "nfe_headers" USING btree ("enterprise_id","chave") WHERE "nfe_headers"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "nfe_headers_dh_emi_idx" ON "nfe_headers" USING btree ("dh_emi");--> statement-breakpoint
CREATE INDEX "nfe_headers_emit_member_idx" ON "nfe_headers" USING btree ("emit_member_id");--> statement-breakpoint
CREATE INDEX "nfe_headers_dest_member_idx" ON "nfe_headers" USING btree ("dest_member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_exports_item_seq_unique" ON "nfe_item_exports" USING btree ("nfe_item_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_fuel_nozzles_seq_unique" ON "nfe_item_fuel_nozzles" USING btree ("nfe_item_fuel_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_fuel_origins_seq_unique" ON "nfe_item_fuel_origins" USING btree ("nfe_item_fuel_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_fuels_item_unique" ON "nfe_item_fuels" USING btree ("nfe_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_import_additions_seq_unique" ON "nfe_item_import_additions" USING btree ("nfe_item_import_id","n_adicao","n_seq_adic");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_imports_item_seq_unique" ON "nfe_item_imports" USING btree ("nfe_item_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_medicines_item_seq_unique" ON "nfe_item_medicines" USING btree ("nfe_item_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_nves_item_seq_unique" ON "nfe_item_nves" USING btree ("nfe_item_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_presumed_credits_item_seq_unique" ON "nfe_item_presumed_credits" USING btree ("nfe_item_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_taxes_item_unique" ON "nfe_item_taxes" USING btree ("nfe_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_tracks_item_seq_unique" ON "nfe_item_tracks" USING btree ("nfe_item_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_vehicles_item_unique" ON "nfe_item_vehicles" USING btree ("nfe_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_item_weapons_item_seq_unique" ON "nfe_item_weapons" USING btree ("nfe_item_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_items_header_nitem_unique" ON "nfe_items" USING btree ("nfe_header_id","n_item");--> statement-breakpoint
CREATE INDEX "nfe_items_product_idx" ON "nfe_items" USING btree ("products_enterprises_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_operations_key_unique" ON "nfe_operations" USING btree ("description");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_operations_states_key_unique" ON "nfe_operations_states" USING btree ("enterprise_id","state_id","nfe_operations_id","cfop_enterprises_id","icms_taxation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_parameters_parameter_active_unique" ON "nfe_parameters" USING btree ("parameter") WHERE "nfe_parameters"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "nfe_payments_header_idx" ON "nfe_payments" USING btree ("nfe_header_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_places_header_type_unique" ON "nfe_places" USING btree ("nfe_header_id","place_type");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_recipient_manifestations_enterprise_chave_type_unique" ON "nfe_recipient_manifestations" USING btree ("enterprise_id","chave","event_type");--> statement-breakpoint
CREATE INDEX "nfe_recipient_manifestations_enterprise_idx" ON "nfe_recipient_manifestations" USING btree ("enterprise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_referenced_processes_header_seq_unique" ON "nfe_referenced_processes" USING btree ("nfe_header_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_references_header_seq_unique" ON "nfe_references" USING btree ("nfe_header_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_resp_tec_header_unique" ON "nfe_resp_tec" USING btree ("nfe_header_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_sales_sale_active_unique" ON "nfe_sales" USING btree ("sales_id") WHERE "nfe_sales"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "nfe_sales_header_idx" ON "nfe_sales" USING btree ("nfe_header_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_supplier_product_links_key_unique" ON "nfe_supplier_product_links" USING btree ("enterprise_id","supplier_document","c_prod");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_transport_trailers_seq_unique" ON "nfe_transport_trailers" USING btree ("nfe_transport_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_transport_volume_seals_unique" ON "nfe_transport_volume_seals" USING btree ("nfe_transport_volume_id","n_lacre");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_transport_volumes_seq_unique" ON "nfe_transport_volumes" USING btree ("nfe_transport_id","n_seq");--> statement-breakpoint
CREATE UNIQUE INDEX "nfe_transports_header_unique" ON "nfe_transports" USING btree ("nfe_header_id");--> statement-breakpoint
CREATE UNIQUE INDEX "presumed_credit_cred_pres_unique" ON "presumed_credit" USING btree ("c_cred_pres");--> statement-breakpoint
CREATE UNIQUE INDEX "situation_tributary_cst_regime_origin_cst_unique" ON "situation_tributary_cst" USING btree ("regime_tributario","origin","cst");--> statement-breakpoint
CREATE UNIQUE INDEX "cte_document_nfes_document_chave_unique" ON "cte_document_nfes" USING btree ("cte_document_id","chave");--> statement-breakpoint
CREATE INDEX "cte_document_nfes_chave_idx" ON "cte_document_nfes" USING btree ("chave");--> statement-breakpoint
CREATE UNIQUE INDEX "cte_documents_enterprise_chave_unique" ON "cte_documents" USING btree ("enterprise_id","chave");--> statement-breakpoint
CREATE UNIQUE INDEX "printers_enterprise_computer_share_unique" ON "printers" USING btree ("enterprises_id",lower("computer_name"),lower("share_name"));--> statement-breakpoint
CREATE UNIQUE INDEX "printers_enterprise_default_unique" ON "printers" USING btree ("enterprises_id") WHERE "printers"."is_default" = true;--> statement-breakpoint
CREATE INDEX "printers_enterprise_idx" ON "printers" USING btree ("enterprises_id");--> statement-breakpoint
CREATE INDEX "bank_collection_agreements_enterprise_idx" ON "bank_collection_agreements" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "bank_remittance_items_remittance_idx" ON "bank_remittance_items" USING btree ("remittance_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_remittances_agreement_sequence_unique" ON "bank_remittances" USING btree ("agreement_id","sequence");--> statement-breakpoint
CREATE INDEX "bank_return_items_return_idx" ON "bank_return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "bank_slip_events_slip_idx" ON "bank_slip_events" USING btree ("slip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_slips_installment_open_unique" ON "bank_slips" USING btree ("installment_id") WHERE "bank_slips"."status" <> 'CANCELADO';--> statement-breakpoint
CREATE UNIQUE INDEX "bank_slips_agreement_nosso_numero_unique" ON "bank_slips" USING btree ("agreement_id","nosso_numero");--> statement-breakpoint
CREATE INDEX "bank_slips_enterprise_status_idx" ON "bank_slips" USING btree ("enterprise_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_installments_title_number_source_unique" ON "financial_installments" USING btree ("title_id","number","schedule_source");--> statement-breakpoint
CREATE INDEX "financial_installments_title_due_idx" ON "financial_installments" USING btree ("title_id","due_date");--> statement-breakpoint
CREATE INDEX "financial_settlements_title_idx" ON "financial_settlements" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "financial_settlements_installment_idx" ON "financial_settlements" USING btree ("installment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_title_origins_title_sale_unique" ON "financial_title_origins" USING btree ("title_id","sales_id") WHERE "financial_title_origins"."sales_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "financial_title_origins_live_sale_unique" ON "financial_title_origins" USING btree ("sales_id") WHERE "financial_title_origins"."sales_id" is not null and "financial_title_origins"."live" = true;--> statement-breakpoint
CREATE INDEX "financial_title_origins_title_idx" ON "financial_title_origins" USING btree ("title_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_titles_enterprise_direction_number_unique" ON "financial_titles" USING btree ("enterprise_id","direction","number");--> statement-breakpoint
CREATE INDEX "financial_titles_enterprise_direction_status_idx" ON "financial_titles" USING btree ("enterprise_id","direction","status");--> statement-breakpoint
CREATE INDEX "financial_titles_nfe_header_idx" ON "financial_titles" USING btree ("nfe_header_id");--> statement-breakpoint
CREATE INDEX "member_credits_enterprise_member_status_idx" ON "member_credits" USING btree ("enterprise_id","member_id","status");--> statement-breakpoint
CREATE INDEX "entity_audit_entity_idx" ON "entity_audit_log" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "entity_audit_enterprise_idx" ON "entity_audit_log" USING btree ("enterprise_id","created_at");--> statement-breakpoint
CREATE INDEX "entity_audit_actor_user_idx" ON "entity_audit_log" USING btree ("actor_user_id","created_at");