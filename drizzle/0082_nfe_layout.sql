-- Alinha nfe_invoices ao schema nfe_headers e cria os cadastros e grupos da NF-e.

DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'CFOPS';
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'CFOPS_ENTERPRISES';
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'SITUATION_TRIBUTARY_CST';
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'BENEFIT_CODE';
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'CST_COMPATIVEL_BENEFIT';
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'CST_IBS_CBS';
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'CLASSIFICATION_IBS_CBS';
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'ANEXOS_RT';
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'NFE_HEADERS';
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."nfe_reference_type" AS ENUM ('NFE', 'CTE', 'NF', 'NFP', 'ECF');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."nfe_event_type" AS ENUM ('CANCELAMENTO', 'CARTA_CORRECAO', 'INUTILIZACAO');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."nfe_place_type" AS ENUM ('RETIRADA', 'ENTREGA');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."nfe_additional_note_type" AS ENUM ('OBS_CONT', 'OBS_FISCO');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."cfop_moviment_type" AS ENUM ('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'DEVOLUCAO');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."regime_tributario" AS ENUM ('1', '2', '3', '4');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."cst_origin" AS ENUM ('0', '1', '2', '3', '4', '5', '6', '7', '8');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

DO $$ BEGIN
  IF to_regclass('public.nfe_invoices') IS NOT NULL
     AND to_regclass('public.nfe_headers') IS NULL THEN
    ALTER TABLE "nfe_invoices" RENAME TO "nfe_headers";
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF to_regclass('public.nfe_headers') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'nfe_headers'
         AND column_name = 'serie' AND data_type = 'integer'
     ) THEN
    ALTER TABLE "nfe_headers" DROP CONSTRAINT IF EXISTS "nfe_invoices_serie_chk";
    ALTER TABLE "nfe_headers" ALTER COLUMN "serie" TYPE varchar(3) USING "serie"::varchar;
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF to_regclass('public.nfe_headers') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'nfe_headers'
         AND column_name = 'c_mun_fg' AND data_type = 'character varying'
     ) THEN
    ALTER TABLE "nfe_headers"
      ALTER COLUMN "c_mun_fg" TYPE integer
      USING CASE WHEN "c_mun_fg" ~ '^[0-9]+$' THEN "c_mun_fg"::integer ELSE NULL END;
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF to_regclass('public.nfe_headers') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'nfe_headers'
         AND column_name = 'c_mun_fg_ibs' AND data_type = 'character varying'
     ) THEN
    ALTER TABLE "nfe_headers"
      ALTER COLUMN "c_mun_fg_ibs" TYPE integer
      USING CASE WHEN "c_mun_fg_ibs" ~ '^[0-9]+$' THEN "c_mun_fg_ibs"::integer ELSE NULL END;
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "tp_ente_gov" varchar(1);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "p_redutor" numeric(15, 4);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "tp_oper_gov" varchar(1);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "intermed_cnpj" varchar(14);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "intermed_id_cad_int_tran" varchar(60);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "exporta_uf_saida_pais" varchar(2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "exporta_x_loc_exporta" varchar(60);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "exporta_x_loc_despacho" varchar(60);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_icms_mono" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_icms_mono_reten" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_icms_mono_ret" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_dif_ibs_uf" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_dev_trib_ibs_uf" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_dif_ibs_mun" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_dev_trib_ibs_mun" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_cred_pres_ibs" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_cred_pres_cond_sus_ibs" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_dif_cbs" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_dev_trib_cbs" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_cred_pres_cbs" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_cred_pres_cond_sus_cbs" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_ibs_mono" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_cbs_mono" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_ibs_mono_reten" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_cbs_mono_reten" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_ibs_mono_ret" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_cbs_mono_ret" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_ibs_est_cred" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "nfe_headers" ADD COLUMN IF NOT EXISTS "v_cbs_est_cred" numeric(15, 2);--> statement-breakpoint

ALTER TABLE "enterprises_nfe" ADD COLUMN IF NOT EXISTS "resp_tec_cnpj" varchar(14);--> statement-breakpoint
ALTER TABLE "enterprises_nfe" ADD COLUMN IF NOT EXISTS "resp_tec_contato" varchar(60);--> statement-breakpoint
ALTER TABLE "enterprises_nfe" ADD COLUMN IF NOT EXISTS "resp_tec_email" varchar(60);--> statement-breakpoint
ALTER TABLE "enterprises_nfe" ADD COLUMN IF NOT EXISTS "resp_tec_fone" varchar(14);--> statement-breakpoint
ALTER TABLE "enterprises_nfe" ADD COLUMN IF NOT EXISTS "resp_tec_id_csrt" varchar(2);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "nfe_headers" ADD CONSTRAINT "nfe_headers_serie_chk" CHECK ("serie" ~ '^[0-9]{1,3}$');
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_headers" ADD CONSTRAINT "nfe_headers_intermed_chk" CHECK (("intermed_cnpj" IS NULL AND "intermed_id_cad_int_tran" IS NULL) OR ("intermed_cnpj" IS NOT NULL AND "intermed_id_cad_int_tran" IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_headers" ADD CONSTRAINT "nfe_headers_exporta_chk" CHECK (("exporta_uf_saida_pais" IS NULL AND "exporta_x_loc_exporta" IS NULL) OR ("exporta_uf_saida_pais" IS NOT NULL AND "exporta_x_loc_exporta" IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_headers" ADD CONSTRAINT "nfe_headers_compra_gov_chk" CHECK (("tp_ente_gov" IS NULL AND "p_redutor" IS NULL AND "tp_oper_gov" IS NULL) OR ("tp_ente_gov" IS NOT NULL AND "p_redutor" IS NOT NULL AND "tp_oper_gov" IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "cfops" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cfop" varchar(4) NOT NULL,
  "description" varchar(255) NOT NULL,
  "generate_revenue" boolean DEFAULT false NOT NULL,
  "issued_nfce" boolean DEFAULT false NOT NULL,
  "moviment_type" "public"."cfop_moviment_type" NOT NULL,
  "cfop_for_fuels" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cfops_cfop_unique" ON "cfops" ("cfop");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "cfops_enterprises" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprises_id" uuid NOT NULL REFERENCES "enterprises"("id") ON DELETE cascade,
  "cfop_id" uuid NOT NULL REFERENCES "cfops"("id") ON DELETE cascade,
  "addition_cfop" text,
  "edit_description" boolean DEFAULT false NOT NULL,
  "calculates_difal" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cfops_enterprises_cfop_enterprises_unique" ON "cfops_enterprises" ("cfop_id", "enterprises_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "situation_tributary_cst" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "regime_tributario" "public"."regime_tributario" NOT NULL,
  "cst" varchar(3) NOT NULL,
  "description" varchar(255) NOT NULL,
  "allows_credit" boolean DEFAULT false NOT NULL,
  "features_reduction" boolean DEFAULT false NOT NULL,
  "has_st" boolean DEFAULT false NOT NULL,
  "observation" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  CONSTRAINT "situation_tributary_cst_cst_chk" CHECK ("cst" ~ '^[0-9]{2,3}$')
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "situation_tributary_cst_regime_cst_unique" ON "situation_tributary_cst" ("regime_tributario", "cst");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "benefit_code" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "uf" varchar(2) NOT NULL,
  "code_benefit" varchar(10) NOT NULL,
  "description_benefit" text,
  "observation_benefit" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "benefit_code_uf_code_unique" ON "benefit_code" ("uf", "code_benefit");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "cst_compativel_benefit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "benefit_code_id" uuid NOT NULL REFERENCES "benefit_code"("id") ON DELETE cascade,
  "situation_tributary_cst_id" uuid NOT NULL REFERENCES "situation_tributary_cst"("id") ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cst_compativel_benefit_unique" ON "cst_compativel_benefit" ("benefit_code_id", "situation_tributary_cst_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "cst_ibs_cbs" (
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
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cst_ibs_cbs_cst_unique" ON "cst_ibs_cbs" ("cst");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "classification_ibs_cbs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cst_ibs_cbs_id" uuid NOT NULL REFERENCES "cst_ibs_cbs"("id") ON DELETE cascade,
  "c_class_trib" varchar(6) NOT NULL,
  "name_class_trib" varchar(255) NOT NULL,
  "description_class_trib" text,
  "lc_redacao" text,
  "lc_214_25" varchar(255),
  "p_red_ibs" numeric(15, 10),
  "p_red_cbs" numeric(15, 10),
  "ind_g_trib_regular" varchar(1) NOT NULL,
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
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "classification_ibs_cbs_c_class_trib_unique" ON "classification_ibs_cbs" ("c_class_trib");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "anexos_rt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "products_ncm_id" uuid NOT NULL REFERENCES "products_ncm"("id") ON DELETE cascade,
  "date_fim" date NOT NULL,
  "legislation" varchar(50) NOT NULL,
  "anexo" varchar(20) NOT NULL,
  "cst_ibs_cbs_id" uuid NOT NULL REFERENCES "cst_ibs_cbs"("id") ON DELETE restrict,
  "classification_ibs_cbs_id" uuid NOT NULL REFERENCES "classification_ibs_cbs"("id") ON DELETE restrict,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "anexos_rt_ncm_anexo_class_unique" ON "anexos_rt" ("products_ncm_id", "legislation", "anexo", "classification_ibs_cbs_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_header_id" uuid NOT NULL REFERENCES "nfe_headers"("id") ON DELETE cascade,
  "products_enterprises_id" uuid NOT NULL REFERENCES "products_enterprises"("id") ON DELETE restrict,
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
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_items_header_nitem_unique" ON "nfe_items" ("nfe_header_id", "n_item");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_taxes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_id" uuid NOT NULL REFERENCES "nfe_items"("id") ON DELETE cascade,
  "v_tot_trib" numeric(15, 2),
  "icms_grupo" varchar(20),
  "icms_orig" "public"."cst_origin",
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
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_taxes_item_unique" ON "nfe_item_taxes" ("nfe_item_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_header_id" uuid NOT NULL REFERENCES "nfe_headers"("id") ON DELETE cascade,
  "payment_type_id" uuid NOT NULL REFERENCES "payment_types"("id") ON DELETE cascade,
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
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfe_payments_header_idx" ON "nfe_payments" ("nfe_header_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_transports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_header_id" uuid NOT NULL REFERENCES "nfe_headers"("id") ON DELETE cascade,
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
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_transports_header_unique" ON "nfe_transports" ("nfe_header_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_transport_trailers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_transport_id" uuid NOT NULL REFERENCES "nfe_transports"("id") ON DELETE cascade,
  "n_seq" smallint NOT NULL,
  "placa" varchar(7) NOT NULL,
  "uf" varchar(2) NOT NULL,
  "rntc" varchar(20),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_transport_trailers_seq_unique" ON "nfe_transport_trailers" ("nfe_transport_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_transport_volumes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_transport_id" uuid NOT NULL REFERENCES "nfe_transports"("id") ON DELETE cascade,
  "n_seq" integer NOT NULL,
  "q_vol" integer,
  "esp" varchar(60),
  "marca" varchar(60),
  "n_vol" varchar(60),
  "peso_l" numeric(15, 3),
  "peso_b" numeric(15, 3),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_transport_volumes_seq_unique" ON "nfe_transport_volumes" ("nfe_transport_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_transport_volume_seals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_transport_volume_id" uuid NOT NULL REFERENCES "nfe_transport_volumes"("id") ON DELETE cascade,
  "n_lacre" varchar(60) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_transport_volume_seals_unique" ON "nfe_transport_volume_seals" ("nfe_transport_volume_id", "n_lacre");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_references" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_header_id" uuid NOT NULL REFERENCES "nfe_headers"("id") ON DELETE cascade,
  "n_seq" integer NOT NULL,
  "ref_type" "public"."nfe_reference_type" NOT NULL,
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
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_references_header_seq_unique" ON "nfe_references" ("nfe_header_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_duplicates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_header_id" uuid NOT NULL REFERENCES "nfe_headers"("id") ON DELETE cascade,
  "n_dup" varchar(60) NOT NULL,
  "d_venc" date NOT NULL,
  "v_dup" numeric(15, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_duplicates_header_ndup_unique" ON "nfe_duplicates" ("nfe_header_id", "n_dup");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_resp_tec" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_header_id" uuid NOT NULL REFERENCES "nfe_headers"("id") ON DELETE cascade,
  "cnpj" varchar(14) NOT NULL,
  "x_contato" varchar(60) NOT NULL,
  "email" varchar(60) NOT NULL,
  "fone" varchar(14) NOT NULL,
  "id_csrt" varchar(2),
  "hash_csrt" varchar(28),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_resp_tec_header_unique" ON "nfe_resp_tec" ("nfe_header_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL REFERENCES "enterprises"("id") ON DELETE restrict,
  "nfe_header_id" uuid REFERENCES "nfe_headers"("id") ON DELETE cascade,
  "event_type" "public"."nfe_event_type" NOT NULL,
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
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfe_events_enterprise_idx" ON "nfe_events" ("enterprise_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_places" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_header_id" uuid NOT NULL REFERENCES "nfe_headers"("id") ON DELETE cascade,
  "place_type" "public"."nfe_place_type" NOT NULL,
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
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_places_header_type_unique" ON "nfe_places" ("nfe_header_id", "place_type");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_exports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_id" uuid NOT NULL REFERENCES "nfe_items"("id") ON DELETE cascade,
  "n_seq" integer NOT NULL,
  "n_draw" varchar(11),
  "n_re" varchar(12),
  "ch_nfe" varchar(44),
  "q_export" numeric(15, 4),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_exports_item_seq_unique" ON "nfe_item_exports" ("nfe_item_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_imports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_id" uuid NOT NULL REFERENCES "nfe_items"("id") ON DELETE cascade,
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
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_imports_item_seq_unique" ON "nfe_item_imports" ("nfe_item_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_import_additions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_import_id" uuid NOT NULL REFERENCES "nfe_item_imports"("id") ON DELETE cascade,
  "n_adicao" integer NOT NULL,
  "n_seq_adic" integer NOT NULL,
  "c_fabricante" varchar(60) NOT NULL,
  "v_desc_di" numeric(15, 2),
  "n_draw" varchar(11),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_import_additions_seq_unique" ON "nfe_item_import_additions" ("nfe_item_import_id", "n_adicao", "n_seq_adic");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_fuels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_id" uuid NOT NULL REFERENCES "nfe_items"("id") ON DELETE cascade,
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
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_fuels_item_unique" ON "nfe_item_fuels" ("nfe_item_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_fuel_nozzles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_fuel_id" uuid NOT NULL REFERENCES "nfe_item_fuels"("id") ON DELETE cascade,
  "n_seq" integer NOT NULL,
  "n_bico" integer NOT NULL,
  "n_bomba" integer,
  "n_tanque" integer NOT NULL,
  "v_enc_ini" numeric(15, 3) NOT NULL,
  "v_enc_fin" numeric(15, 3) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_fuel_nozzles_seq_unique" ON "nfe_item_fuel_nozzles" ("nfe_item_fuel_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_fuel_origins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_fuel_id" uuid NOT NULL REFERENCES "nfe_item_fuels"("id") ON DELETE cascade,
  "n_seq" integer NOT NULL,
  "ind_import" varchar(1) NOT NULL,
  "c_uf_orig" varchar(2) NOT NULL,
  "p_orig" numeric(15, 4) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_fuel_origins_seq_unique" ON "nfe_item_fuel_origins" ("nfe_item_fuel_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_advance_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_header_id" uuid NOT NULL REFERENCES "nfe_headers"("id") ON DELETE cascade,
  "n_seq" integer NOT NULL,
  "ref_nfe" varchar(44) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_advance_payments_header_seq_unique" ON "nfe_advance_payments" ("nfe_header_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_additional_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_header_id" uuid NOT NULL REFERENCES "nfe_headers"("id") ON DELETE cascade,
  "note_type" "public"."nfe_additional_note_type" NOT NULL,
  "n_seq" integer NOT NULL,
  "x_campo" varchar(20) NOT NULL,
  "x_texto" varchar(60) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_additional_notes_header_type_seq_unique" ON "nfe_additional_notes" ("nfe_header_id", "note_type", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_referenced_processes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_header_id" uuid NOT NULL REFERENCES "nfe_headers"("id") ON DELETE cascade,
  "n_seq" integer NOT NULL,
  "n_proc" varchar(60) NOT NULL,
  "ind_proc" varchar(1) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_referenced_processes_header_seq_unique" ON "nfe_referenced_processes" ("nfe_header_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_tracks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_id" uuid NOT NULL REFERENCES "nfe_items"("id") ON DELETE cascade,
  "n_seq" integer NOT NULL,
  "n_lote" varchar(20) NOT NULL,
  "q_lote" numeric(15, 3) NOT NULL,
  "d_fab" date NOT NULL,
  "d_val" date NOT NULL,
  "c_agreg" varchar(20),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_tracks_item_seq_unique" ON "nfe_item_tracks" ("nfe_item_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_medicines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_id" uuid NOT NULL REFERENCES "nfe_items"("id") ON DELETE cascade,
  "n_seq" integer NOT NULL,
  "c_prod_anvisa" varchar(13) NOT NULL,
  "x_motivo_isencao" varchar(255),
  "v_pmc" numeric(15, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_medicines_item_seq_unique" ON "nfe_item_medicines" ("nfe_item_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_weapons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_id" uuid NOT NULL REFERENCES "nfe_items"("id") ON DELETE cascade,
  "n_seq" integer NOT NULL,
  "tp_arma" varchar(1) NOT NULL,
  "n_serie" varchar(15) NOT NULL,
  "n_cano" varchar(15) NOT NULL,
  "descr" varchar(256) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_weapons_item_seq_unique" ON "nfe_item_weapons" ("nfe_item_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_vehicles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_id" uuid NOT NULL REFERENCES "nfe_items"("id") ON DELETE cascade,
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
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_vehicles_item_unique" ON "nfe_item_vehicles" ("nfe_item_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_nves" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_id" uuid NOT NULL REFERENCES "nfe_items"("id") ON DELETE cascade,
  "n_seq" integer NOT NULL,
  "nve" varchar(6) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_nves_item_seq_unique" ON "nfe_item_nves" ("nfe_item_id", "n_seq");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_item_presumed_credits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_item_id" uuid NOT NULL REFERENCES "nfe_items"("id") ON DELETE cascade,
  "n_seq" integer NOT NULL,
  "c_cred_presumido" varchar(10) NOT NULL,
  "p_cred_presumido" numeric(15, 4) NOT NULL,
  "v_cred_presumido" numeric(15, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_item_presumed_credits_item_seq_unique" ON "nfe_item_presumed_credits" ("nfe_item_id", "n_seq");
