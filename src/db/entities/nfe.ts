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
  boolean,
} from "drizzle-orm/pg-core";
import {
  cfopMovimentTypeEnum,
  cstOriginEnum,
  nfeAdditionalNoteTypeEnum,
  nfeCertificateStatusEnum,
  nfeEventTypeEnum,
  nfeInvoiceStatusEnum,
  nfePlaceTypeEnum,
  nfeReferenceTypeEnum,
  regimeTributarioEnum,
  nfeIssuanceTypeEnum,
  nfeMovimentsEnum,
  taxationTypeEnum,
} from "../enums.js";
import { bytea, tz, valorDuasCasasDecimais, valorQuatroCasasDecimais, percentageDecimal } from "../functions.js";
import { enterprises } from "./enterprises.js";
import { enterprisesMembers, typeSupplierCustomers } from "./members.js";
import { icmsTaxation, products, productsEnterprises } from "./products.js";
import { productsNcm } from "./products.js";
import { paymentTypes, paymentTypesMethodsFlags, sales } from "./sales.js";
import { states } from "./addresses.js";

// TABELA DE PARÂMETROS GLOBAIS DA NF-E.
export const nfeParameters = pgTable(
  "nfe_parameters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parameter: varchar("parameter", { length: 255 }).notNull(), // parâmetro da NF-e
    value: varchar("value", { length: 500 }).notNull(), // valor do parâmetro da NF-e
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

// TABELA DE CONFIGURAÇÃO FISCAL DE NF-E/NFC-E POR EMPRESA.
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
    respTecCnpj: varchar("resp_tec_cnpj", { length: 14 }),
    respTecContato: varchar("resp_tec_contato", { length: 60 }),
    respTecEmail: varchar("resp_tec_email", { length: 60 }),
    respTecFone: varchar("resp_tec_fone", { length: 14 }),
    respTecIdCsrt: varchar("resp_tec_id_csrt", { length: 2 }),
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

// TABELA DE CERTIFICADOS A1 POR EMPRESA.
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


// TABELA DE NOTAS FISCAIS ( CABEÇALHO )
export const nfeHeaders = pgTable( // Tabela de notas fiscais ( cabeçalho )
  "nfe_headers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id") // id da empresa
      .references(() => enterprises.id, { onDelete: "restrict" })
      .notNull(),
    issuanceType: nfeIssuanceTypeEnum("issuance_type").default("PROPRIA").notNull(), // tipo de emissão da nota fiscal ( própria ou de terceiro )
    moviments: nfeMovimentsEnum("moviments").default("SAIDA").notNull(), // movimento da nota fiscal ( entrada ou saída )
    status: nfeInvoiceStatusEnum("status").default("PENDENTE").notNull(), // situação da nota perante a emissão e a SEFAZ
    chave: varchar("chave", { length: 44 }).notNull(), // chave da nota fiscal
    cUf: varchar("c_uf", { length: 2 }).notNull(), // código IBGE da UF do emitente
    cNf: varchar("c_nf", { length: 8 }).notNull(), // código numérico que compõe a chave
    versao: varchar("versao", { length: 10 }), // versão da nota fiscal
    natOp: varchar("nat_op", { length: 60 }), // natureza da operação
    mod: varchar("mod", { length: 2 }) // modelo: 55 NF-e ou 65 NFC-e
      .notNull()
      .references(() => fiscalDocumentModels.code, { onDelete: "restrict" }),
    serie: varchar("serie", { length: 3 }).notNull(), // série da nota fiscal
    nNf: integer("n_nf").notNull(), // número da nota fiscal
    entryDate: tz("entry_date"), // data de entrada da nota fiscal (entrada de terceiro)
    dhEmi: tz("dh_emi").notNull(), // data de emissão da nota fiscal
    dhSaiEnt: tz("dh_sai_ent"), // data de saída da nota fiscal
    tpNf: varchar("tp_nf", { length: 1 }), // tipo de nota fiscal
    idDest: varchar("id_dest", { length: 1 }), // identificador do destinatário    
    cMunFg: integer("c_mun_fg").notNull(), // código do município do fato gerador ( IBGE )
    cMunFgIbs: integer("c_mun_fg_ibs"), // código do município do fato gerador do IBS
    tpImp: varchar("tp_imp", { length: 1 }), // tipo de impressão da nota fiscal
    tpEmis: smallint("tp_emis").notNull(), // tipo de emissão da nota fiscal
    cDv: varchar("c_dv", { length: 1 }), // dígito verificador da nota fiscal
    tpAmb: smallint("tp_amb").notNull(), // tipo de ambiente da nota fiscal
    finNfe: varchar("fin_nfe", { length: 1 }), // finalidade da nota fiscal
    tpNfDebito: varchar("tp_nf_debito", { length: 2 }), // tipo de nota fiscal de débito
    tpNfCredito: varchar("tp_nf_credito", { length: 2 }), // tipo de nota fiscal de crédito
    tpEnteGov: varchar("tp_ente_gov", { length: 1 }), // tipo de ente governamental
    pRedutor: decimal("p_redutor", valorQuatroCasasDecimais), // percentual redutor da compra governamental
    tpOperGov: varchar("tp_oper_gov", { length: 1 }), // tipo de operação com governo
    indFinal: varchar("ind_final", { length: 1 }), // indicador de operação com consumidor final
    indPres: varchar("ind_pres", { length: 1 }), // indicador de presença do destinatário
    indIntermed: varchar("ind_intermed", { length: 1 }), // indicador de intermediário da nota fiscal
    intermedCnpj: varchar("intermed_cnpj", { length: 14 }), // CNPJ do intermediador
    intermedIdCadIntTran: varchar("intermed_id_cad_int_tran", { length: 60 }), // identificador do intermediador
    procEmi: varchar("proc_emi", { length: 1 }), // processo de emissão da nota fiscal
    verProc: varchar("ver_proc", { length: 20 }), // versão do processo de emissão da nota fiscal
    dhCont: tz("dh_cont"), // data e hora da contingencia da nota fiscal
    xJust: varchar("x_just", { length: 256 }), // justificativa da contingencia da nota fiscal
    cStat: varchar("c_stat", { length: 3 }), // código de status devolvido pela SEFAZ
    xMotivo: varchar("x_motivo", { length: 255 }), // motivo devolvido pela SEFAZ
    nProt: varchar("n_prot", { length: 15 }), // número do protocolo de autorização
    dhRecbto: tz("dh_recbto"), // data e hora do recebimento pela SEFAZ
    digVal: varchar("dig_val", { length: 28 }), // digest value da assinatura
    xmlArquivo: varchar("xml_arquivo", { length: 512 }), // caminho relativo do XML assinado
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
    exportaUfSaidaPais: varchar("exporta_uf_saida_pais", { length: 2 }), // UF de embarque da exportação
    exportaXLocExporta: varchar("exporta_x_loc_exporta", { length: 60 }), // local de embarque
    exportaXLocDespacho: varchar("exporta_x_loc_despacho", { length: 60 }), // local de despacho
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
    vIcmsMono: decimal("v_icms_mono", valorDuasCasasDecimais), // ICMS monofásico próprio
    vIcmsMonoReten: decimal("v_icms_mono_reten", valorDuasCasasDecimais), // ICMS monofásico com retenção
    vIcmsMonoRet: decimal("v_icms_mono_ret", valorDuasCasasDecimais), // ICMS monofásico retido anteriormente
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
    vDifIbsUf: decimal("v_dif_ibs_uf", valorDuasCasasDecimais), // diferimento do IBS da UF
    vDevTribIbsUf: decimal("v_dev_trib_ibs_uf", valorDuasCasasDecimais), // devolução de tributo do IBS da UF
    vDifIbsMun: decimal("v_dif_ibs_mun", valorDuasCasasDecimais), // diferimento do IBS do município
    vDevTribIbsMun: decimal("v_dev_trib_ibs_mun", valorDuasCasasDecimais), // devolução de tributo do IBS do município
    vCredPresIbs: decimal("v_cred_pres_ibs", valorDuasCasasDecimais), // crédito presumido de IBS
    vCredPresCondSusIbs: decimal("v_cred_pres_cond_sus_ibs", valorDuasCasasDecimais), // crédito presumido de IBS em condição suspensiva
    vDifCbs: decimal("v_dif_cbs", valorDuasCasasDecimais), // diferimento da CBS
    vDevTribCbs: decimal("v_dev_trib_cbs", valorDuasCasasDecimais), // devolução de tributo da CBS
    vCredPresCbs: decimal("v_cred_pres_cbs", valorDuasCasasDecimais), // crédito presumido de CBS
    vCredPresCondSusCbs: decimal("v_cred_pres_cond_sus_cbs", valorDuasCasasDecimais), // crédito presumido de CBS em condição suspensiva
    vIbsMono: decimal("v_ibs_mono", valorDuasCasasDecimais), // IBS monofásico
    vCbsMono: decimal("v_cbs_mono", valorDuasCasasDecimais), // CBS monofásica
    vIbsMonoReten: decimal("v_ibs_mono_reten", valorDuasCasasDecimais), // IBS monofásico com retenção
    vCbsMonoReten: decimal("v_cbs_mono_reten", valorDuasCasasDecimais), // CBS monofásica com retenção
    vIbsMonoRet: decimal("v_ibs_mono_ret", valorDuasCasasDecimais), // IBS monofásico retido anteriormente
    vCbsMonoRet: decimal("v_cbs_mono_ret", valorDuasCasasDecimais), // CBS monofásica retida anteriormente
    vIbsEstCred: decimal("v_ibs_est_cred", valorDuasCasasDecimais), // estorno de crédito de IBS
    vCbsEstCred: decimal("v_cbs_est_cred", valorDuasCasasDecimais), // estorno de crédito de CBS
    vNfTot: decimal("v_nf_tot", valorDuasCasasDecimais),  // valor da nota fiscal, considerando os tributos da reforma tributaria.    
    nFat: varchar("n_fat", { length: 60 }), // número da fatura
    vOrig: decimal("v_orig", valorDuasCasasDecimais), // valor original da nota fiscal
    cobrVDesc: decimal("cobr_v_desc", valorDuasCasasDecimais), // valor do desconto da cobrança
    vLiq: decimal("v_liq", valorDuasCasasDecimais), // valor líquido da nota fiscal
    vTroco: decimal("v_troco", valorDuasCasasDecimais), // valor do troco
    autXML: jsonb("aut_xml"), // autorizacao de baixa de xml ( para uso futuro )
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação da nota fiscal
    updatedAt: tz("updated_at"), // data de atualização da nota fiscal
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("nfe_headers_enterprise_chave_active_unique")
      .on(t.enterpriseId, t.chave)
      .where(sql`${t.deletedAt} is null`),
    index("nfe_headers_dh_emi_idx").on(t.dhEmi),
    index("nfe_headers_emit_member_idx").on(t.emitMemberId),
    index("nfe_headers_dest_member_idx").on(t.destMemberId),
    check("nfe_headers_chave_chk", sql`${t.chave} ~ '^[0-9]{44}$'`),
    check("nfe_headers_c_nf_chk", sql`${t.cNf} ~ '^[0-9]{8}$'`),
    check(
      "nfe_headers_c_uf_chk",
      sql`${t.cUf} in ('11','12','13','14','15','16','17','21','22','23','24','25','26','27','28','29','31','32','33','35','41','42','43','50','51','52','53')`,
    ),
    check("nfe_headers_mod_chk", sql`${t.mod} in ('55', '65')`),
    check("nfe_headers_serie_chk", sql`${t.serie} ~ '^[0-9]{1,3}$'`),
    check(
      "nfe_headers_n_nf_chk",
      sql`${t.nNf} >= 1 and ${t.nNf} <= 999999999`,
    ),
    check("nfe_headers_tp_amb_chk", sql`${t.tpAmb} in (1, 2)`),
    check(
      "nfe_headers_tp_emis_chk",
      sql`${t.tpEmis} in (1, 2, 4, 5, 6, 7, 9)`,
    ),
    check(
      "nfe_headers_intermed_chk",
      sql`(${t.intermedCnpj} is null and ${t.intermedIdCadIntTran} is null) or (${t.intermedCnpj} is not null and ${t.intermedIdCadIntTran} is not null)`,
    ),
    check(
      "nfe_headers_exporta_chk",
      sql`(${t.exportaUfSaidaPais} is null and ${t.exportaXLocExporta} is null) or (${t.exportaUfSaidaPais} is not null and ${t.exportaXLocExporta} is not null)`,
    ),
    check(
      "nfe_headers_exporta_uf_chk",
      sql`${t.exportaUfSaidaPais} is null or ${t.exportaUfSaidaPais} in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')`,
    ),
    check(
      "nfe_headers_compra_gov_chk",
      sql`(${t.tpEnteGov} is null and ${t.pRedutor} is null and ${t.tpOperGov} is null) or (${t.tpEnteGov} is not null and ${t.pRedutor} is not null and ${t.tpOperGov} is not null)`,
    ),
    check(
      "nfe_headers_tp_ente_gov_chk",
      sql`${t.tpEnteGov} is null or ${t.tpEnteGov} in ('1', '2', '3', '4')`,
    ),
    check(
      "nfe_headers_tp_oper_gov_chk",
      sql`${t.tpOperGov} is null or ${t.tpOperGov} in ('1', '2')`,
    ),
  ],
);

// TABELA DE PEDIDOS DE VENDA QUE ORIGINARAM A NF-e. UM PEDIDO ATIVO SÓ ENTRA EM UMA NF-e.
export const nfeSales = pgTable(
  "nfe_sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeHeaderId: uuid("nfe_header_id")
      .notNull()
      .references(() => nfeHeaders.id, { onDelete: "restrict" }),
    salesId: uuid("sales_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("nfe_sales_sale_active_unique")
      .on(t.salesId)
      .where(sql`${t.deletedAt} is null`),
    index("nfe_sales_header_idx").on(t.nfeHeaderId),
  ],
);

// TABELA DE ITENS DA NF-e
export const nfeItems = pgTable(
  "nfe_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeHeaderId: uuid("nfe_header_id") // id da nota fiscal ( cabeçalho )
      .notNull()
      .references(() => nfeHeaders.id, { onDelete: "cascade" }),    
    productsEnterprisesId: uuid("products_enterprises_id") // id do produto da empresa
      .notNull()
      .references(() => productsEnterprises.id, { onDelete: "restrict" }),        
    nItem: integer("n_item").notNull(), // número do item
    cProd: varchar("c_prod", { length: 60 }), // código do produto
    cEan: varchar("c_ean", { length: 14 }), // código EAN do produto
    cBarra: varchar("c_barra", { length: 30 }), // código de barras do produto
    xProd: varchar("x_prod", { length: 120 }).notNull(), // descrição do produto
    ncm: varchar("ncm", { length: 8 }), // código NCM do produto
    cest: varchar("cest", { length: 7 }), // código CEST do produto
    indEscala: varchar("ind_escala", { length: 1 }), // indicador de escala do produto
    cnpjFab: varchar("cnpj_fab", { length: 14 }), // CNPJ do fabricante do produto
    cBenef: varchar("c_benef", { length: 10 }), // código do benefício do produto
    extipi: varchar("extipi", { length: 3 }), // código EXTIPI do produto
    cfop: varchar("cfop", { length: 4 }), // código fiscal de operação e prestação do produto
    uCom: varchar("u_com", { length: 6 }), // unidade de medida do produto
    qCom: decimal("q_com", valorQuatroCasasDecimais), // quantidade do produto
    vUnCom: decimal("v_un_com", { precision: 21, scale: 10 }), // valor unitário do produto
    vProd: decimal("v_prod", valorDuasCasasDecimais), // valor do produto
    cEanTrib: varchar("c_ean_trib", { length: 14 }), // código EAN tributável do produto 
    cBarraTrib: varchar("c_barra_trib", { length: 30 }), // código de barras do produto tributado
    uTrib: varchar("u_trib", { length: 6 }), // unidade de medida do produto 
    qTrib: decimal("q_trib", valorQuatroCasasDecimais), // quantidade do produto tributado
    vUnTrib: decimal("v_un_trib", { precision: 21, scale: 10 }), // valor unitário do produto tributado
    vFrete: decimal("v_frete", valorDuasCasasDecimais), // valor do frete do produto
    vSeg: decimal("v_seg", valorDuasCasasDecimais), // valor do seguro do produto
    vDesc: decimal("v_desc", valorDuasCasasDecimais), // valor do desconto do produto
    vOutro: decimal("v_outro", valorDuasCasasDecimais), // valor do outro do produto  
    indTot: varchar("ind_tot", { length: 1 }), // indicador de totalização do produto
    xPed: varchar("x_ped", { length: 15 }), // descrição do pedido do produto
    nItemPed: varchar("n_item_ped", { length: 6 }), // número do item do pedido do produto
    nFci: varchar("n_fci", { length: 36 }), // número do FCI do produto
    infAdProd: varchar("inf_ad_prod", { length: 500 }), // informações adicionais do produto
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação do produto
    updatedAt: tz("updated_at"), // data de atualização do produto
  },
  (t) => [
    uniqueIndex("nfe_items_header_nitem_unique").on(t.nfeHeaderId, t.nItem),
    index("nfe_items_product_idx").on(t.productsEnterprisesId),
    check("nfe_items_n_item_chk", sql`${t.nItem} >= 1 and ${t.nItem} <= 999999999`),    
  ],
);

// TABELA DE IMPOSTOS DO ITEM DA NF-e
export const nfeItemTaxes = pgTable(
  "nfe_item_taxes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemId: uuid("nfe_item_id")
      .notNull()
      .references(() => nfeItems.id, { onDelete: "cascade" }),
    vTotTrib: decimal("v_tot_trib", valorDuasCasasDecimais),
    icmsGrupo: varchar("icms_grupo", { length: 20 }),
    icmsOrig: cstOriginEnum("icms_orig"),
    icmsCst: varchar("icms_cst", { length: 2 }),
    icmsCsosn: varchar("icms_csosn", { length: 3 }),
    icmsModBc: varchar("icms_mod_bc", { length: 1 }),
    icmsVBc: decimal("icms_v_bc", valorDuasCasasDecimais),
    icmsPIcms: decimal("icms_p_icms", valorQuatroCasasDecimais),
    icmsVIcms: decimal("icms_v_icms", valorDuasCasasDecimais),
    icmsPFcp: decimal("icms_p_fcp", valorQuatroCasasDecimais),
    icmsVFcp: decimal("icms_v_fcp", valorDuasCasasDecimais),
    icmsPRedBc: decimal("icms_p_red_bc", valorQuatroCasasDecimais),
    icmsVIcmsOp: decimal("icms_v_icms_op", valorDuasCasasDecimais),
    icmsPDif: decimal("icms_p_dif", valorQuatroCasasDecimais),
    icmsVIcmsDif: decimal("icms_v_icms_dif", valorDuasCasasDecimais),
    icmsVIcmsDeson: decimal("icms_v_icms_deson", valorDuasCasasDecimais),
    icmsMotDesIcms: varchar("icms_mot_des_icms", { length: 2 }),
    icmsIndDeduzDeson: varchar("icms_ind_deduz_deson", { length: 1 }),
    icmsModBcSt: varchar("icms_mod_bc_st", { length: 1 }),
    icmsPMvaSt: decimal("icms_p_mva_st", valorQuatroCasasDecimais),
    icmsPRedBcSt: decimal("icms_p_red_bc_st", valorQuatroCasasDecimais),
    icmsVBcSt: decimal("icms_v_bc_st", valorDuasCasasDecimais),
    icmsPIcmsSt: decimal("icms_p_icms_st", valorQuatroCasasDecimais),
    icmsVIcmsSt: decimal("icms_v_icms_st", valorDuasCasasDecimais),
    icmsVBcFcpSt: decimal("icms_v_bc_fcp_st", valorDuasCasasDecimais),
    icmsPFcpSt: decimal("icms_p_fcp_st", valorQuatroCasasDecimais),
    icmsVFcpSt: decimal("icms_v_fcp_st", valorDuasCasasDecimais),
    icmsVIcmsStDeson: decimal("icms_v_icms_st_deson", valorDuasCasasDecimais),
    icmsMotDesIcmsSt: varchar("icms_mot_des_icms_st", { length: 2 }),
    icmsVBcStRet: decimal("icms_v_bc_st_ret", valorDuasCasasDecimais),
    icmsPSt: decimal("icms_p_st", valorQuatroCasasDecimais),
    icmsVIcmsSubstituto: decimal("icms_v_icms_substituto", valorDuasCasasDecimais),
    icmsVIcmsStRet: decimal("icms_v_icms_st_ret", valorDuasCasasDecimais),
    icmsVBcFcpStRet: decimal("icms_v_bc_fcp_st_ret", valorDuasCasasDecimais),
    icmsPFcpStRet: decimal("icms_p_fcp_st_ret", valorQuatroCasasDecimais),
    icmsVFcpStRet: decimal("icms_v_fcp_st_ret", valorDuasCasasDecimais),
    icmsPRedBcEfet: decimal("icms_p_red_bc_efet", valorQuatroCasasDecimais),
    icmsVBcEfet: decimal("icms_v_bc_efet", valorDuasCasasDecimais),
    icmsPIcmsEfet: decimal("icms_p_icms_efet", valorQuatroCasasDecimais),
    icmsVIcmsEfet: decimal("icms_v_icms_efet", valorDuasCasasDecimais),
    icmsPCredSn: decimal("icms_p_cred_sn", valorQuatroCasasDecimais),
    icmsVCredIcmsSn: decimal("icms_v_cred_icms_sn", valorDuasCasasDecimais),
    icmsVBcUfDest: decimal("icms_v_bc_uf_dest", valorDuasCasasDecimais),
    icmsVBcFcpUfDest: decimal("icms_v_bc_fcp_uf_dest", valorDuasCasasDecimais),
    icmsPFcpUfDest: decimal("icms_p_fcp_uf_dest", valorQuatroCasasDecimais),
    icmsPIcmsUfDest: decimal("icms_p_icms_uf_dest", valorQuatroCasasDecimais),
    icmsPIcmsInter: decimal("icms_p_icms_inter", valorQuatroCasasDecimais),
    icmsPIcmsInterPart: decimal("icms_p_icms_inter_part", valorQuatroCasasDecimais),
    icmsVFcpUfDest: decimal("icms_v_fcp_uf_dest", valorDuasCasasDecimais),
    icmsVIcmsUfDest: decimal("icms_v_icms_uf_dest", valorDuasCasasDecimais),
    icmsVIcmsUfRemet: decimal("icms_v_icms_uf_remet", valorDuasCasasDecimais),
    icmsQBcMono: decimal("icms_q_bc_mono", valorQuatroCasasDecimais),
    icmsAdRemIcms: decimal("icms_ad_rem_icms", valorQuatroCasasDecimais),
    icmsVIcmsMono: decimal("icms_v_icms_mono", valorDuasCasasDecimais),
    icmsQBcMonoReten: decimal("icms_q_bc_mono_reten", valorQuatroCasasDecimais),
    icmsAdRemIcmsReten: decimal("icms_ad_rem_icms_reten", valorQuatroCasasDecimais),
    icmsVIcmsMonoReten: decimal("icms_v_icms_mono_reten", valorDuasCasasDecimais),
    icmsPRedAdRem: decimal("icms_p_red_ad_rem", valorQuatroCasasDecimais),
    icmsMotRedAdRem: varchar("icms_mot_red_ad_rem", { length: 1 }),
    icmsVIcmsMonoOp: decimal("icms_v_icms_mono_op", valorDuasCasasDecimais),
    icmsQBcMonoDif: decimal("icms_q_bc_mono_dif", valorQuatroCasasDecimais),
    icmsAdRemIcmsDif: decimal("icms_ad_rem_icms_dif", valorQuatroCasasDecimais),
    icmsVIcmsMonoDif: decimal("icms_v_icms_mono_dif", valorDuasCasasDecimais),
    icmsQBcMonoRet: decimal("icms_q_bc_mono_ret", valorQuatroCasasDecimais),
    icmsAdRemIcmsRet: decimal("icms_ad_rem_icms_ret", valorQuatroCasasDecimais),
    icmsVIcmsMonoRet: decimal("icms_v_icms_mono_ret", valorDuasCasasDecimais),
    ipiCst: varchar("ipi_cst", { length: 2 }),
    ipiCEnq: varchar("ipi_c_enq", { length: 3 }),
    ipiVBc: decimal("ipi_v_bc", valorDuasCasasDecimais),
    ipiPIpi: decimal("ipi_p_ipi", valorQuatroCasasDecimais),
    ipiVIpi: decimal("ipi_v_ipi", valorDuasCasasDecimais),
    ipiQUnid: decimal("ipi_q_unid", valorQuatroCasasDecimais),
    ipiVUnid: decimal("ipi_v_unid", valorQuatroCasasDecimais),
    pDevol: decimal("p_devol", valorQuatroCasasDecimais),
    vIpiDevol: decimal("v_ipi_devol", valorDuasCasasDecimais),
    iiVBc: decimal("ii_v_bc", valorDuasCasasDecimais),
    iiVDespAdu: decimal("ii_v_desp_adu", valorDuasCasasDecimais),
    iiVIi: decimal("ii_v_ii", valorDuasCasasDecimais),
    iiVIof: decimal("ii_v_iof", valorDuasCasasDecimais),
    pisGrupo: varchar("pis_grupo", { length: 20 }),
    pisCst: varchar("pis_cst", { length: 2 }),
    pisVBc: decimal("pis_v_bc", valorDuasCasasDecimais),
    pisPPis: decimal("pis_p_pis", valorQuatroCasasDecimais),
    pisVPis: decimal("pis_v_pis", valorDuasCasasDecimais),
    pisQBcProd: decimal("pis_q_bc_prod", valorQuatroCasasDecimais),
    pisVAliqProd: decimal("pis_v_aliq_prod", valorQuatroCasasDecimais),
    pisVBcSt: decimal("pis_v_bc_st", valorDuasCasasDecimais),
    pisPPisSt: decimal("pis_p_pis_st", valorQuatroCasasDecimais),
    pisQBcProdSt: decimal("pis_q_bc_prod_st", valorQuatroCasasDecimais),
    pisVAliqProdSt: decimal("pis_v_aliq_prod_st", valorQuatroCasasDecimais),
    pisVPisSt: decimal("pis_v_pis_st", valorDuasCasasDecimais),
    pisIndSomaPisSt: varchar("pis_ind_soma_pis_st", { length: 1 }),
    cofinsGrupo: varchar("cofins_grupo", { length: 20 }),
    cofinsCst: varchar("cofins_cst", { length: 2 }),
    cofinsVBc: decimal("cofins_v_bc", valorDuasCasasDecimais),
    cofinsPCofins: decimal("cofins_p_cofins", valorQuatroCasasDecimais),
    cofinsVCofins: decimal("cofins_v_cofins", valorDuasCasasDecimais),
    cofinsQBcProd: decimal("cofins_q_bc_prod", valorQuatroCasasDecimais),
    cofinsVAliqProd: decimal("cofins_v_aliq_prod", valorQuatroCasasDecimais),
    cofinsVBcSt: decimal("cofins_v_bc_st", valorDuasCasasDecimais),
    cofinsPCofinsSt: decimal("cofins_p_cofins_st", valorQuatroCasasDecimais),
    cofinsQBcProdSt: decimal("cofins_q_bc_prod_st", valorQuatroCasasDecimais),
    cofinsVAliqProdSt: decimal("cofins_v_aliq_prod_st", valorQuatroCasasDecimais),
    cofinsVCofinsSt: decimal("cofins_v_cofins_st", valorDuasCasasDecimais),
    cofinsIndSomaCofinsSt: varchar("cofins_ind_soma_cofins_st", { length: 1 }),
    issqnVBc: decimal("issqn_v_bc", valorDuasCasasDecimais),
    issqnVAliq: decimal("issqn_v_aliq", valorQuatroCasasDecimais),
    issqnVIssqn: decimal("issqn_v_issqn", valorDuasCasasDecimais),
    issqnCMunFg: varchar("issqn_c_mun_fg", { length: 7 }),
    issqnCListServ: varchar("issqn_c_list_serv", { length: 5 }),
    issqnVDeducao: decimal("issqn_v_deducao", valorDuasCasasDecimais),
    issqnVOutro: decimal("issqn_v_outro", valorDuasCasasDecimais),
    issqnVDescIncond: decimal("issqn_v_desc_incond", valorDuasCasasDecimais),
    issqnVDescCond: decimal("issqn_v_desc_cond", valorDuasCasasDecimais),
    issqnVIssRet: decimal("issqn_v_iss_ret", valorDuasCasasDecimais),
    issqnIndIss: varchar("issqn_ind_iss", { length: 1 }),
    issqnCServico: varchar("issqn_c_servico", { length: 20 }),
    issqnCMun: varchar("issqn_c_mun", { length: 7 }),
    issqnCPais: varchar("issqn_c_pais", { length: 4 }),
    issqnNProcesso: varchar("issqn_n_processo", { length: 30 }),
    issqnIndIncentivo: varchar("issqn_ind_incentivo", { length: 1 }),
    isCst: varchar("is_cst", { length: 3 }),
    isCClassTrib: varchar("is_c_class_trib", { length: 6 }),
    isVBc: decimal("is_v_bc", valorDuasCasasDecimais),
    isPIs: decimal("is_p_is", valorQuatroCasasDecimais),
    isPIsEspec: decimal("is_p_is_espec", valorQuatroCasasDecimais),
    isUTrib: varchar("is_u_trib", { length: 6 }),
    isQTrib: decimal("is_q_trib", valorQuatroCasasDecimais),
    isVIs: decimal("is_v_is", valorDuasCasasDecimais),
    ibsCbsCst: varchar("ibs_cbs_cst", { length: 3 }),
    ibsCbsCClassTrib: varchar("ibs_cbs_c_class_trib", { length: 6 }),
    ibsCbsIndDoacao: varchar("ibs_cbs_ind_doacao", { length: 1 }),
    ibsCbsVBc: decimal("ibs_cbs_v_bc", valorDuasCasasDecimais),
    ibsUfPIbs: decimal("ibs_uf_p_ibs", valorQuatroCasasDecimais),
    ibsUfPDif: decimal("ibs_uf_p_dif", valorQuatroCasasDecimais),
    ibsUfVDif: decimal("ibs_uf_v_dif", valorDuasCasasDecimais),
    ibsUfVDevTrib: decimal("ibs_uf_v_dev_trib", valorDuasCasasDecimais),
    ibsUfPRedAliq: decimal("ibs_uf_p_red_aliq", valorQuatroCasasDecimais),
    ibsUfPAliqEfet: decimal("ibs_uf_p_aliq_efet", valorQuatroCasasDecimais),
    ibsUfVIbs: decimal("ibs_uf_v_ibs", valorDuasCasasDecimais),
    ibsMunPIbs: decimal("ibs_mun_p_ibs", valorQuatroCasasDecimais),
    ibsMunPDif: decimal("ibs_mun_p_dif", valorQuatroCasasDecimais),
    ibsMunVDif: decimal("ibs_mun_v_dif", valorDuasCasasDecimais),
    ibsMunVDevTrib: decimal("ibs_mun_v_dev_trib", valorDuasCasasDecimais),
    ibsMunPRedAliq: decimal("ibs_mun_p_red_aliq", valorQuatroCasasDecimais),
    ibsMunPAliqEfet: decimal("ibs_mun_p_aliq_efet", valorQuatroCasasDecimais),
    ibsMunVIbs: decimal("ibs_mun_v_ibs", valorDuasCasasDecimais),
    ibsVIbs: decimal("ibs_v_ibs", valorDuasCasasDecimais),
    cbsPCbs: decimal("cbs_p_cbs", valorQuatroCasasDecimais),
    cbsPDif: decimal("cbs_p_dif", valorQuatroCasasDecimais),
    cbsVDif: decimal("cbs_v_dif", valorDuasCasasDecimais),
    cbsVDevTrib: decimal("cbs_v_dev_trib", valorDuasCasasDecimais),
    cbsPRedAliq: decimal("cbs_p_red_aliq", valorQuatroCasasDecimais),
    cbsPAliqEfet: decimal("cbs_p_aliq_efet", valorQuatroCasasDecimais),
    cbsVCbs: decimal("cbs_v_cbs", valorDuasCasasDecimais),
    ibsCbsCstReg: varchar("ibs_cbs_cst_reg", { length: 3 }),
    ibsCbsCClassTribReg: varchar("ibs_cbs_c_class_trib_reg", { length: 6 }),
    ibsUfPAliqEfetReg: decimal("ibs_uf_p_aliq_efet_reg", valorQuatroCasasDecimais),
    ibsUfVTribReg: decimal("ibs_uf_v_trib_reg", valorDuasCasasDecimais),
    ibsMunPAliqEfetReg: decimal("ibs_mun_p_aliq_efet_reg", valorQuatroCasasDecimais),
    ibsMunVTribReg: decimal("ibs_mun_v_trib_reg", valorDuasCasasDecimais),
    cbsPAliqEfetReg: decimal("cbs_p_aliq_efet_reg", valorQuatroCasasDecimais),
    cbsVTribReg: decimal("cbs_v_trib_reg", valorDuasCasasDecimais),
    ibsCCredPres: varchar("ibs_c_cred_pres", { length: 2 }),
    ibsPCredPres: decimal("ibs_p_cred_pres", valorQuatroCasasDecimais),
    ibsVCredPres: decimal("ibs_v_cred_pres", valorDuasCasasDecimais),
    ibsVCredPresCondSus: decimal("ibs_v_cred_pres_cond_sus", valorDuasCasasDecimais),
    cbsCCredPres: varchar("cbs_c_cred_pres", { length: 2 }),
    cbsPCredPres: decimal("cbs_p_cred_pres", valorQuatroCasasDecimais),
    cbsVCredPres: decimal("cbs_v_cred_pres", valorDuasCasasDecimais),
    cbsVCredPresCondSus: decimal("cbs_v_cred_pres_cond_sus", valorDuasCasasDecimais),
    ibsUfPAliqCompraGov: decimal("ibs_uf_p_aliq_compra_gov", valorQuatroCasasDecimais),
    ibsUfVTribCompraGov: decimal("ibs_uf_v_trib_compra_gov", valorDuasCasasDecimais),
    ibsMunPAliqCompraGov: decimal("ibs_mun_p_aliq_compra_gov", valorQuatroCasasDecimais),
    ibsMunVTribCompraGov: decimal("ibs_mun_v_trib_compra_gov", valorDuasCasasDecimais),
    cbsPAliqCompraGov: decimal("cbs_p_aliq_compra_gov", valorQuatroCasasDecimais),
    cbsVTribCompraGov: decimal("cbs_v_trib_compra_gov", valorDuasCasasDecimais),
    ibsCbsQBcMono: decimal("ibs_cbs_q_bc_mono", valorQuatroCasasDecimais),
    ibsAdRem: decimal("ibs_ad_rem", valorQuatroCasasDecimais),
    cbsAdRem: decimal("cbs_ad_rem", valorQuatroCasasDecimais),
    ibsVMono: decimal("ibs_v_mono", valorDuasCasasDecimais),
    cbsVMono: decimal("cbs_v_mono", valorDuasCasasDecimais),
    ibsCbsQBcMonoReten: decimal("ibs_cbs_q_bc_mono_reten", valorQuatroCasasDecimais),
    ibsAdRemReten: decimal("ibs_ad_rem_reten", valorQuatroCasasDecimais),
    cbsAdRemReten: decimal("cbs_ad_rem_reten", valorQuatroCasasDecimais),
    ibsVMonoReten: decimal("ibs_v_mono_reten", valorDuasCasasDecimais),
    cbsVMonoReten: decimal("cbs_v_mono_reten", valorDuasCasasDecimais),
    ibsCbsQBcMonoRet: decimal("ibs_cbs_q_bc_mono_ret", valorQuatroCasasDecimais),
    ibsAdRemRet: decimal("ibs_ad_rem_ret", valorQuatroCasasDecimais),
    cbsAdRemRet: decimal("cbs_ad_rem_ret", valorQuatroCasasDecimais),
    ibsVMonoRet: decimal("ibs_v_mono_ret", valorDuasCasasDecimais),
    cbsVMonoRet: decimal("cbs_v_mono_ret", valorDuasCasasDecimais),
    ibsPDifMono: decimal("ibs_p_dif_mono", valorQuatroCasasDecimais),
    ibsVMonoDif: decimal("ibs_v_mono_dif", valorDuasCasasDecimais),
    cbsPDifMono: decimal("cbs_p_dif_mono", valorQuatroCasasDecimais),
    cbsVMonoDif: decimal("cbs_v_mono_dif", valorDuasCasasDecimais),
    ibsVTransfCred: decimal("ibs_v_transf_cred", valorDuasCasasDecimais),
    cbsVTransfCred: decimal("cbs_v_transf_cred", valorDuasCasasDecimais),
    ibsCbsCompetApur: varchar("ibs_cbs_compet_apur", { length: 7 }),
    ibsVAjusteCompet: decimal("ibs_v_ajuste_compet", valorDuasCasasDecimais),
    cbsVAjusteCompet: decimal("cbs_v_ajuste_compet", valorDuasCasasDecimais),
    ibsVEstCred: decimal("ibs_v_est_cred", valorDuasCasasDecimais),
    cbsVEstCred: decimal("cbs_v_est_cred", valorDuasCasasDecimais),
    ibsTpCredPresZfm: varchar("ibs_tp_cred_pres_zfm", { length: 1 }),
    ibsVCredPresZfm: decimal("ibs_v_cred_pres_zfm", valorDuasCasasDecimais),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [uniqueIndex("nfe_item_taxes_item_unique").on(t.nfeItemId)],
);

// TABELA DE PAGAMENTOS DA NF-e
export const nfePayments = pgTable(
  "nfe_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeHeaderId: uuid("nfe_header_id")
      .notNull()
      .references(() => nfeHeaders.id, { onDelete: "cascade" }),
    paymentTypeId: uuid("payment_type_id")
      .notNull()
      .references(() => paymentTypes.id, { onDelete: "cascade" }),
    paymentTypesMethodsFlagsId: uuid("payment_types_methods_flags_id").references(
      () => paymentTypesMethodsFlags.id,
      { onDelete: "restrict" },
    ), // configuração de pagamento da empresa
    nSeq: integer("n_seq").notNull(),
    indPag: varchar("ind_pag", { length: 1 }),
    tPag: varchar("t_pag", { length: 2 }),
    xPag: varchar("x_pag", { length: 60 }),
    vPag: decimal("v_pag", valorDuasCasasDecimais),
    cardTpIntegra: varchar("card_tp_integra", { length: 1 }),
    cardCnpj: varchar("card_cnpj", { length: 14 }),
    cardTBand: varchar("card_t_band", { length: 2 }),
    cardCAut: varchar("card_c_aut", { length: 128 }),
    cnpjReceb: varchar("cnpj_receb", { length: 14 }),
    idTermPag: varchar("id_term_pag", { length: 40 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [index("nfe_payments_header_idx").on(t.nfeHeaderId)],
);

// cfop - código fiscal de operação e prestação ( global para todas as empresas )
export const cfops = pgTable(
  "cfops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cfop: varchar("cfop", { length: 4 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(), // descrição do cfop
    generateRevenue: boolean("generate_revenue").notNull().default(false), // gerar receita ( se true, o cfop é para receita )
    issuedNfce: boolean("issued_nfce").notNull().default(false), // emitir NFC-e ( não emitir NFE )
    movimentType: cfopMovimentTypeEnum("moviment_type").notNull(), // tipo de movimento no cfop
    cfopForFuels: boolean("cfop_for_fuels").notNull().default(false), // cfop para combustíveis ( se true, o cfop é para combustíveis )
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação do cfop
    updatedAt: tz("updated_at"), // data de atualização do cfop
  },  
  (t) => [
    uniqueIndex("cfops_cfop_unique").on(t.cfop),
    check("cfops_generate_revenue_chk", sql`${t.generateRevenue} = true or ${t.generateRevenue} = false`),
    check("cfops_issued_nfce_chk", sql`${t.issuedNfce} = true or ${t.issuedNfce} = false`),
    check("cfops_moviment_type_chk", sql`${t.movimentType} in ('ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'DEVOLUCAO')`),
    check("cfops_cfop_for_fuels_chk", sql`${t.cfopForFuels} = true or ${t.cfopForFuels} = false`),
  ],
);

// modelos de documento fiscal - tabela 4.1.1 do SPED ( global para todas as empresas )
export const fiscalDocumentModels = pgTable(
  "fiscal_document_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 2 }).notNull(), // código do modelo: 01, 1B, 04, 55, 57, 65...
    description: varchar("description", { length: 255 }).notNull(), // descrição do modelo
    electronic: boolean("electronic").notNull().default(false), // documento eletrônico (55, 57, 59, 65...)
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [uniqueIndex("fiscal_document_models_code_unique").on(t.code)],
);

// modelos de nota cujo PDF a empresa grava/imprime ( por empresa )
export const enterprisesPrintModels = pgTable(
  "enterprises_print_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    documentModelCode: varchar("document_model_code", { length: 2 })
      .notNull()
      .references(() => fiscalDocumentModels.code, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("enterprises_print_models_unique").on(t.enterpriseId, t.documentModelCode),
  ],
);

// cfop - código fiscal de operação e prestação ( para cada empresa )
export const cfopsEnterprises = pgTable(
  "cfops_enterprises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    cfopId: uuid("cfop_id")
      .notNull()
      .references(() => cfops.id, { onDelete: "cascade" }),
    additionCfop: text("addition_cfop"), // informações adicionais do cfop para a empresa
    editDescription: boolean("edit_description").notNull().default(false), // editar descrição do cfop
    calculatesDifal: boolean("calculates_difal").notNull().default(false), // calcular DIFAL ( se true, o cfop é para calcular DIFAL )    
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação do cfop para a empresa
    updatedAt: tz("updated_at"), // data de atualização do cfop para a empresa
  },
  (t) => [
    uniqueIndex("cfops_enterprises_cfop_enterprises_unique").on(t.cfopId, t.enterprisesId),
    check("cfops_enterprises_edit_description_chk", sql`${t.editDescription} = true or ${t.editDescription} = false`),
    check("cfops_enterprises_calculates_difal_chk", sql`${t.calculatesDifal} = true or ${t.calculatesDifal} = false`),
  ],
);

// tax status - situacao tributaria CST ( global para todas as empresas )
export const situationTributaryCst = pgTable(  // tabela de situações tributárias CST
  "situation_tributary_cst",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    regimeTributario: regimeTributarioEnum("regime_tributario").notNull(), // regime tributário (CRT 1 a 4)
    origin: varchar("origin", { length: 1 }).notNull(), // origem ( 0 - nacional, 1 - importado )
    cst: varchar("cst", { length: 3 }).notNull(), // CST (2 dígitos) ou CSOSN (3 dígitos), sem a origem
    description: varchar("description", { length: 255 }).notNull(), // descrição da situação tributária
    allowsCredit: boolean("allows_credit").notNull().default(false), // permite crédito ( se true, a situação tributária permite crédito )
    featuresReduction: boolean("features_reduction").notNull().default(false), // permite redução ( se true, a situação permite redução )    
    withheldTax: boolean("withheld_tax").notNull().default(false), // imposto retido ( se true, a situação possui imposto retido )
    taxationType: taxationTypeEnum("taxation_type").notNull(), // tipo de tributação ( 1 - tributado, 2 - Substituicao, 3 - Tributado/Susbstituicao, 4- Isento )
    observation: text("observation"), // observação da situação tributária
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação da situação tributária
    updatedAt: tz("updated_at"), // data de atualização da situação tributária
  },
  (t) => [
    uniqueIndex("situation_tributary_cst_regime_origin_cst_unique").on(t.regimeTributario, t.origin, t.cst),
    check("situation_tributary_cst_regime_tributario_chk", sql`${t.regimeTributario} in ('1', '2', '3', '4')`),
    check("situation_tributary_cst_origin_chk", sql`${t.origin} ~ '^[0-8]$'`),
    check("situation_tributary_cst_cst_chk", sql`${t.cst} ~ '^[0-9]{2,3}$'`),
    check(
      "situation_tributary_cst_cst_crt_chk",
      sql`(${t.regimeTributario} = '3' and ${t.cst} ~ '^[0-9]{2}$') or (${t.regimeTributario} <> '3' and ${t.cst} ~ '^[0-9]{3}$')`,
    ),
    check("situation_tributary_cst_allows_credit_chk", sql`${t.allowsCredit} = true or ${t.allowsCredit} = false`),
    check("situation_tributary_cst_features_reduction_chk", sql`${t.featuresReduction} = true or ${t.featuresReduction} = false`),
    check("situation_tributary_cst_withheld_tax_chk", sql`${t.withheldTax} = true or ${t.withheldTax} = false`),
  ],
);

// CODIGO BENEFICIO FISCAL - global para todas as empresas
export const benefitCode = pgTable( // tabela de códigos de benefício
  "benefit_code",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    uf: varchar("uf", { length: 2 }).notNull(), // UF do benefício
    codeBenefit: varchar("code_benefit", { length: 10 }).notNull(), // cBenef, até 10 caracteres
    descriptionBenefit: text("description_benefit"), // descrição do benefício
    observationBenefit: text("observation_benefit"), // observação do benefício    
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação do benefício
    updatedAt: tz("updated_at"), // data de atualização do benefício
  },  
  (t) => [
    uniqueIndex("benefit_code_uf_code_unique").on(t.uf, t.codeBenefit),
    check(
      "benefit_code_uf_chk",
      sql`${t.uf} in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')`,
    ),
  ],
);

//  CST compatível com benefício ( global para todas as empresas )
export const cstCompativelBenefit = pgTable( // tabela de CST compatível com benefício
  "cst_compativel_benefit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    benefitCodeId: uuid("benefit_code_id")
      .notNull()
      .references(() => benefitCode.id, { onDelete: "cascade" }),
    situationTributaryCstId: uuid("situation_tributary_cst_id")
      .notNull()
      .references(() => situationTributaryCst.id, { onDelete: "cascade" }),
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação do CST compatível com benefício
    updatedAt: tz("updated_at"), // data de atualização do CST compatível com benefício
  },
  (t) => [
    uniqueIndex("cst_compativel_benefit_benefit_cst_unique").on(t.benefitCodeId, t.situationTributaryCstId),
    check("cst_compativel_benefit_benefit_code_chk", sql`${t.benefitCodeId} is not null`),
    check("cst_compativel_benefit_situation_tributary_cst_chk", sql`${t.situationTributaryCstId} is not null`),
  ],
);

// BENEFICIO FISCAL POR CFOP - por empresas
export const benefitCodeByCfop = pgTable( // tabela de benefício fiscal por CFOP
  "benefit_code_by_cfop",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cfop: varchar("cfop", { length: 4 }).notNull(), // CFOP
    cst: varchar("cst", { length: 2 }).notNull(), // CST sem a origem
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    benefitCodeId: uuid("benefit_code_id")
      .notNull()
      .references(() => benefitCode.id, { onDelete: "restrict" }), // cBenef (a UF vem do benefit_code)
    reductionPercentage: decimal("reduction_percentage", percentageDecimal), // percentual de redução ( 0.00 - 100.00 )
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação do benefício fiscal por CFOP
    updatedAt: tz("updated_at"), // data de atualização do benefício fiscal por CFOP
  },
  (t) => [
    uniqueIndex("benefit_code_by_cfop_unique").on(t.enterprisesId, t.cfop, t.cst, t.benefitCodeId),
    check("benefit_code_by_cfop_cfop_chk", sql`${t.cfop} ~ '^[0-9]{4}$'`),
    check("benefit_code_by_cfop_cst_chk", sql`${t.cst} ~ '^[0-9]{2}$'`),
    check("benefit_code_by_cfop_benefit_code_chk", sql`${t.benefitCodeId} is not null`),
    check("benefit_code_by_cfop_enterprises_chk", sql`${t.enterprisesId} is not null`),
    check("benefit_code_by_cfop_reduction_percentage_chk", sql`${t.reductionPercentage} between 0 and 100`),    
  ],
);

// BENEFICIO FISCAL POR TIPO DE CLIENTES
export const benefitTypeCostumers = pgTable( // tabela de tipos de custoers
  "benefit_type_costumers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cfop: varchar("cfop", { length: 4 }).notNull(), // CFOP
    cst: varchar("cst", { length: 2 }).notNull(), // CST sem a origem
    typeSupplierCustomerId: uuid("type_supplier_customer_id")
      .notNull()
      .references(() => typeSupplierCustomers.id, { onDelete: "cascade" }), // tipo de cliente
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }), // empresa dona do tipo
    benefitCodeId: uuid("benefit_code_id")
      .notNull()
      .references(() => benefitCode.id, { onDelete: "restrict" }), // cBenef (a UF vem do benefit_code)
    reductionPercentage: decimal("reduction_percentage", percentageDecimal), // percentual de redução ( 0.00 - 100.00 ) 
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação do tipo de custoer
    updatedAt: tz("updated_at"), // data de atualização do tipo de custoer
  },
  (t) => [
    uniqueIndex("benefit_type_costumers_unique").on(t.enterpriseId, t.typeSupplierCustomerId, t.cfop, t.cst, t.benefitCodeId),
    check("benefit_type_costumers_cfop_chk", sql`${t.cfop} ~ '^[0-9]{4}$'`),
    check("benefit_type_costumers_cst_chk", sql`${t.cst} ~ '^[0-9]{2}$'`),
    check("benefit_type_costumers_reduction_percentage_chk", sql`${t.reductionPercentage} between 0 and 100`),    
    check("benefit_type_costumers_enterprises_chk", sql`${t.enterpriseId} is not null`),
    check("benefit_type_costumers_benefit_code_chk", sql`${t.benefitCodeId} is not null`),
    check("benefit_type_costumers_type_supplier_customer_chk", sql`${t.typeSupplierCustomerId} is not null`),
  ],
);


// BENEFICIO FISCAL POR ESTADO E PRODUTOS.
export const benefitCodeByStateAndProducts = pgTable( // tabela de benefício fiscal por estado e produtos
  "benefit_code_by_state_and_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }), // empresa dona do benefício fiscal por estado e produtos
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "cascade" }),
    cfop: varchar("cfop", { length: 4 }).notNull(), // CFOP máximo de 4 dígitos
    cst: varchar("cst", { length: 2 }).notNull(), // CST sem a origem máximo de 2 dígitos
    productsEnterprisesId: uuid("products_enterprises_id")
      .notNull()
      .references(() => productsEnterprises.id, { onDelete: "cascade" } ), // produto empresa
    benefitCodeId: uuid("benefit_code_id")
      .notNull()
      .references(() => benefitCode.id, { onDelete: "restrict" }), // cBenef (a UF vem do benefit_code)
    reductionPercentage: decimal("reduction_percentage", percentageDecimal), // percentual de redução ( 0.00 - 100.00 ) 
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação do benefício fiscal por estado e produtos
    updatedAt: tz("updated_at"), // data de atualização do benefício fiscal por estado e produtos
  },
  (t) => [
    uniqueIndex("benefit_state_products_unique").on(t.enterprisesId, t.stateId, t.cfop, t.cst, t.productsEnterprisesId, t.benefitCodeId),
    check("benefit_state_products_state_chk", sql`${t.stateId} is not null`),
    check("benefit_state_products_cfop_chk", sql`${t.cfop} ~ '^[0-9]{4}$'`),
    check("benefit_state_products_cst_chk", sql`${t.cst} ~ '^[0-9]{2}$'`),
    check("benefit_state_products_products_enterprises_chk", sql`${t.productsEnterprisesId} is not null`),
    check("benefit_state_products_reduction_percentage_chk", sql`${t.reductionPercentage} between 0 and 100`),
    check("benefit_state_products_enterprises_chk", sql`${t.enterprisesId} is not null`),
    check("benefit_state_products_benefit_code_chk", sql`${t.benefitCodeId} is not null`),
  ],
);


// REFORMA TRIBUTARIA - CST - do IBS/CBS da nova reforma tributaria ( GLOBAL )
export const cstIbsCbs = pgTable( // tabela de CST do IBS/CBS da nova reforma tributaria
  "cst_ibs_cbs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: boolean("status").notNull().default(true), // status do CST do IBS/CBS da nova reforma tributaria ( se true, o CST do IBS/CBS da nova reforma tributaria está ativo )
    cst: varchar("cst", { length: 3 }).notNull(), // código com 3 dígitos
    description: varchar("description", { length: 255 }).notNull(), // descrição da situação tributária
    ind_gIBSCBS: varchar("ind_gIBSCBS", { length: 1 }).notNull(), // indicador de IBS/CBS ( 0 - não é IBS/CBS, 1 - é IBS/CBS )
    ind_gIBSCBSMono: varchar("ind_gIBSCBSMono", { length: 1 }).notNull(), // indicador de IBS/CBS monossíntese ( 0 - não é IBS/CBS monossíntese, 1 - é IBS/CBS monossíntese )
    ind_gRED: varchar("ind_gRED", { length: 1 }).notNull(), // indicador de RED ( 0 - não é RED, 1 - é RED )
    ind_gDif: varchar("ind_gDif", { length: 1 }).notNull(), // indicador de DIF ( 0 - não é DIF, 1 - é DIF )
    ind_gTransfCred: varchar("ind_gTransfCred", { length: 1 }).notNull(), // indicador de TRANSF.CRED. ( 0 - não é TRANSF.CRED., 1 - é TRANSF.CRED. )
    ind_gCredPresIBSZFM: varchar("ind_gCredPresIBSZFM", { length: 1 }).notNull(), // indicador de CRED.PRES.IBSZFM ( 0 - não é CRED.PRES.IBSZFM, 1 - é CRED.PRES.IBSZFM )
    ind_gAjusteCompet: varchar("ind_gAjusteCompet", { length: 1 }).notNull(), // indicador de AJUSTE.COMPET. ( 0 - não é AJUSTE.COMPET., 1 - é AJUSTE.COMPET. )
    ind_RedutorBC: varchar("ind_RedutorBC", { length: 1 }).notNull(), // indicador de REDUTOR.BC ( 0 - não é REDUTOR.BC, 1 - é REDUTOR.BC )    
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação do CST do IBS/CBS da nova reforma tributaria
    updatedAt: tz("updated_at"), // data de atualização do CST do IBS/CBS da nova reforma tributaria  
  },

  (t) => [
    uniqueIndex("cst_ibs_cbs_cst_unique").on(t.cst),
    check("cst_ibs_cbs_status_chk", sql`${t.status} = true or ${t.status} = false`),
    check("cst_ibs_cbs_ind_gIBSCBS_chk", sql`${t.ind_gIBSCBS} = '0' or ${t.ind_gIBSCBS} = '1'`),
    check("cst_ibs_cbs_ind_gIBSCBSMono_chk", sql`${t.ind_gIBSCBSMono} = '0' or ${t.ind_gIBSCBSMono} = '1'`),
    check("cst_ibs_cbs_ind_gRED_chk", sql`${t.ind_gRED} = '0' or ${t.ind_gRED} = '1'`),
    check("cst_ibs_cbs_ind_gDif_chk", sql`${t.ind_gDif} = '0' or ${t.ind_gDif} = '1'`),
    check("cst_ibs_cbs_ind_gTransfCred_chk", sql`${t.ind_gTransfCred} = '0' or ${t.ind_gTransfCred} = '1'`),
    check("cst_ibs_cbs_ind_gCredPresIBSZFM_chk", sql`${t.ind_gCredPresIBSZFM} = '0' or ${t.ind_gCredPresIBSZFM} = '1'`),
    check("cst_ibs_cbs_ind_gAjusteCompet_chk", sql`${t.ind_gAjusteCompet} = '0' or ${t.ind_gAjusteCompet} = '1'`),
    check("cst_ibs_cbs_ind_RedutorBC_chk", sql`${t.ind_RedutorBC} = '0' or ${t.ind_RedutorBC} = '1'`),
  ],
);

// classificacao da IBS/CBS da nova reforma tributaria ( GLOBAL )
export const classificationIbsCbs = pgTable( // tabela de classificação da IBS/CBS da nova reforma tributaria
  "classification_ibs_cbs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cstIbsCbsId: uuid("cst_ibs_cbs_id")
      .notNull()
      .references(() => cstIbsCbs.id, { onDelete: "cascade" }),
    cClassTrib: varchar("c_class_trib", { length: 6 }).notNull(), // código com 6 dígitos
    nameClassTrib: varchar("name_class_trib", { length: 255 }).notNull(), // nome da classificação da IBS/CBS da nova reforma tributaria
    descriptionClassTrib: text("description_class_trib"), // descrição da classificação da IBS/CBS da nova reforma tributaria
    lcRedacao: text("lc_redacao" ), // lista de códigos de redação
    lc_214_25: varchar("lc_214_25", { length: 255 }), // lista de códigos de redução
    pRedIbs: decimal("p_red_ibs", percentageDecimal), // percentual de redução do IBS
    pRedCbs: decimal("p_red_cbs", percentageDecimal), // percentual de redução do CBS
    ind_gTribRegular: varchar("ind_g_trib_regular", { length: 1 }).notNull(), // indicador de TRIBUTACAO REGULAR ( 0 - não é TRIBUTACAO REGULAR, 1 - é TRIBUTACAO REGULAR )
    cClassTribRegular: varchar("c_class_trib_regular", { length: 6 }), // código com 6 dígitos ( obrigatório quando ind_gTribRegular = 1, nulo quando 0 )
    ind_gCredPresOper: varchar("ind_g_cred_pres_oper", { length: 1 }).notNull(), // indicador de CRED.PRES.OPER. ( 0 - não é CRED.PRES.OPER., 1 - é CRED.PRES.OPER. )
    ind_gMonoPadrao: varchar("ind_g_mono_padrao", { length: 1 }).notNull(), // indicador de MONO.PADRÃO ( 0 - não é MONO.PADRÃO, 1 - é MONO.PADRÃO )
    indMonoReten: varchar("ind_mono_reten", { length: 1 }).notNull(), // indicador de MONO.RETEN. ( 0 - não é MONO.RETEN., 1 - é MONO.RETEN. )
    indMonoRet: varchar("ind_mono_ret", { length: 1 }).notNull(), // indicador de MONO.RETENÇÃO. ( 0 - não é MONO.RETENÇÃO., 1 - é MONO.RETENÇÃO. )
    indMonoDif: varchar("ind_mono_dif", { length: 1 }).notNull(), // indicador de MONO.DIF. ( 0 - não é MONO.DIF., 1 - é MONO.DIF. )
    ind_gEstornoCred: varchar("ind_g_estorno_cred", { length: 1 }).notNull(), // indicador de ESTORNO.CRED. ( 0 - não é ESTORNO.CRED., 1 - é ESTORNO.CRED. )
    credito_para: varchar("credito_para", { length: 1 }).notNull(), // crédito para ( 0 - não é crédito para, 1 - é crédito para )
    dIniVig: date("d_ini_vig"), // data de início de vigência
    dFimVig: date("d_fim_vig"), // data de fim de vigência
    updateDate: date("update_date"), // data de atualização da classificação da IBS/CBS da nova reforma tributaria ( DataAtualizacao )
    indNFeABI: varchar("ind_nfe_abi", { length: 1 }).notNull(), // indicador de NFe ABI ( 0 - não é NFe ABI, 1 - é NFe ABI )
    indNfe: varchar("ind_nfe", { length: 1 }).notNull(), // indicador de NFe ( 0 - não é NFe, 1 - é NFe )
    indNfce: varchar("ind_nfce", { length: 1 }).notNull(), // indicador de NFCe ( 0 - não é NFCe, 1 - é NFCe )
    indCte: varchar("ind_cte", { length: 1 }).notNull(), // indicador de CT-e ( 0 - não é CT-e, 1 - é CT-e )
    indCTeOS: varchar("ind_cte_os", { length: 1 }).notNull(), // indicador de CT-e OS ( 0 - não é CT-e OS, 1 - é CT-e OS )
    indBPe: varchar("ind_bpe", { length: 1 }).notNull(), // indicador de BPe ( 0 - não é BPe, 1 - é BPe )
    indBPeTA: varchar("ind_bpe_ta", { length: 1 }).notNull(), // indicador de BPe Tabela ( 0 - não é BPe Tabela, 1 - é BPe Tabela )
    indBPeTM: varchar("ind_bpe_tm", { length: 1 }).notNull(), // indicador de BPe TM ( 0 - não é BPe TM, 1 - é BPe TM )
    indNF3e: varchar("ind_nf3e", { length: 1 }).notNull(), // indicador de NF-3e ( 0 - não é NF-3e, 1 - é NF-3e )
    indNFse: varchar("ind_nfse", { length: 1 }).notNull(), // indicador de NFse ( 0 - não é NFse, 1 - é NFse )
    indNFSe_Via: varchar("ind_nfse_via", { length: 1 }).notNull(), // indicador de NFse via ( 0 - não é NFse via, 1 - é NFse via )
    indNFCom: varchar("ind_nfcom", { length: 1 }).notNull(), // indicador de NFCom ( 0 - não é NFCom, 1 - é NFCom )
    indNFAg: varchar("ind_nfag", { length: 1 }).notNull(), // indicador de NFA ( 0 - não é NFA, 1 - é NFA )
    indNFGas: varchar("ind_nfgas", { length: 1 }).notNull(), // indicador de NFGas ( 0 - não é NFGas, 1 - é NFGas )
    indDere: varchar("ind_dere", { length: 1 }).notNull(), // indicador de DERE ( 0 - não é DERE, 1 - é DERE )
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação da classificação da IBS/CBS da nova reforma tributaria
    updatedAt: tz("updated_at"), // data de atualização da classificação da IBS/CBS da nova reforma tributaria
  },
  (t) => [
    uniqueIndex("classification_ibs_cbs_c_class_trib_unique").on(t.cClassTrib),
    check("classification_ibs_cbs_c_class_trib_chk", sql`${t.cClassTrib} between '000001' and '999999'`),
    check("classification_ibs_cbs_name_class_trib_chk", sql`${t.nameClassTrib} is not null`),
    check("classification_ibs_cbs_description_class_trib_chk", sql`${t.descriptionClassTrib} is not null`),
    check("classification_ibs_cbs_ind_gTribRegular_chk", sql`${t.ind_gTribRegular} = '0' or ${t.ind_gTribRegular} = '1'`),
    check(
      "classification_ibs_cbs_c_class_trib_regular_chk",
      sql`(${t.ind_gTribRegular} = '1' and ${t.cClassTribRegular} ~ '^[0-9]{6}$') or (${t.ind_gTribRegular} = '0' and ${t.cClassTribRegular} is null)`,
    ),
    check("classification_ibs_cbs_ind_gCredPresOper_chk", sql`${t.ind_gCredPresOper} = '0' or ${t.ind_gCredPresOper} = '1'`),
    check("classification_ibs_cbs_ind_gMonoPadrao_chk", sql`${t.ind_gMonoPadrao} = '0' or ${t.ind_gMonoPadrao} = '1'`),
    check("classification_ibs_cbs_ind_mono_reten_chk", sql`${t.indMonoReten} = '0' or ${t.indMonoReten} = '1'`),
    check("classification_ibs_cbs_ind_mono_ret_chk", sql`${t.indMonoRet} = '0' or ${t.indMonoRet} = '1'`),
    check("classification_ibs_cbs_ind_mono_dif_chk", sql`${t.indMonoDif} = '0' or ${t.indMonoDif} = '1'`),
    check("classification_ibs_cbs_ind_gEstornoCred_chk", sql`${t.ind_gEstornoCred} = '0' or ${t.ind_gEstornoCred} = '1'`),
    check("classification_ibs_cbs_credito_para_chk", sql`${t.credito_para} = '0' or ${t.credito_para} = '1'`),
    check("classification_ibs_cbs_ind_nfe_abi_chk", sql`${t.indNFeABI} = '0' or ${t.indNFeABI} = '1'`),
    check("classification_ibs_cbs_ind_nfe_chk", sql`${t.indNfe} = '0' or ${t.indNfe} = '1'`),
    check("classification_ibs_cbs_ind_nfce_chk", sql`${t.indNfce} = '0' or ${t.indNfce} = '1'`),
    check("classification_ibs_cbs_ind_cte_chk", sql`${t.indCte} = '0' or ${t.indCte} = '1'`),
    check("classification_ibs_cbs_ind_cte_os_chk", sql`${t.indCTeOS} = '0' or ${t.indCTeOS} = '1'`),
    check("classification_ibs_cbs_ind_bpe_chk", sql`${t.indBPe} = '0' or ${t.indBPe} = '1'`),
    check("classification_ibs_cbs_ind_bpe_ta_chk", sql`${t.indBPeTA} = '0' or ${t.indBPeTA} = '1'`),
    check("classification_ibs_cbs_ind_bpe_tm_chk", sql`${t.indBPeTM} = '0' or ${t.indBPeTM} = '1'`),
    check("classification_ibs_cbs_ind_nf3e_chk", sql`${t.indNF3e} = '0' or ${t.indNF3e} = '1'`),
    check("classification_ibs_cbs_ind_nfse_chk", sql`${t.indNFse} = '0' or ${t.indNFse} = '1'`),
    check("classification_ibs_cbs_ind_nfse_via_chk", sql`${t.indNFSe_Via} = '0' or ${t.indNFSe_Via} = '1'`),
    check("classification_ibs_cbs_ind_nfcom_chk", sql`${t.indNFCom} = '0' or ${t.indNFCom} = '1'`),
    check("classification_ibs_cbs_ind_nfag_chk", sql`${t.indNFAg} = '0' or ${t.indNFAg} = '1'`),
    check("classification_ibs_cbs_ind_nfgas_chk", sql`${t.indNFGas} = '0' or ${t.indNFGas} = '1'`),
    check("classification_ibs_cbs_ind_dere_chk", sql`${t.indDere} = '0' or ${t.indDere} = '1'`),
  ],
);

// TABELA DE OPERACOES FISCAL ( global )
export const nfeOperations = pgTable(
  "nfe_operations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: boolean("ativo").notNull().default(true), // ativo
    description: text("description").notNull(), // descrição da operação
    suframa: boolean("suframa").notNull().default(false), // suframa
    priority: boolean("priority").notNull().default(false), // prioridade da operação
    onerous: boolean("onerous").notNull().default(false),    // onerosa
    tributada: boolean("tributada").notNull().default(false), // tributada
    presumedCreditId: uuid("presumed_credit_id")
      .references(() => presumedCredit.id, { onDelete: "restrict" }), // crédito presumido da operação
    classificationIbsCbsId: uuid("classification_ibs_cbs_id")
      .notNull()
      .references(() => classificationIbsCbs.id, { onDelete: "restrict" }), // classificação da IBS/CBS da nova reforma tributaria
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_operations_key_unique").on(
      t.description,
    ),
  ],
);

// TABELA DE OPERAÇÃO POR ESTADOS( por empresa ) 
export const nfeOperationsStates = pgTable(
  "nfe_operations_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }), // empresa da operação
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "restrict" }), // estado da operação
    nfeOperationsId: uuid("nfe_operations_id")
      .notNull()
      .references(() => nfeOperations.id, { onDelete: "restrict" }), // operação fiscal da operação
    cfopEnterprisesId: uuid("cfop_enterprises_id")
      .notNull()
      .references(() => cfopsEnterprises.id, { onDelete: "restrict" }), // CFOP da operação
    icmsTaxationId: uuid("icms_taxation_id")
      .notNull()
      .references(() => icmsTaxation.id, { onDelete: "restrict" }), // tributação ICMS
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_operations_states_key_unique").on(
      t.enterpriseId,
      t.stateId,
      t.nfeOperationsId,
      t.cfopEnterprisesId,
      t.icmsTaxationId,
    ),
  ],
);

// TABELA DE CREDITO PRESUMIDO( global )
export const presumedCredit = pgTable(
  "presumed_credit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    credPres: varchar("c_cred_pres", { length: 2 }).notNull(), // cCredPres com 2 dígitos
    description: text("description").notNull(), // descrição do crédito presumido
    lcRedacao: text("lc_redacao"), // redação da LC 214/2025
    indNfe: varchar("ind_nfe", { length: 1 }).notNull(), // apropria via NF? ( 0 - não, 1 - sim )
    indEvento: varchar("ind_evento", { length: 1 }).notNull(), // apropria via evento? ( 0 - não, 1 - sim )
    ind_DeduzCredPres: varchar("ind_deduz_cred_pres", { length: 1 }).notNull(), // deduz o crédito presumido ( 0 - não, 1 - sim )
    ind_gCBSCredPres: varchar("ind_g_cbs_cred_pres", { length: 1 }).notNull(), // gera crédito presumido de CBS ( 0 - não, 1 - sim )
    ind_gIBSCredPres: varchar("ind_g_ibs_cred_pres", { length: 1 }).notNull(), // gera crédito presumido de IBS ( 0 - não, 1 - sim )
    cbsRateType: varchar("cbs_rate_type", { length: 100 }), // tipo da alíquota CBS ( fixa, efetiva, calculada... )
    ibsRateType: varchar("ibs_rate_type", { length: 100 }), // tipo da alíquota IBS ( fixa, efetiva, calculada... )
    pAliqCredPresCbs: text("p_aliq_cred_pres_cbs"), // regra da alíquota do crédito presumido de CBS
    pAliqCredPresIbs: text("p_aliq_cred_pres_ibs"), // regra da alíquota do crédito presumido de IBS
    pCredPresCbs: decimal("p_cred_pres_cbs", percentageDecimal), // alíquota fixa do crédito presumido de CBS
    pCredPresIbs: decimal("p_cred_pres_ibs", percentageDecimal), // alíquota fixa do crédito presumido de IBS
    pRedTransicaoIbs: text("p_red_transicao_ibs"), // redução de transição do IBS
    cClassRef: varchar("c_class_ref", { length: 100 }), // cClassTrib da nota referenciada
    dIniVigCbs: date("d_ini_vig_cbs"), // início de vigência da CBS
    dFimVigCbs: date("d_fim_vig_cbs"), // fim de vigência da CBS
    dIniVigIbs: date("d_ini_vig_ibs"), // início de vigência do IBS
    dFimVigIbs: date("d_fim_vig_ibs"), // fim de vigência do IBS
    
    
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("presumed_credit_cred_pres_unique").on(t.credPres),
    check("presumed_credit_cred_pres_chk", sql`${t.credPres} ~ '^[0-9]{2}$'`),
    check("presumed_credit_ind_nfe_chk", sql`${t.indNfe} in ('0', '1')`),
    check("presumed_credit_ind_evento_chk", sql`${t.indEvento} in ('0', '1')`),
    check("presumed_credit_ind_deduz_chk", sql`${t.ind_DeduzCredPres} in ('0', '1')`),
    check("presumed_credit_ind_g_cbs_chk", sql`${t.ind_gCBSCredPres} in ('0', '1')`),
    check("presumed_credit_ind_g_ibs_chk", sql`${t.ind_gIBSCredPres} in ('0', '1')`),
    check(
      "presumed_credit_p_cred_pres_cbs_range",
      sql`${t.pCredPresCbs} is null or (${t.pCredPresCbs} >= 0 and ${t.pCredPresCbs} <= 100)`,
    ),
    check(
      "presumed_credit_p_cred_pres_ibs_range",
      sql`${t.pCredPresIbs} is null or (${t.pCredPresIbs} >= 0 and ${t.pCredPresIbs} <= 100)`,
    ),
  ],
);

export const anexosRt = pgTable(
  "anexos_rt",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productsNcmId: uuid("products_ncm_id")
      .notNull()
      .references(() => productsNcm.id, { onDelete: "cascade" }),
    dateFim: date("date_fim").notNull(),
    legislation: varchar("legislation", { length: 50 }).notNull(), // LC 214/2025
    anexo: varchar("anexo", { length: 20 }).notNull(), // IX
    cstIbsCbsId: uuid("cst_ibs_cbs_id")
      .notNull()
      .references(() => cstIbsCbs.id, { onDelete: "restrict" }),
    classificationIbsCbsId: uuid("classification_ibs_cbs_id")
      .notNull()
      .references(() => classificationIbsCbs.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("anexos_rt_ncm_anexo_class_unique").on(
      t.productsNcmId,
      t.legislation,
      t.anexo,
      t.classificationIbsCbsId,
    ),
  ],
);

const pesoTresCasasDecimais = { precision: 15, scale: 3 } as const;

/** Transporte da NF-e (grupo transp), um por nota. */
export const nfeTransports = pgTable(
  "nfe_transports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeHeaderId: uuid("nfe_header_id")
      .notNull()
      .references(() => nfeHeaders.id, { onDelete: "cascade" }),
    modFrete: varchar("mod_frete", { length: 1 }).notNull(),
    transpCnpj: varchar("transp_cnpj", { length: 14 }),
    transpCpf: varchar("transp_cpf", { length: 11 }),
    transpXNome: varchar("transp_x_nome", { length: 60 }),
    transpIe: varchar("transp_ie", { length: 14 }),
    transpXEnder: varchar("transp_x_ender", { length: 60 }),
    transpXMun: varchar("transp_x_mun", { length: 60 }),
    transpUf: varchar("transp_uf", { length: 2 }),
    retVServ: decimal("ret_v_serv", valorDuasCasasDecimais),
    retVBc: decimal("ret_v_bc", valorDuasCasasDecimais),
    retPIcms: decimal("ret_p_icms", valorQuatroCasasDecimais),
    retVIcms: decimal("ret_v_icms", valorDuasCasasDecimais),
    retCfop: varchar("ret_cfop", { length: 4 }),
    retCMunFg: varchar("ret_c_mun_fg", { length: 7 }),
    veicPlaca: varchar("veic_placa", { length: 7 }),
    veicUf: varchar("veic_uf", { length: 2 }),
    veicRntc: varchar("veic_rntc", { length: 20 }),
    vagao: varchar("vagao", { length: 20 }),
    balsa: varchar("balsa", { length: 20 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_transports_header_unique").on(t.nfeHeaderId),
    check("nfe_transports_mod_frete_chk", sql`${t.modFrete} in ('0', '1', '2', '3', '4', '9')`),
    check(
      "nfe_transports_transp_uf_chk",
      sql`${t.transpUf} is null or ${t.transpUf} in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')`,
    ),
    check(
      "nfe_transports_veic_uf_chk",
      sql`${t.veicUf} is null or ${t.veicUf} in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')`,
    ),
  ],
);

/** Reboques do transporte (até 5). */
export const nfeTransportTrailers = pgTable(  
  "nfe_transport_trailers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeTransportId: uuid("nfe_transport_id")
      .notNull()
      .references(() => nfeTransports.id, { onDelete: "cascade" }),
    nSeq: smallint("n_seq").notNull(),
    placa: varchar("placa", { length: 7 }).notNull(),
    uf: varchar("uf", { length: 2 }).notNull(),
    rntc: varchar("rntc", { length: 20 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_transport_trailers_seq_unique").on(t.nfeTransportId, t.nSeq),
    check("nfe_transport_trailers_seq_chk", sql`${t.nSeq} >= 1 and ${t.nSeq} <= 5`),
    check(
      "nfe_transport_trailers_uf_chk",
      sql`${t.uf} in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')`,
    ),
  ],
);

/** Volumes transportados. */
export const nfeTransportVolumes = pgTable(
  "nfe_transport_volumes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeTransportId: uuid("nfe_transport_id")
      .notNull()
      .references(() => nfeTransports.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    qVol: integer("q_vol"),
    esp: varchar("esp", { length: 60 }),
    marca: varchar("marca", { length: 60 }),
    nVol: varchar("n_vol", { length: 60 }),
    pesoL: decimal("peso_l", pesoTresCasasDecimais),
    pesoB: decimal("peso_b", pesoTresCasasDecimais),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_transport_volumes_seq_unique").on(t.nfeTransportId, t.nSeq),
    check("nfe_transport_volumes_seq_chk", sql`${t.nSeq} >= 1`),
  ],
);

/** Lacres de cada volume. */
export const nfeTransportVolumeSeals = pgTable(
  "nfe_transport_volume_seals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeTransportVolumeId: uuid("nfe_transport_volume_id")
      .notNull()
      .references(() => nfeTransportVolumes.id, { onDelete: "cascade" }),
    nLacre: varchar("n_lacre", { length: 60 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_transport_volume_seals_unique").on(t.nfeTransportVolumeId, t.nLacre),
  ],
);

/** Documentos referenciados (NFref). */
export const nfeReferences = pgTable(
  "nfe_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeHeaderId: uuid("nfe_header_id")
      .notNull()
      .references(() => nfeHeaders.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    refType: nfeReferenceTypeEnum("ref_type").notNull(),
    refChave: varchar("ref_chave", { length: 44 }),
    cUf: varchar("c_uf", { length: 2 }),
    aamm: varchar("aamm", { length: 4 }),
    cnpj: varchar("cnpj", { length: 14 }),
    cpf: varchar("cpf", { length: 11 }),
    ie: varchar("ie", { length: 14 }),
    mod: varchar("mod", { length: 2 }).references(() => fiscalDocumentModels.code, {
      onDelete: "restrict",
    }),
    serie: varchar("serie", { length: 3 }),
    nNf: integer("n_nf"),
    nEcf: varchar("n_ecf", { length: 3 }),
    nCoo: varchar("n_coo", { length: 6 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_references_header_seq_unique").on(t.nfeHeaderId, t.nSeq),
    check("nfe_references_seq_chk", sql`${t.nSeq} >= 1`),
    check(
      "nfe_references_chave_chk",
      sql`${t.refChave} is null or ${t.refChave} ~ '^[0-9]{44}$'`,
    ),
  ],
);

/** Duplicatas da cobrança (dup). */
export const nfeDuplicates = pgTable(
  "nfe_duplicates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeHeaderId: uuid("nfe_header_id")
      .notNull()
      .references(() => nfeHeaders.id, { onDelete: "cascade" }),
    nDup: varchar("n_dup", { length: 60 }).notNull(),
    dVenc: date("d_venc").notNull(),
    vDup: decimal("v_dup", valorDuasCasasDecimais).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_duplicates_header_ndup_unique").on(t.nfeHeaderId, t.nDup),
  ],
);

/** Responsável técnico gravado na NF-e (infRespTec). */
export const nfeRespTec = pgTable(
  "nfe_resp_tec",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeHeaderId: uuid("nfe_header_id")
      .notNull()
      .references(() => nfeHeaders.id, { onDelete: "cascade" }),
    cnpj: varchar("cnpj", { length: 14 }).notNull(),
    xContato: varchar("x_contato", { length: 60 }).notNull(),
    email: varchar("email", { length: 60 }).notNull(),
    fone: varchar("fone", { length: 14 }).notNull(),
    idCsrt: varchar("id_csrt", { length: 2 }),
    hashCsrt: varchar("hash_csrt", { length: 28 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [uniqueIndex("nfe_resp_tec_header_unique").on(t.nfeHeaderId)],
);

/** Cancelamento, carta de correção e inutilização. */
export const nfeEvents = pgTable(
  "nfe_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }),
    nfeHeaderId: uuid("nfe_header_id").references(() => nfeHeaders.id, {
      onDelete: "cascade",
    }),
    eventType: nfeEventTypeEnum("event_type").notNull(),
    tpEvento: varchar("tp_evento", { length: 6 }),
    nSeqEvento: integer("n_seq_evento").notNull().default(1),
    dhEvento: tz("dh_evento").notNull(),
    descricao: text("descricao"),
    nProt: varchar("n_prot", { length: 15 }),
    cStat: varchar("c_stat", { length: 3 }),
    xMotivo: varchar("x_motivo", { length: 255 }),
    xmlEvento: text("xml_evento"),
    mod: varchar("mod", { length: 2 }).references(() => fiscalDocumentModels.code, {
      onDelete: "restrict",
    }),
    serie: varchar("serie", { length: 3 }),
    ano: varchar("ano", { length: 2 }),
    nNfIni: integer("n_nf_ini"),
    nNfFin: integer("n_nf_fin"),
    chave: varchar("chave", { length: 44 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_events_header_type_seq_unique")
      .on(t.nfeHeaderId, t.eventType, t.nSeqEvento)
      .where(sql`${t.nfeHeaderId} is not null`),
    index("nfe_events_enterprise_idx").on(t.enterpriseId),
    check(
      "nfe_events_header_chk",
      sql`(${t.eventType} = 'INUTILIZACAO' and ${t.nfeHeaderId} is null) or (${t.eventType} <> 'INUTILIZACAO' and ${t.nfeHeaderId} is not null)`,
    ),
    check("nfe_events_seq_chk", sql`${t.nSeqEvento} >= 1 and ${t.nSeqEvento} <= 20`),
    check(
      "nfe_events_chave_chk",
      sql`${t.chave} is null or ${t.chave} ~ '^[0-9]{44}$'`,
    ),
  ],
);

/** Local de retirada ou de entrega (grupos retirada e entrega). */
export const nfePlaces = pgTable( // retira e entrega
  "nfe_places",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeHeaderId: uuid("nfe_header_id")
      .notNull()
      .references(() => nfeHeaders.id, { onDelete: "cascade" }),
    placeType: nfePlaceTypeEnum("place_type").notNull(), // retira ou entrega
    cnpj: varchar("cnpj", { length: 14 }), // CNPJ do destinatário
    cpf: varchar("cpf", { length: 11 }), // CPF do destinatário
    xNome: varchar("x_nome", { length: 60 }), // Nome do destinatário
    xlgr: varchar("xlgr", { length: 60 }).notNull(), // Logradouro do destinatário
    nro: varchar("nro", { length: 60 }).notNull(), // Número do destinatário
    xcpl: varchar("xcpl", { length: 60 }), // Complemento do destinatário
    xbairro: varchar("xbairro", { length: 60 }).notNull(), // Bairro do destinatário
    cmun: varchar("cmun", { length: 7 }).notNull(), // Código do município do destinatário
    xmun: varchar("xmun", { length: 60 }).notNull(), // Nome do município do destinatário
    uf: varchar("uf", { length: 2 }).notNull(), // UF do destinatário
    cep: varchar("cep", { length: 8 }), // CEP do destinatário
    cpais: varchar("cpais", { length: 4 }), // Código do país do destinatário
    xpais: varchar("xpais", { length: 60 }), // Nome do país do destinatário
    fone: varchar("fone", { length: 14 }), // Telefone do destinatário
    email: varchar("email", { length: 60 }), // Email do destinatário
    ie: varchar("ie", { length: 14 }), // Inscrição Estadual do destinatário
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_places_header_type_unique").on(t.nfeHeaderId, t.placeType),
    check(
      "nfe_places_doc_chk",
      sql`(${t.cnpj} is not null and ${t.cpf} is null) or (${t.cnpj} is null and ${t.cpf} is not null)`,
    ),
    check(
      "nfe_places_uf_chk",
      sql`${t.uf} in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')`,
    ),
  ],
);

/** Detalhe de exportação do item (detExport). */
export const nfeItemExports = pgTable(
  "nfe_item_exports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemId: uuid("nfe_item_id")
      .notNull()
      .references(() => nfeItems.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    nDraw: varchar("n_draw", { length: 11 }),
    nRe: varchar("n_re", { length: 12 }),
    chNfe: varchar("ch_nfe", { length: 44 }),
    qExport: decimal("q_export", valorQuatroCasasDecimais),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_item_exports_item_seq_unique").on(t.nfeItemId, t.nSeq),
    check("nfe_item_exports_seq_chk", sql`${t.nSeq} >= 1`),
    check(
      "nfe_item_exports_ind_chk",
      sql`(${t.nRe} is null and ${t.chNfe} is null and ${t.qExport} is null) or (${t.nRe} is not null and ${t.chNfe} is not null and ${t.qExport} is not null)`,
    ),
    check(
      "nfe_item_exports_chave_chk",
      sql`${t.chNfe} is null or ${t.chNfe} ~ '^[0-9]{44}$'`,
    ),
  ],
);

/** Declaração de importação do item (DI). */
export const nfeItemImports = pgTable(
  "nfe_item_imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemId: uuid("nfe_item_id")
      .notNull()
      .references(() => nfeItems.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    nDi: varchar("n_di", { length: 15 }).notNull(),
    dDi: date("d_di", { mode: "date" }).notNull(),
    xLocDesemb: varchar("x_loc_desemb", { length: 60 }).notNull(),
    ufDesemb: varchar("uf_desemb", { length: 2 }).notNull(),
    dDesemb: date("d_desemb", { mode: "date" }).notNull(),
    tpViaTransp: varchar("tp_via_transp", { length: 2 }).notNull(),
    vAfrmm: decimal("v_afrmm", valorDuasCasasDecimais),
    tpIntermedio: varchar("tp_intermedio", { length: 1 }).notNull(),
    cnpj: varchar("cnpj", { length: 14 }),
    ufTerceiro: varchar("uf_terceiro", { length: 2 }),
    cExportador: varchar("c_exportador", { length: 60 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_item_imports_item_seq_unique").on(t.nfeItemId, t.nSeq),
    check("nfe_item_imports_seq_chk", sql`${t.nSeq} >= 1`),
    check(
      "nfe_item_imports_tp_via_transp_chk",
      sql`${t.tpViaTransp} in ('1','2','3','4','5','6','7','8','9','10','11','12','13')`,
    ),
    check("nfe_item_imports_tp_intermedio_chk", sql`${t.tpIntermedio} in ('1', '2', '3')`),
    check(
      "nfe_item_imports_uf_desemb_chk",
      sql`${t.ufDesemb} in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')`,
    ),
    check(
      "nfe_item_imports_uf_terceiro_chk",
      sql`${t.ufTerceiro} is null or ${t.ufTerceiro} in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')`,
    ),
  ],
);

/** Adições da declaração de importação (adi). */
export const nfeItemImportAdditions = pgTable(
  "nfe_item_import_additions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemImportId: uuid("nfe_item_import_id")
      .notNull()
      .references(() => nfeItemImports.id, { onDelete: "cascade" }),
    nAdicao: integer("n_adicao").notNull(),
    nSeqAdic: integer("n_seq_adic").notNull(),
    cFabricante: varchar("c_fabricante", { length: 60 }).notNull(),
    vDescDi: decimal("v_desc_di", valorDuasCasasDecimais),
    nDraw: varchar("n_draw", { length: 11 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_item_import_additions_seq_unique").on(
      t.nfeItemImportId,
      t.nAdicao,
      t.nSeqAdic,
    ),
    check("nfe_item_import_additions_n_adicao_chk", sql`${t.nAdicao} >= 1 and ${t.nAdicao} <= 999`),
    check("nfe_item_import_additions_n_seq_chk", sql`${t.nSeqAdic} >= 1 and ${t.nSeqAdic} <= 999`),
  ],
);

/** Combustível do item (grupo comb), um por item. */
export const nfeItemFuels = pgTable(
  "nfe_item_fuels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemId: uuid("nfe_item_id")
      .notNull()
      .references(() => nfeItems.id, { onDelete: "cascade" }), // Item da nota fiscal
    cProdAnp: varchar("c_prod_anp", { length: 9 }).notNull(), // Código do produto ANP
    descAnp: varchar("desc_anp", { length: 95 }).notNull(), // Descrição do produto ANP 
    pGlp: decimal("p_glp", valorQuatroCasasDecimais), // Percentual de GLP
    pGnn: decimal("p_gnn", valorQuatroCasasDecimais), // Percentual de GLN  
    pGni: decimal("p_gni", valorQuatroCasasDecimais), // Percentual de GNI
    vPart: decimal("v_part", valorDuasCasasDecimais), // Valor do produto
    codif: varchar("codif", { length: 21 }), // Código do produto 
    qTemp: decimal("q_temp", valorQuatroCasasDecimais), // Quantidade de temperatura
    ufCons: varchar("uf_cons", { length: 2 }).notNull(), // UF de consumo
    cideQBcProd: decimal("cide_q_bc_prod", valorQuatroCasasDecimais), // CIDE de quantidade base de produto
    cideVAliqProd: decimal("cide_v_aliq_prod", valorQuatroCasasDecimais), // CIDE de valor base de produto
    cideVCide: decimal("cide_v_cide", valorDuasCasasDecimais), // CIDE de valor do produto
    pBio: decimal("p_bio", valorQuatroCasasDecimais), // Percentual de biodiesel
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_item_fuels_item_unique").on(t.nfeItemId),
    check("nfe_item_fuels_c_prod_anp_chk", sql`${t.cProdAnp} ~ '^[0-9]{9}$'`),
    check(
      "nfe_item_fuels_uf_cons_chk",
      sql`${t.ufCons} in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')`,
    ),
    check(
      "nfe_item_fuels_cide_chk",
      sql`(${t.cideQBcProd} is null and ${t.cideVAliqProd} is null and ${t.cideVCide} is null) or (${t.cideQBcProd} is not null and ${t.cideVAliqProd} is not null and ${t.cideVCide} is not null)`,
    ),
  ],
);

/** Encerrantes do abastecimento. */
export const nfeItemFuelNozzles = pgTable(
  "nfe_item_fuel_nozzles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemFuelId: uuid("nfe_item_fuel_id")
      .notNull()
      .references(() => nfeItemFuels.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    nBico: integer("n_bico").notNull(),
    nBomba: integer("n_bomba"),
    nTanque: integer("n_tanque").notNull(),
    vEncIni: decimal("v_enc_ini", pesoTresCasasDecimais).notNull(),
    vEncFin: decimal("v_enc_fin", pesoTresCasasDecimais).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_item_fuel_nozzles_seq_unique").on(t.nfeItemFuelId, t.nSeq),
    check("nfe_item_fuel_nozzles_seq_chk", sql`${t.nSeq} >= 1`),
  ],
);

/** Origem do combustível (origComb). */
export const nfeItemFuelOrigins = pgTable(  
  "nfe_item_fuel_origins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemFuelId: uuid("nfe_item_fuel_id")
      .notNull()
      .references(() => nfeItemFuels.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    indImport: varchar("ind_import", { length: 1 }).notNull(),
    cUfOrig: varchar("c_uf_orig", { length: 2 }).notNull(),
    pOrig: decimal("p_orig", valorQuatroCasasDecimais).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_item_fuel_origins_seq_unique").on(t.nfeItemFuelId, t.nSeq),
    check("nfe_item_fuel_origins_seq_chk", sql`${t.nSeq} >= 1 and ${t.nSeq} <= 30`),
    check("nfe_item_fuel_origins_ind_import_chk", sql`${t.indImport} in ('0', '1')`),
    check(
      "nfe_item_fuel_origins_c_uf_orig_chk",
      sql`${t.cUfOrig} in ('11','12','13','14','15','16','17','21','22','23','24','25','26','27','28','29','31','32','33','35','41','42','43','50','51','52','53')`,
    ),
  ],
);

/** Notas de pagamento antecipado (gPagAntecipado). */
export const nfeAdvancePayments = pgTable(
  "nfe_advance_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeHeaderId: uuid("nfe_header_id")
      .notNull()
      .references(() => nfeHeaders.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    refNfe: varchar("ref_nfe", { length: 44 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_advance_payments_header_seq_unique").on(t.nfeHeaderId, t.nSeq),
    check("nfe_advance_payments_seq_chk", sql`${t.nSeq} >= 1 and ${t.nSeq} <= 100`),
    check("nfe_advance_payments_ref_nfe_chk", sql`${t.refNfe} ~ '^[0-9]{44}$'`),
  ],
);

/** Observações do contribuinte e do fisco (obsCont e obsFisco). */
export const nfeAdditionalNotes = pgTable(
  "nfe_additional_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeHeaderId: uuid("nfe_header_id")
      .notNull()
      .references(() => nfeHeaders.id, { onDelete: "cascade" }),
    noteType: nfeAdditionalNoteTypeEnum("note_type").notNull(),
    nSeq: integer("n_seq").notNull(),
    xCampo: varchar("x_campo", { length: 20 }).notNull(),
    xTexto: varchar("x_texto", { length: 60 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_additional_notes_header_type_seq_unique").on(
      t.nfeHeaderId,
      t.noteType,
      t.nSeq,
    ),
    check("nfe_additional_notes_seq_chk", sql`${t.nSeq} >= 1 and ${t.nSeq} <= 10`),
  ],
);

/** Processos referenciados (procRef). */
export const nfeReferencedProcesses = pgTable(
  "nfe_referenced_processes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeHeaderId: uuid("nfe_header_id")
      .notNull()
      .references(() => nfeHeaders.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    nProc: varchar("n_proc", { length: 60 }).notNull(),
    indProc: varchar("ind_proc", { length: 1 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_referenced_processes_header_seq_unique").on(t.nfeHeaderId, t.nSeq),
    check("nfe_referenced_processes_seq_chk", sql`${t.nSeq} >= 1 and ${t.nSeq} <= 100`),
    check("nfe_referenced_processes_ind_proc_chk", sql`${t.indProc} in ('0', '1', '2', '3', '9')`),
  ],
);

/** Rastreabilidade do item (rastro). */
export const nfeItemTracks = pgTable(
  "nfe_item_tracks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemId: uuid("nfe_item_id")
      .notNull()
      .references(() => nfeItems.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    nLote: varchar("n_lote", { length: 20 }).notNull(),
    qLote: decimal("q_lote", pesoTresCasasDecimais).notNull(),
    dFab: date("d_fab", { mode: "date" }).notNull(),
    dVal: date("d_val", { mode: "date" }).notNull(),
    cAgreg: varchar("c_agreg", { length: 20 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_item_tracks_item_seq_unique").on(t.nfeItemId, t.nSeq),
    check("nfe_item_tracks_seq_chk", sql`${t.nSeq} >= 1 and ${t.nSeq} <= 500`),
  ],
);

/** Medicamento do item (med). */
export const nfeItemMedicines = pgTable(
  "nfe_item_medicines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemId: uuid("nfe_item_id")
      .notNull()
      .references(() => nfeItems.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    cProdAnvisa: varchar("c_prod_anvisa", { length: 13 }).notNull(),
    xMotivoIsencao: varchar("x_motivo_isencao", { length: 255 }),
    vPmc: decimal("v_pmc", valorDuasCasasDecimais).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_item_medicines_item_seq_unique").on(t.nfeItemId, t.nSeq),
    check("nfe_item_medicines_seq_chk", sql`${t.nSeq} >= 1 and ${t.nSeq} <= 500`),
  ],
);

/** Arma do item (arma). */
export const nfeItemWeapons = pgTable(
  "nfe_item_weapons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemId: uuid("nfe_item_id")
      .notNull()
      .references(() => nfeItems.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    tpArma: varchar("tp_arma", { length: 1 }).notNull(),
    nSerie: varchar("n_serie", { length: 15 }).notNull(),
    nCano: varchar("n_cano", { length: 15 }).notNull(),
    descr: varchar("descr", { length: 256 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_item_weapons_item_seq_unique").on(t.nfeItemId, t.nSeq),
    check("nfe_item_weapons_seq_chk", sql`${t.nSeq} >= 1 and ${t.nSeq} <= 500`),
    check("nfe_item_weapons_tp_arma_chk", sql`${t.tpArma} in ('0', '1')`),
  ],
);

/** Veículo novo do item (veicProd), um por item. */
export const nfeItemVehicles = pgTable(
  "nfe_item_vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemId: uuid("nfe_item_id")
      .notNull()
      .references(() => nfeItems.id, { onDelete: "cascade" }),
    tpOp: varchar("tp_op", { length: 1 }).notNull(),
    chassi: varchar("chassi", { length: 17 }).notNull(),
    cCor: varchar("c_cor", { length: 4 }).notNull(),
    xCor: varchar("x_cor", { length: 40 }).notNull(),
    pot: varchar("pot", { length: 4 }).notNull(),
    cilin: varchar("cilin", { length: 4 }).notNull(),
    pesoL: varchar("peso_l", { length: 9 }).notNull(),
    pesoB: varchar("peso_b", { length: 9 }).notNull(),
    nSerie: varchar("n_serie", { length: 9 }).notNull(),
    tpComb: varchar("tp_comb", { length: 2 }).notNull(),
    nMotor: varchar("n_motor", { length: 21 }).notNull(),
    cmt: varchar("cmt", { length: 9 }).notNull(),
    dist: varchar("dist", { length: 4 }).notNull(),
    anoMod: varchar("ano_mod", { length: 4 }).notNull(),
    anoFab: varchar("ano_fab", { length: 4 }).notNull(),
    tpPint: varchar("tp_pint", { length: 1 }).notNull(),
    tpVeic: varchar("tp_veic", { length: 2 }).notNull(),
    espVeic: varchar("esp_veic", { length: 1 }).notNull(),
    vin: varchar("vin", { length: 1 }).notNull(),
    condVeic: varchar("cond_veic", { length: 1 }).notNull(),
    cMod: varchar("c_mod", { length: 6 }).notNull(),
    cCorDenatran: varchar("c_cor_denatran", { length: 2 }).notNull(),
    lota: integer("lota").notNull(),
    tpRest: varchar("tp_rest", { length: 1 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_item_vehicles_item_unique").on(t.nfeItemId),
    check("nfe_item_vehicles_tp_op_chk", sql`${t.tpOp} in ('0', '1', '2', '3')`),
    check("nfe_item_vehicles_vin_chk", sql`${t.vin} in ('R', 'N')`),
    check("nfe_item_vehicles_cond_veic_chk", sql`${t.condVeic} in ('1', '2', '3')`),
    check("nfe_item_vehicles_tp_rest_chk", sql`${t.tpRest} in ('0', '1', '2', '3', '4', '9')`),
  ],
);

/** Nomenclatura de valor aduaneiro e estatística (NVE), até 8 por item. */
export const nfeItemNves = pgTable(
  "nfe_item_nves",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemId: uuid("nfe_item_id")
      .notNull()
      .references(() => nfeItems.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    nve: varchar("nve", { length: 6 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_item_nves_item_seq_unique").on(t.nfeItemId, t.nSeq),
    check("nfe_item_nves_seq_chk", sql`${t.nSeq} >= 1 and ${t.nSeq} <= 8`),
  ],
);

/** Crédito presumido de ICMS do item (gCred), até 4 por item. */
export const nfeItemPresumedCredits = pgTable(
  "nfe_item_presumed_credits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nfeItemId: uuid("nfe_item_id")
      .notNull()
      .references(() => nfeItems.id, { onDelete: "cascade" }),
    nSeq: integer("n_seq").notNull(),
    cCredPresumido: varchar("c_cred_presumido", { length: 10 }).notNull(),
    pCredPresumido: decimal("p_cred_presumido", valorQuatroCasasDecimais).notNull(),
    vCredPresumido: decimal("v_cred_presumido", valorDuasCasasDecimais).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("nfe_item_presumed_credits_item_seq_unique").on(t.nfeItemId, t.nSeq),
    check("nfe_item_presumed_credits_seq_chk", sql`${t.nSeq} >= 1 and ${t.nSeq} <= 4`),
  ],
);



