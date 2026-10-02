import { z } from "zod";
import {
  createPaginationQuerySchema,
  optionalTrimmedStringSchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";

const money = z.number().finite();
const optionalMoney = money.optional();
const origin = z.enum(["0", "1", "2", "3", "4", "5", "6", "7", "8"]);

export const nfeIdParamsSchema = z
  .object({ nfeId: uuidSchema("nfeId") })
  .strict();

const partyFields = {
  cnpj: z.string().trim().max(14).optional(),
  cpf: z.string().trim().max(11).optional(),
  xNome: z.string().trim().max(60).optional(),
  xFant: z.string().trim().max(60).optional(),
  ie: z.string().trim().max(14).optional(),
  isuf: z.string().trim().regex(/^[0-9]{8,9}$/).optional(),
  crt: z.string().trim().max(1).optional(),
  indIeDest: z.string().trim().max(1).optional(),
  email: z.string().trim().max(60).optional(),
  xlgr: z.string().trim().max(60).optional(),
  nro: z.string().trim().max(60).optional(),
  xcpl: z.string().trim().max(60).optional(),
  xbairro: z.string().trim().max(60).optional(),
  cmun: z.string().trim().max(7).optional(),
  xmun: z.string().trim().max(60).optional(),
  uf: z.string().trim().max(2).optional(),
  cep: z.string().trim().max(8).optional(),
  cpais: z.string().trim().max(4).optional(),
  xpais: z.string().trim().max(60).optional(),
  fone: z.string().trim().max(14).optional(),
};

const nfeHeaderSchema = z
  .object({
    chave: z.string().regex(/^[0-9]{44}$/, "Chave deve ter 44 digitos"),
    cUf: z.string().trim().length(2),
    cNf: z.string().regex(/^[0-9]{8}$/, "cNF deve ter 8 digitos"),
    natOp: z.string().trim().max(60).optional(),
    nfeOperationsId: uuidSchema("nfeOperationsId").optional(),
    mod: z.enum(["55", "65"]),
    serie: z.string().trim().regex(/^[0-9]{1,3}$/),
    nNf: z.number().int().min(1).max(999999999).optional(),
    dhEmi: z.string().min(1),
    tpNf: z.string().trim().max(1).optional(),
    idDest: z.string().trim().max(1).optional(),
    cMunFg: z.number().int(),
    tpImp: z.string().trim().max(1).optional(),
    tpEmis: z.number().int().default(1),
    cDv: z.string().trim().length(1).optional(),
    tpAmb: z.union([z.literal(1), z.literal(2)]).default(2),
    finNfe: z.string().trim().max(1).optional(),
    indFinal: z.string().trim().max(1).optional(),
    indPres: z.string().trim().max(1).optional(),
    procEmi: z.string().trim().max(1).optional(),
    verProc: z.string().trim().max(20).optional(),
    moviments: z.enum(["ENTRADA", "SAIDA"]).default("SAIDA"),
    issuanceType: z.enum(["PROPRIA", "TERCEIRO"]).default("PROPRIA"),
    infCpl: z.string().trim().max(5000).optional(),
    emit: z.object(partyFields).strict().optional(),
    dest: z.object(partyFields).strict().optional(),
  })
  .strict();

const taxSchema = z
  .object({
    icmsOrig: origin.optional(),
    icmsCst: z.string().regex(/^[0-9]{2}$/).optional(),
    icmsCsosn: z.string().regex(/^[0-9]{3}$/).optional(),
    icmsModBc: z.string().max(1).optional(),
    pIcms: optionalMoney,
    pFcp: optionalMoney,
    pRedBc: optionalMoney,
    motDesIcms: z.string().regex(/^[0-9]{1,2}$/).optional(),
    indDeduzDeson: z.enum(["0", "1"]).optional(),
    pMvaSt: optionalMoney,
    pRedBcSt: optionalMoney,
    pIcmsSt: optionalMoney,
    pIcmsUfDest: optionalMoney,
    pIcmsInter: optionalMoney,
    pIcmsInterPart: optionalMoney,
    pFcpUfDest: optionalMoney,
    difalCalculation: z.enum(["1", "2"]).optional(),
    qBcMono: optionalMoney,
    adRemIcms: optionalMoney,
    ipiCst: z.string().regex(/^[0-9]{2}$/).optional(),
    pIpi: optionalMoney,
    qUnidIpi: optionalMoney,
    vUnidIpi: optionalMoney,
    pisCst: z.string().regex(/^[0-9]{2}$/).optional(),
    pPis: optionalMoney,
    qBcProdPis: optionalMoney,
    vAliqProdPis: optionalMoney,
    cofinsCst: z.string().regex(/^[0-9]{2}$/).optional(),
    pCofins: optionalMoney,
    qBcProdCofins: optionalMoney,
    vAliqProdCofins: optionalMoney,
    pIssqn: optionalMoney,
    vBcIssqn: optionalMoney,
    pIs: optionalMoney,
    vBcIs: optionalMoney,
    vBcIbsCbs: optionalMoney,
    pIbsUf: optionalMoney,
    pRedIbsUf: optionalMoney,
    pIbsMun: optionalMoney,
    pRedIbsMun: optionalMoney,
    pCbs: optionalMoney,
    pRedCbs: optionalMoney,
    classificationIbsCbsId: uuidSchema("classificationIbsCbsId").optional(),
  })
  .strict();

const itemSchema = z
  .object({
    productsEnterprisesId: uuidSchema("productsEnterprisesId"),
    nItem: z.number().int().min(1),
    cProd: z.string().trim().max(60).optional(),
    cEan: z.string().trim().max(14).optional(),
    xProd: z.string().trim().min(1).max(120),
    ncm: z.string().trim().max(8).optional(),
    cBenef: z.string().trim().max(10).optional(),
    anexoRtId: uuidSchema("anexoRtId").optional(),
    cfop: z.string().trim().regex(/^[0-9]{4}$/).optional(),
    uCom: z.string().trim().max(6).optional(),
    qCom: optionalMoney,
    vUnCom: optionalMoney,
    vProd: optionalMoney,
    uTrib: z.string().trim().max(6).optional(),
    qTrib: optionalMoney,
    vUnTrib: optionalMoney,
    vFrete: optionalMoney,
    vSeg: optionalMoney,
    vDesc: optionalMoney,
    vOutro: optionalMoney,
    indTot: z.string().max(1).optional(),
    tax: taxSchema.optional(),
  })
  .strict();

export const replaceNfeItemsSchema = z
  .object({ items: z.array(itemSchema).min(1) })
  .strict();

export const recalculateNfeItemsSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productsEnterprisesId: uuidSchema("productsEnterprisesId"),
            qCom: money.positive(),
            vUnCom: money.positive().optional(),
            vDesc: money.nonnegative().optional(),
            vFrete: money.nonnegative().optional(),
            vSeg: money.nonnegative().optional(),
            vOutro: money.nonnegative().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(990),
    nfeOperationsId: uuidSchema("nfeOperationsId").optional(),
  })
  .strict();

const uf = z.string().trim().regex(/^[A-Z]{2}$/, "UF deve ter 2 letras");

export const replaceNfeTransportSchema = z
  .object({
    modFrete: z.enum(["0", "1", "2", "3", "4", "9"]),
    cnpj: z.string().regex(/^[0-9]{14}$/).optional(),
    cpf: z.string().regex(/^[0-9]{11}$/).optional(),
    xNome: z.string().trim().max(60).optional(),
    ie: z.string().regex(/^[0-9]{2,14}$/, "IE do transportador deve ter de 2 a 14 digitos").optional(),
    xEnder: z.string().trim().max(60).optional(),
    xMun: z.string().trim().max(60).optional(),
    uf: uf.optional(),
    veicPlaca: z.string().regex(/^[A-Z0-9]{7}$/, "Placa deve ter 7 letras ou numeros").optional(),
    veicUf: uf.optional(),
    veicRntc: z.string().trim().max(20).optional(),
    volumes: z
      .array(
        z
          .object({
            qVol: z.number().int().min(0).max(999999999999999).optional(),
            esp: z.string().trim().max(60).optional(),
            marca: z.string().trim().max(60).optional(),
            nVol: z.string().trim().max(60).optional(),
            pesoL: money.nonnegative().optional(),
            pesoB: money.nonnegative().optional(),
          })
          .strict(),
      )
      .max(10)
      .default([]),
  })
  .strict()
  .refine((data) => !(data.cnpj && data.cpf), {
    message: "Informe CNPJ ou CPF do transportador, nao ambos",
  });

const paymentSchema = z
  .object({
    paymentTypeId: uuidSchema("paymentTypeId"),
    nSeq: z.number().int().min(1),
    indPag: z.string().max(1).optional(),
    tPag: z.string().max(2).optional(),
    xPag: z.string().max(60).optional(),
    vPag: optionalMoney,
    cardTpIntegra: z.string().max(1).optional(),
    cardCnpj: z.string().max(14).optional(),
    cardTBand: z.string().max(2).optional(),
    cardCAut: z.string().max(128).optional(),
  })
  .strict();

export const replaceNfePaymentsSchema = z
  .object({ payments: z.array(paymentSchema).min(1) })
  .strict();

export const createNfeSchema = nfeHeaderSchema
  .extend({
    items: z.array(itemSchema).min(1),
    payments: z.array(paymentSchema).min(1),
  })
  .strict();

export const patchNfeSchema = nfeHeaderSchema
  .partial()
  .extend({ dhSaiEnt: z.string().min(1).nullable().optional() })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Deve haver ao menos um campo para atualizar",
  });

export const linkCfopEnterpriseSchema = z
  .object({
    cfopId: uuidSchema("cfopId"),
    additionCfop: z.string().trim().optional(),
    editDescription: z.boolean().default(false),
    calculatesDifal: z.boolean().default(false),
  })
  .strict();

export const createNfeFromSalesSchema = z
  .object({
    mod: z.enum(["55", "65"]),
    memberId: uuidSchema("memberId"),
    saleIds: z.array(uuidSchema("saleId")).min(1),
    nfeOperationsId: uuidSchema("nfeOperationsId").optional(),
    paymentTypeId: uuidSchema("paymentTypeId").optional(),
  })
  .strict();

export const listNfeQuerySchema = createPaginationQuerySchema(100).extend({
  search: optionalTrimmedStringSchema("search", 60).optional(),
  mod: z.enum(["55", "65"]).optional(),
  status: z
    .enum(["PENDENTE", "ASSINADA", "AUTORIZADA", "REJEITADA", "CANCELADA", "DENEGADA"])
    .optional(),
});

export type ListNfeQuery = z.infer<typeof listNfeQuerySchema>;
export type CreateNfeInput = z.infer<typeof createNfeSchema>;
export type CreateNfeFromSalesInput = z.infer<typeof createNfeFromSalesSchema>;
export type PatchNfeInput = z.infer<typeof patchNfeSchema>;
export type ReplaceNfeItemsInput = z.infer<typeof replaceNfeItemsSchema>;
export type RecalculateNfeItemsInput = z.infer<typeof recalculateNfeItemsSchema>;
export type ReplaceNfeTransportInput = z.infer<typeof replaceNfeTransportSchema>;
export type ReplaceNfePaymentsInput = z.infer<typeof replaceNfePaymentsSchema>;
export type LinkCfopEnterpriseInput = z.infer<typeof linkCfopEnterpriseSchema>;
