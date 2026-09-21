DO $$ BEGIN
  CREATE TYPE "public"."nfe_issuance_type" AS ENUM ('PROPRIA', 'TERCEIRO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."nfe_moviments" AS ENUM ('ENTRADA', 'SAIDA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."nfe_invoice_status" AS ENUM (
    'RASCUNHO',
    'ASSINADA',
    'AUTORIZADA',
    'REJEITADA',
    'CANCELADA',
    'DENEGADA'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "nfe_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprise_id" uuid NOT NULL,
  "issuance_type" "public"."nfe_issuance_type" DEFAULT 'PROPRIA' NOT NULL,
  "moviments" "public"."nfe_moviments" DEFAULT 'SAIDA' NOT NULL,
  "status" "public"."nfe_invoice_status" DEFAULT 'RASCUNHO' NOT NULL,
  "chave" varchar(44) NOT NULL,
  "c_uf" varchar(2) NOT NULL,
  "c_nf" varchar(8) NOT NULL,
  "versao" varchar(10),
  "nat_op" varchar(60),
  "mod" varchar(2) NOT NULL,
  "serie" integer NOT NULL,
  "n_nf" integer NOT NULL,
  "entry_date" timestamp with time zone,
  "dh_emi" timestamp with time zone NOT NULL,
  "dh_sai_ent" timestamp with time zone,
  "tp_nf" varchar(1),
  "id_dest" varchar(1),
  "c_mun_fg" varchar(7),
  "c_mun_fg_ibs" varchar(7),
  "tp_imp" varchar(1),
  "tp_emis" smallint NOT NULL,
  "c_dv" varchar(1),
  "tp_amb" smallint NOT NULL,
  "fin_nfe" varchar(1),
  "tp_nf_debito" varchar(2),
  "tp_nf_credito" varchar(2),
  "ind_final" varchar(1),
  "ind_pres" varchar(1),
  "ind_intermed" varchar(1),
  "proc_emi" varchar(1),
  "ver_proc" varchar(20),
  "dh_cont" timestamp with time zone,
  "x_just" varchar(256),
  "c_stat" varchar(3),
  "x_motivo" varchar(255),
  "n_prot" varchar(15),
  "dh_recbto" timestamp with time zone,
  "dig_val" varchar(28),
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
  CONSTRAINT "nfe_invoices_chave_chk" CHECK ("chave" ~ '^[0-9]{44}$'),
  CONSTRAINT "nfe_invoices_c_nf_chk" CHECK ("c_nf" ~ '^[0-9]{8}$'),
  CONSTRAINT "nfe_invoices_c_uf_chk" CHECK ("c_uf" in ('11','12','13','14','15','16','17','21','22','23','24','25','26','27','28','29','31','32','33','35','41','42','43','50','51','52','53')),
  CONSTRAINT "nfe_invoices_mod_chk" CHECK ("mod" in ('55', '65')),
  CONSTRAINT "nfe_invoices_serie_chk" CHECK ("serie" >= 0 and "serie" <= 999),
  CONSTRAINT "nfe_invoices_n_nf_chk" CHECK ("n_nf" >= 1 and "n_nf" <= 999999999),
  CONSTRAINT "nfe_invoices_tp_amb_chk" CHECK ("tp_amb" in (1, 2)),
  CONSTRAINT "nfe_invoices_tp_emis_chk" CHECK ("tp_emis" in (1, 2, 4, 5, 6, 7, 9))
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "nfe_invoices"
    ADD CONSTRAINT "nfe_invoices_enterprise_id_enterprises_id_fk"
    FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "nfe_invoices"
    ADD CONSTRAINT "nfe_invoices_emit_member_id_enterprises_members_id_fk"
    FOREIGN KEY ("emit_member_id") REFERENCES "public"."enterprises_members"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "nfe_invoices"
    ADD CONSTRAINT "nfe_invoices_dest_member_id_enterprises_members_id_fk"
    FOREIGN KEY ("dest_member_id") REFERENCES "public"."enterprises_members"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "nfe_invoices_enterprise_chave_active_unique"
  ON "nfe_invoices" USING btree ("enterprise_id", "chave")
  WHERE "nfe_invoices"."deleted_at" is null;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "nfe_invoices_dh_emi_idx"
  ON "nfe_invoices" USING btree ("dh_emi");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "nfe_invoices_emit_member_idx"
  ON "nfe_invoices" USING btree ("emit_member_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "nfe_invoices_dest_member_idx"
  ON "nfe_invoices" USING btree ("dest_member_id");
