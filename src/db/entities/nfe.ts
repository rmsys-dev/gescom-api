import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
  varchar,
  decimal,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { enterprises } from "./enterprises.js";
import {
  nfeCertificateStatusEnum,
  nfeInvoiceStatusEnum,
  nfeIssuanceTypeEnum,
  nfeMovimentsEnum,
} from "../enums.js";
import { bytea, tz, valorDuasCasasDecimais } from "../functions.js";
import { enterprisesMembers } from "./members.js";

/** Parametros globais de NF-e (EAV, sem empresa). */
export const nfeParameters = pgTable(
  "nfe_parameters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parameter: varchar("parameter", { length: 255 }).notNull(),
    value: varchar("value", { length: 500 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("nfe_parameters_parameter_active_unique")
      .on(t.parameter)
      .where(sql`${t.deletedAt} is null`),
  ],
);

/** Configuracao fiscal de NF-e/NFC-e por empresa. */
export const enterprisesNfe = pgTable(
  "enterprises_nfe",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }),
    ambiente: smallint("ambiente").notNull().default(2),
    serieNfe: integer("serie_nfe").notNull().default(1),
    serieNfce: integer("serie_nfce").notNull().default(1),
    idCsc: varchar("id_csc", { length: 6 }),
    cscEncrypted: text("csc_encrypted"),
    tipoEmissao: smallint("tipo_emissao").notNull().default(1),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("enterprises_nfe_enterprise_active_unique")
      .on(t.enterpriseId)
      .where(sql`${t.deletedAt} is null`),
    check("enterprises_nfe_ambiente_chk", sql`${t.ambiente} in (1, 2)`),
    check(
      "enterprises_nfe_serie_nfe_chk",
      sql`${t.serieNfe} >= 0 and ${t.serieNfe} <= 999`,
    ),
    check(
      "enterprises_nfe_serie_nfce_chk",
      sql`${t.serieNfce} >= 0 and ${t.serieNfce} <= 999`,
    ),
    check(
      "enterprises_nfe_tipo_emissao_chk",
      sql`${t.tipoEmissao} in (1, 2, 4, 5, 6, 7, 9)`,
    ),
  ],
);

/** Historico de certificados A1 por empresa. */
export const enterprisesNfeCertificates = pgTable(
  "enterprises_nfe_certificates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }),
    pfx: bytea("pfx").notNull(),
    passwordEncrypted: text("password_encrypted").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    cnpj: varchar("cnpj", { length: 14 }),
    subject: varchar("subject", { length: 500 }),
    validFrom: tz("valid_from").notNull(),
    validUntil: tz("valid_until").notNull(),
    status: nfeCertificateStatusEnum("status").default("ATIVO").notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("enterprises_nfe_certificates_active_unique")
      .on(t.enterpriseId)
      .where(sql`${t.deletedAt} is null and ${t.status} = 'ATIVO'`),
    index("enterprises_nfe_certificates_enterprise_idx").on(t.enterpriseId),
  ],
);

export const nfeInvoices = pgTable( // Tabela de notas fiscais
  "nfe_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id") // id da empresa
      .references(() => enterprises.id, { onDelete: "restrict" })
      .notNull(),
    issuanceType: nfeIssuanceTypeEnum("issuance_type").default("PROPRIA").notNull(), // tipo de emissão da nota fiscal ( própria ou de terceiro )
    moviments: nfeMovimentsEnum("moviments").default("SAIDA").notNull(), // movimento da nota fiscal ( entrada ou saída )
    status: nfeInvoiceStatusEnum("status").default("RASCUNHO").notNull(), // situação da nota perante a emissão e a SEFAZ
    chave: varchar("chave", { length: 44 }).notNull(), // chave da nota fiscal
    cUf: varchar("c_uf", { length: 2 }).notNull(), // código IBGE da UF do emitente
    cNf: varchar("c_nf", { length: 8 }).notNull(), // código numérico que compõe a chave
    versao: varchar("versao", { length: 10 }), // versão da nota fiscal
    natOp: varchar("nat_op", { length: 60 }), // natureza da operação
    mod: varchar("mod", { length: 2 }).notNull(), // modelo: 55 NF-e ou 65 NFC-e
    serie: integer("serie").notNull(), // série da nota fiscal
    nNf: integer("n_nf").notNull(), // número da nota fiscal
    entryDate: tz("entry_date"), // data de entrada da nota fiscal (entrada de terceiro)
    dhEmi: tz("dh_emi").notNull(), // data de emissão da nota fiscal
    dhSaiEnt: tz("dh_sai_ent"), // data de saída da nota fiscal
    tpNf: varchar("tp_nf", { length: 1 }), // tipo de nota fiscal
    idDest: varchar("id_dest", { length: 1 }), // identificador do destinatário
    cMunFg: varchar("c_mun_fg", { length: 7 }), // código do município do fato gerador ( IBGE )
    cMunFgIbs: varchar("c_mun_fg_ibs", { length: 7 }), // código do município do fato gerador do IBS
    tpImp: varchar("tp_imp", { length: 1 }), // tipo de impressão da nota fiscal
    tpEmis: smallint("tp_emis").notNull(), // tipo de emissão da nota fiscal
    cDv: varchar("c_dv", { length: 1 }), // dígito verificador da nota fiscal
    tpAmb: smallint("tp_amb").notNull(), // tipo de ambiente da nota fiscal
    finNfe: varchar("fin_nfe", { length: 1 }), // finalidade da nota fiscal
    tpNfDebito: varchar("tp_nf_debito", { length: 2 }), // tipo de nota fiscal de débito
    tpNfCredito: varchar("tp_nf_credito", { length: 2 }), // tipo de nota fiscal de crédito
    indFinal: varchar("ind_final", { length: 1 }), // indicador de operação com consumidor final
    indPres: varchar("ind_pres", { length: 1 }), // indicador de presença do destinatário
    indIntermed: varchar("ind_intermed", { length: 1 }), // indicador de intermediário da nota fiscal
    procEmi: varchar("proc_emi", { length: 1 }), // processo de emissão da nota fiscal
    verProc: varchar("ver_proc", { length: 20 }), // versão do processo de emissão da nota fiscal
    dhCont: tz("dh_cont"), // data e hora da contingencia da nota fiscal
    xJust: varchar("x_just", { length: 256 }), // justificativa da contingencia da nota fiscal
    cStat: varchar("c_stat", { length: 3 }), // código de status devolvido pela SEFAZ
    xMotivo: varchar("x_motivo", { length: 255 }), // motivo devolvido pela SEFAZ
    nProt: varchar("n_prot", { length: 15 }), // número do protocolo de autorização
    dhRecbto: tz("dh_recbto"), // data e hora do recebimento pela SEFAZ
    digVal: varchar("dig_val", { length: 28 }), // digest value da assinatura
    xmlAutorizado: text("xml_autorizado"), // XML autorizado
    emitMemberId: uuid("emit_member_id") // id do membro emitente (fornecedor na entrada de terceiro)
      .references(() => enterprisesMembers.id, { onDelete: "restrict" }),
    emitCnpj: varchar("emit_cnpj", { length: 14 }), // CNPJ do emitente
    emitCpf: varchar("emit_cpf", { length: 11 }), // CPF do emitente
    emitXNome: varchar("emit_x_nome", { length: 60 }), // Nome do emitente
    emitXFant: varchar("emit_x_fant", { length: 60 }), // Nome fantasia do emitente
    emitIe: varchar("emit_ie", { length: 14 }), // IE do emitente
    emitIest: varchar("emit_iest", { length: 14 }), // IE do emitente substituto tributário
    emitIm: varchar("emit_im", { length: 15 }), // Inscrição Municipal do emitente
    emitCnae: varchar("emit_cnae", { length: 7 }), // CNAE do emitente
    emitCrt: varchar("emit_crt", { length: 1 }), // Código de Regime Tributário do emitente
    emitXlgr: varchar("emit_xlgr", { length: 60 }), // Logradouro do emitente
    emitNro: varchar("emit_nro", { length: 60 }), // Número do emitente
    emitXcpl: varchar("emit_xcpl", { length: 60 }), // Complemento do emitente
    emitXbairro: varchar("emit_xbairro", { length: 60 }), // Bairro do emitente
    emitCmun: varchar("emit_cmun", { length: 7 }), // Código do município do emitente ( IBGE )
    emitXmun: varchar("emit_xmun", { length: 60 }), // Nome do município do emitente
    emitUf: varchar("emit_uf", { length: 2 }), // UF do emitente
    emitCep: varchar("emit_cep", { length: 8 }), // CEP do emitente
    emitCpais: varchar("emit_cpais", { length: 4 }), // Código do país do emitente
    emitXpais: varchar("emit_xpais", { length: 60 }), // Nome do país do emitente
    emitFone: varchar("emit_fone", { length: 14 }), // Telefone do emitente
    destMemberId: uuid("dest_member_id") // id do membro destinatário
      .references(() => enterprisesMembers.id, { onDelete: "restrict" }),
    destCnpj: varchar("dest_cnpj", { length: 14 }), // CNPJ do membro destinatário
    destCpf: varchar("dest_cpf", { length: 11 }), // CPF do membro destinatário
    destIdEstrangeiro: varchar("dest_id_estrangeiro", { length: 20 }), // ID estrangeiro do membro destinatário
    destXNome: varchar("dest_x_nome", { length: 60 }), // Nome do membro destinatário
    destIndIeDest: varchar("dest_ind_ie_dest", { length: 1 }), // Indicador de IE do destinatário
    destIe: varchar("dest_ie", { length: 14 }), // IE do membro destinatário
    destIsuf: varchar("dest_isuf", { length: 9 }), // ISUF do membro destinatário
    destIm: varchar("dest_im", { length: 15 }), // IM do membro destinatário
    destEmail: varchar("dest_email", { length: 60 }), // Email do membro destinatário
    destXlgr: varchar("dest_xlgr", { length: 60 }), // Logradouro do destinatário
    destNro: varchar("dest_nro", { length: 60 }), // Número do membro destinatário
    destXcpl: varchar("dest_xcpl", { length: 60 }), // Complemento do membro destinatário
    destXbairro: varchar("dest_xbairro", { length: 60 }), // Bairro do membro destinatário
    destCmun: varchar("dest_cmun", { length: 7 }), // Código do município do membro destinatário ( IBGE )
    destXmun: varchar("dest_xmun", { length: 60 }), // Nome do município do membro destinatário
    destUf: varchar("dest_uf", { length: 2 }), // UF do membro destinatário
    destCep: varchar("dest_cep", { length: 8 }), // CEP do membro destinatário
    destCpais: varchar("dest_cpais", { length: 4 }), // Código do país do membro destinatário
    destXpais: varchar("dest_xpais", { length: 60 }), // Nome do país do membro destinatário
    destFone: varchar("dest_fone", { length: 14 }), // Telefone do membro destinatário
    infAdFisco: varchar("inf_ad_fisco", { length: 2000 }), // informações adicionais do fisco
    infCpl: varchar("inf_cpl", { length: 5000 }), // informações complementares
    qrCode: text("qr_code"), // código QR da nota fiscal
    urlChave: varchar("url_chave", { length: 85 }), // URL da chave da nota fiscal  
    vBc: decimal("v_bc", valorDuasCasasDecimais), // valor base de cálculo
    vIcms: decimal("v_icms", valorDuasCasasDecimais), // valor do ICMS
    vIcmsDeson: decimal("v_icms_deson", valorDuasCasasDecimais), // valor do ICMS desonerado
    vFcpUfDest: decimal("v_fcp_uf_dest", valorDuasCasasDecimais), // valor do FCPUF do destinatário
    vIcmsUfDest: decimal("v_icms_uf_dest", valorDuasCasasDecimais), // valor do ICMSUF do destinatário
    vIcmsUfRemet: decimal("v_icms_uf_remet", valorDuasCasasDecimais), // valor do ICMSUF do remetente
    vFcp: decimal("v_fcp", valorDuasCasasDecimais), // valor do FCP
    vBcSt: decimal("v_bc_st", valorDuasCasasDecimais), // valor base de cálculo do ICMS ST
    vSt: decimal("v_st", valorDuasCasasDecimais), // valor do ICMS ST
    vFcpSt: decimal("v_fcp_st", valorDuasCasasDecimais), // valor do FCP ST
    vFcpStRet: decimal("v_fcp_st_ret", valorDuasCasasDecimais), // valor do FCP ST retido
    vProd: decimal("v_prod", valorDuasCasasDecimais), // valor do produto
    vFrete: decimal("v_frete", valorDuasCasasDecimais), // valor do frete
    vSeg: decimal("v_seg", valorDuasCasasDecimais), // valor do seguro
    vDesc: decimal("v_desc", valorDuasCasasDecimais), // valor do desconto
    vIi: decimal("v_ii", valorDuasCasasDecimais), // valor do II
    vIpi: decimal("v_ipi", valorDuasCasasDecimais), // valor do IPI
    vIpiDevol: decimal("v_ipi_devol", valorDuasCasasDecimais), // valor do IPI devolvido
    vPis: decimal("v_pis", valorDuasCasasDecimais), // valor do PIS
    vCofins: decimal("v_cofins", valorDuasCasasDecimais), // valor do COFINS
    vOutro: decimal("v_outro", valorDuasCasasDecimais), // valor do outro
    vNf: decimal("v_nf", valorDuasCasasDecimais), // valor da nota fiscal    
    vTotTrib: decimal("v_tot_trib", valorDuasCasasDecimais), // valor total do tributo
    issqnVServ: decimal("issqn_v_serv", valorDuasCasasDecimais), // valor do serviço do ISSQN
    issqnVBc: decimal("issqn_v_bc", valorDuasCasasDecimais), // valor base de cálculo do ISSQN
    issqnVIss: decimal("issqn_v_iss", valorDuasCasasDecimais), // valor do ISSQN
    issqnVPis: decimal("issqn_v_pis", valorDuasCasasDecimais), // valor do PIS do ISSQN
    issqnVCofins: decimal("issqn_v_cofins", valorDuasCasasDecimais), // valor do COFINS do ISSQN
    issqnDCompet: date("issqn_d_compet", { mode: "date" }), // data de competência do ISSQN
    issqnVDeducao: decimal("issqn_v_deducao", valorDuasCasasDecimais), // valor da dedução do ISSQN
    issqnVOutro: decimal("issqn_v_outro", valorDuasCasasDecimais), // valor do outro do ISSQN
    issqnVDescIncond: decimal("issqn_v_desc_incond", valorDuasCasasDecimais), // valor do desconto incondicional do ISSQN
    issqnVDescCond: decimal("issqn_v_desc_cond", valorDuasCasasDecimais), // valor do desconto condicional do ISSQN
    issqnVIssRet: decimal("issqn_v_iss_ret", valorDuasCasasDecimais), // valor do ISSQN retido
    issqnCRegTrib: varchar("issqn_c_reg_trib", { length: 2 }), // código de regime tributário do ISSQN
    vRetPis: decimal("v_ret_pis", valorDuasCasasDecimais), // valor do PIS retido
    vRetCofins: decimal("v_ret_cofins", valorDuasCasasDecimais), // valor do COFINS retido
    vRetCsll: decimal("v_ret_csll", valorDuasCasasDecimais), // valor do CSLL retido
    vBcIrrf: decimal("v_bc_irrf", valorDuasCasasDecimais), // valor base de cálculo do IRRF
    vIrrf: decimal("v_irrf", valorDuasCasasDecimais), // valor do IRRF
    vBcRetPrev: decimal("v_bc_ret_prev", valorDuasCasasDecimais), // valor base de cálculo do PREV
    vRetPrev: decimal("v_ret_prev", valorDuasCasasDecimais), // valor do PREV retido
    vIs: decimal("v_is", valorDuasCasasDecimais), // valor do IS
    vBcIbsCbs: decimal("v_bc_ibs_cbs", valorDuasCasasDecimais), // valor base de cálculo do IBS CBS
    vIbsUf: decimal("v_ibs_uf", valorDuasCasasDecimais), // valor do IBSUF
    vIbsMun: decimal("v_ibs_mun", valorDuasCasasDecimais), // valor do IBSMUN
    vIbs: decimal("v_ibs", valorDuasCasasDecimais), // valor do IBS
    vCbs: decimal("v_cbs", valorDuasCasasDecimais), // valor do CBS
    vNfTot: decimal("v_nf_tot", valorDuasCasasDecimais),  // valor da nota fiscal, considerando os tributos da reforma tributaria. 
    nFat: varchar("n_fat", { length: 60 }), // número da fatura
    vOrig: decimal("v_orig", valorDuasCasasDecimais), // valor original da nota fiscal
    cobrVDesc: decimal("cobr_v_desc", valorDuasCasasDecimais), // valor do desconto da cobrança
    vLiq: decimal("v_liq", valorDuasCasasDecimais), // valor líquido da nota fiscal
    vTroco: decimal("v_troco", valorDuasCasasDecimais), // valor do troco
    autXML: jsonb("aut_xml"), // autorizacao de baixa de xml ( para uso futuro )
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("nfe_invoices_enterprise_chave_active_unique")
      .on(t.enterpriseId, t.chave)
      .where(sql`${t.deletedAt} is null`),
    index("nfe_invoices_dh_emi_idx").on(t.dhEmi),
    index("nfe_invoices_emit_member_idx").on(t.emitMemberId),
    index("nfe_invoices_dest_member_idx").on(t.destMemberId),
    check("nfe_invoices_chave_chk", sql`${t.chave} ~ '^[0-9]{44}$'`),
    check("nfe_invoices_c_nf_chk", sql`${t.cNf} ~ '^[0-9]{8}$'`),
    check(
      "nfe_invoices_c_uf_chk",
      sql`${t.cUf} in ('11','12','13','14','15','16','17','21','22','23','24','25','26','27','28','29','31','32','33','35','41','42','43','50','51','52','53')`,
    ),
    check("nfe_invoices_mod_chk", sql`${t.mod} in ('55', '65')`),
    check("nfe_invoices_serie_chk", sql`${t.serie} >= 0 and ${t.serie} <= 999`),
    check(
      "nfe_invoices_n_nf_chk",
      sql`${t.nNf} >= 1 and ${t.nNf} <= 999999999`,
    ),
    check("nfe_invoices_tp_amb_chk", sql`${t.tpAmb} in (1, 2)`),
    check(
      "nfe_invoices_tp_emis_chk",
      sql`${t.tpEmis} in (1, 2, 4, 5, 6, 7, 9)`,
    ),
  ],
);

