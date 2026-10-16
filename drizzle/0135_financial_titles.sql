CREATE TYPE "public"."financial_direction" AS ENUM('RECEBER', 'PAGAR');--> statement-breakpoint
CREATE TYPE "public"."financial_source" AS ENUM('VENDA', 'MANUAL', 'COMPRA', 'DEVOLUCAO');--> statement-breakpoint
CREATE TYPE "public"."financial_kind" AS ENUM('PEDIDO', 'NFE', 'BOLETO', 'AVULSO', 'COMPRA');--> statement-breakpoint
CREATE TYPE "public"."financial_title_status" AS ENUM('ABERTO', 'PARCIAL', 'QUITADO', 'CANCELADO', 'CONSOLIDADO');--> statement-breakpoint
CREATE TYPE "public"."financial_installment_status" AS ENUM('ABERTA', 'PARCIAL', 'QUITADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."financial_schedule_source" AS ENUM('PEDIDO', 'NFE', 'BOLETO');--> statement-breakpoint
CREATE TYPE "public"."financial_settlement_kind" AS ENUM('BAIXA', 'ABATIMENTO_DEVOLUCAO', 'ABATIMENTO_CREDITO', 'ESTORNO');--> statement-breakpoint
CREATE TYPE "public"."member_credit_origin" AS ENUM('DEVOLUCAO', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."member_credit_status" AS ENUM('ABERTO', 'PARCIAL', 'UTILIZADO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."bank_channel" AS ENUM('API', 'CNAB');--> statement-breakpoint
CREATE TYPE "public"."cnab_layout" AS ENUM('CNAB240', 'CNAB400');--> statement-breakpoint
CREATE TYPE "public"."bank_slip_status" AS ENUM('RASCUNHO', 'AGUARDANDO_REGISTRO', 'REGISTRADO', 'REJEITADO', 'LIQUIDADO', 'BAIXADO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."bank_slip_event_kind" AS ENUM('EMISSAO', 'REGISTRO', 'REJEICAO', 'ALTERACAO_VENCIMENTO', 'LIQUIDACAO', 'BAIXA', 'WEBHOOK', 'RETORNO');--> statement-breakpoint
CREATE TYPE "public"."remittance_status" AS ENUM('GERADA', 'PROCESSADA');--> statement-breakpoint
CREATE TYPE "public"."remittance_movement" AS ENUM('REGISTRO', 'ALTERACAO_VENCIMENTO', 'PEDIDO_BAIXA');--> statement-breakpoint
CREATE TYPE "public"."return_occurrence" AS ENUM('REGISTRO_CONFIRMADO', 'REGISTRO_REJEITADO', 'LIQUIDACAO', 'BAIXA');--> statement-breakpoint
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
  "consolidated_into_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "financial_titles_open_amount_check" CHECK ("open_amount" >= 0 AND "open_amount" <= "original_amount")
);--> statement-breakpoint
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
  CONSTRAINT "financial_installments_open_amount_check" CHECK ("open_amount" >= 0 AND "open_amount" <= "original_amount")
);--> statement-breakpoint
CREATE TABLE "financial_title_origins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title_id" uuid NOT NULL,
  "sales_id" uuid,
  "nfe_header_id" uuid,
  "contributed_amount" numeric(15, 2) NOT NULL,
  "returned_amount" numeric(15, 2) DEFAULT 0 NOT NULL,
  "live" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "financial_title_origins_source_check" CHECK ("sales_id" IS NOT NULL OR "nfe_header_id" IS NOT NULL)
);--> statement-breakpoint
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
  CONSTRAINT "member_credits_open_amount_check" CHECK ("open_amount" >= 0 AND "open_amount" <= "original_amount")
);--> statement-breakpoint
CREATE TABLE "financial_settlements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "title_id" uuid NOT NULL,
  "installment_id" uuid NOT NULL,
  "kind" "financial_settlement_kind" NOT NULL,
  "amount" numeric(15, 2) NOT NULL,
  "settled_at" date NOT NULL,
  "payment_types_methods_flags_id" uuid,
  "member_credit_id" uuid,
  "sales_id" uuid,
  "return_order" integer,
  "reverses_settlement_id" uuid,
  "note" varchar(500),
  "user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "financial_settlements_amount_check" CHECK ("amount" > 0)
);--> statement-breakpoint
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
  CONSTRAINT "bank_collection_agreements_layout_check" CHECK (("channel" = 'CNAB' AND "cnab_layout" IS NOT NULL) OR ("channel" = 'API' AND "cnab_layout" IS NULL))
);--> statement-breakpoint
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
);--> statement-breakpoint
CREATE TABLE "bank_slip_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slip_id" uuid NOT NULL,
  "kind" "bank_slip_event_kind" NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "summary" jsonb
);--> statement-breakpoint
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
);--> statement-breakpoint
CREATE TABLE "bank_remittance_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "remittance_id" uuid NOT NULL,
  "slip_id" uuid NOT NULL,
  "movement" "remittance_movement" NOT NULL
);--> statement-breakpoint
CREATE TABLE "bank_returns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "agreement_id" uuid NOT NULL,
  "file_name" varchar(120) NOT NULL,
  "layout" "cnab_layout" NOT NULL,
  "content" text NOT NULL,
  "imported_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
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
);--> statement-breakpoint
ALTER TABLE "financial_titles" ADD CONSTRAINT "financial_titles_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_titles" ADD CONSTRAINT "financial_titles_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_titles" ADD CONSTRAINT "financial_titles_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_titles" ADD CONSTRAINT "financial_titles_consolidated_into_id_financial_titles_id_fk" FOREIGN KEY ("consolidated_into_id") REFERENCES "public"."financial_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_installments" ADD CONSTRAINT "financial_installments_title_id_financial_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."financial_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_title_origins" ADD CONSTRAINT "financial_title_origins_title_id_financial_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."financial_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_title_origins" ADD CONSTRAINT "financial_title_origins_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_title_origins" ADD CONSTRAINT "financial_title_origins_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_credits" ADD CONSTRAINT "member_credits_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_credits" ADD CONSTRAINT "member_credits_member_id_enterprises_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_credits" ADD CONSTRAINT "member_credits_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_title_id_financial_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."financial_titles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_installment_id_financial_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."financial_installments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_payment_flag_fk" FOREIGN KEY ("payment_types_methods_flags_id") REFERENCES "public"."payment_types_methods_flags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_member_credit_id_member_credits_id_fk" FOREIGN KEY ("member_credit_id") REFERENCES "public"."member_credits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_reverses_settlement_id_fk" FOREIGN KEY ("reverses_settlement_id") REFERENCES "public"."financial_settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_collection_agreements" ADD CONSTRAINT "bank_collection_agreements_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_slips" ADD CONSTRAINT "bank_slips_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_slips" ADD CONSTRAINT "bank_slips_installment_id_financial_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."financial_installments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_slips" ADD CONSTRAINT "bank_slips_agreement_id_bank_collection_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."bank_collection_agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_slip_events" ADD CONSTRAINT "bank_slip_events_slip_id_bank_slips_id_fk" FOREIGN KEY ("slip_id") REFERENCES "public"."bank_slips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_remittances" ADD CONSTRAINT "bank_remittances_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_remittances" ADD CONSTRAINT "bank_remittances_agreement_id_bank_collection_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."bank_collection_agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_remittance_items" ADD CONSTRAINT "bank_remittance_items_remittance_id_bank_remittances_id_fk" FOREIGN KEY ("remittance_id") REFERENCES "public"."bank_remittances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_remittance_items" ADD CONSTRAINT "bank_remittance_items_slip_id_bank_slips_id_fk" FOREIGN KEY ("slip_id") REFERENCES "public"."bank_slips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_returns" ADD CONSTRAINT "bank_returns_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_returns" ADD CONSTRAINT "bank_returns_agreement_id_bank_collection_agreements_id_fk" FOREIGN KEY ("agreement_id") REFERENCES "public"."bank_collection_agreements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_return_items" ADD CONSTRAINT "bank_return_items_return_id_bank_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."bank_returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_return_items" ADD CONSTRAINT "bank_return_items_slip_id_bank_slips_id_fk" FOREIGN KEY ("slip_id") REFERENCES "public"."bank_slips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "financial_titles_enterprise_direction_number_unique" ON "financial_titles" USING btree ("enterprise_id","direction","number");--> statement-breakpoint
CREATE INDEX "financial_titles_enterprise_direction_status_idx" ON "financial_titles" USING btree ("enterprise_id","direction","status");--> statement-breakpoint
CREATE INDEX "financial_titles_nfe_header_idx" ON "financial_titles" USING btree ("nfe_header_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_installments_title_number_source_unique" ON "financial_installments" USING btree ("title_id","number","schedule_source");--> statement-breakpoint
CREATE INDEX "financial_installments_title_due_idx" ON "financial_installments" USING btree ("title_id","due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_title_origins_title_sale_unique" ON "financial_title_origins" USING btree ("title_id","sales_id") WHERE "sales_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "financial_title_origins_live_sale_unique" ON "financial_title_origins" USING btree ("sales_id") WHERE "sales_id" IS NOT NULL AND "live" = true;--> statement-breakpoint
CREATE INDEX "financial_title_origins_title_idx" ON "financial_title_origins" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "member_credits_enterprise_member_status_idx" ON "member_credits" USING btree ("enterprise_id","member_id","status");--> statement-breakpoint
CREATE INDEX "financial_settlements_title_idx" ON "financial_settlements" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "financial_settlements_installment_idx" ON "financial_settlements" USING btree ("installment_id");--> statement-breakpoint
CREATE INDEX "bank_collection_agreements_enterprise_idx" ON "bank_collection_agreements" USING btree ("enterprise_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_slips_installment_open_unique" ON "bank_slips" USING btree ("installment_id") WHERE "status" <> 'CANCELADO';--> statement-breakpoint
CREATE UNIQUE INDEX "bank_slips_agreement_nosso_numero_unique" ON "bank_slips" USING btree ("agreement_id","nosso_numero");--> statement-breakpoint
CREATE INDEX "bank_slips_enterprise_status_idx" ON "bank_slips" USING btree ("enterprise_id","status");--> statement-breakpoint
CREATE INDEX "bank_slip_events_slip_idx" ON "bank_slip_events" USING btree ("slip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_remittances_agreement_sequence_unique" ON "bank_remittances" USING btree ("agreement_id","sequence");--> statement-breakpoint
CREATE INDEX "bank_remittance_items_remittance_idx" ON "bank_remittance_items" USING btree ("remittance_id");--> statement-breakpoint
CREATE INDEX "bank_return_items_return_idx" ON "bank_return_items" USING btree ("return_id");