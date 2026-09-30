import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const flag = z.enum(["0", "1"]).default("0");
const optionalFlag = z.enum(["0", "1"]).optional();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser AAAA-MM-DD");

const cClassTribRegular = z
  .string()
  .trim()
  .regex(/^[0-9]{6}$/, "cClassTribRegular deve ter 6 digitos");

const requiredFields = {
  cstIbsCbsId: uuidSchema("cstIbsCbsId"),
  cClassTrib: z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, "cClassTrib deve ter 6 digitos"),
  nameClassTrib: z.string().trim().min(1).max(255),
  descriptionClassTrib: z.string().trim().min(1),
};

const flags = {
  ind_gTribRegular: flag,
  ind_gCredPresOper: flag,
  ind_gMonoPadrao: flag,
  indMonoReten: flag,
  indMonoRet: flag,
  indMonoDif: flag,
  ind_gEstornoCred: flag,
  credito_para: flag,
  indNFeABI: flag,
  indNfe: flag,
  indNfce: flag,
  indCte: flag,
  indCTeOS: flag,
  indBPe: flag,
  indBPeTA: flag,
  indBPeTM: flag,
  indNF3e: flag,
  indNFse: flag,
  indNFSe_Via: flag,
  indNFCom: flag,
  indNFAg: flag,
  indNFGas: flag,
  indDere: flag,
};

export const createClassificationIbsCbsSchema = z
  .object({
    ...requiredFields,
    lcRedacao: z.string().trim().optional(),
    lc_214_25: z.string().trim().max(255).optional(),
    pRedIbs: z.number().nonnegative().optional(),
    pRedCbs: z.number().nonnegative().optional(),
    dIniVig: isoDate.optional(),
    dFimVig: isoDate.optional(),
    updateDate: isoDate.optional(),
    cClassTribRegular: cClassTribRegular.optional(),
    ...flags,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.ind_gTribRegular === "1" && !data.cClassTribRegular) {
      ctx.addIssue({
        code: "custom",
        path: ["cClassTribRegular"],
        message: "cClassTribRegular e obrigatorio quando ind_gTribRegular = 1",
      });
    }
    if (data.ind_gTribRegular === "0" && data.cClassTribRegular) {
      ctx.addIssue({
        code: "custom",
        path: ["cClassTribRegular"],
        message: "cClassTribRegular so e aceito quando ind_gTribRegular = 1",
      });
    }
  });

export const patchClassificationIbsCbsSchema = z
  .object({
    cstIbsCbsId: uuidSchema("cstIbsCbsId").optional(),
    cClassTrib: requiredFields.cClassTrib.optional(),
    nameClassTrib: z.string().trim().min(1).max(255).optional(),
    descriptionClassTrib: z.string().trim().min(1).optional(),
    lcRedacao: z.string().trim().nullable().optional(),
    lc_214_25: z.string().trim().max(255).nullable().optional(),
    pRedIbs: z.number().nonnegative().nullable().optional(),
    pRedCbs: z.number().nonnegative().nullable().optional(),
    dIniVig: isoDate.nullable().optional(),
    dFimVig: isoDate.nullable().optional(),
    updateDate: isoDate.nullable().optional(),
    cClassTribRegular: cClassTribRegular.nullable().optional(),
    ind_gTribRegular: optionalFlag,
    ind_gCredPresOper: optionalFlag,
    ind_gMonoPadrao: optionalFlag,
    indMonoReten: optionalFlag,
    indMonoRet: optionalFlag,
    indMonoDif: optionalFlag,
    ind_gEstornoCred: optionalFlag,
    credito_para: optionalFlag,
    indNFeABI: optionalFlag,
    indNfe: optionalFlag,
    indNfce: optionalFlag,
    indCte: optionalFlag,
    indCTeOS: optionalFlag,
    indBPe: optionalFlag,
    indBPeTA: optionalFlag,
    indBPeTM: optionalFlag,
    indNF3e: optionalFlag,
    indNFse: optionalFlag,
    indNFSe_Via: optionalFlag,
    indNFCom: optionalFlag,
    indNFAg: optionalFlag,
    indNFGas: optionalFlag,
    indDere: optionalFlag,
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Deve haver ao menos um campo para atualizar",
  });

export const classificationParamsSchema = z
  .object({ classificationId: uuidSchema("classificationId") })
  .strict();

export type CreateClassificationInput = z.infer<
  typeof createClassificationIbsCbsSchema
>;
export type PatchClassificationInput = z.infer<
  typeof patchClassificationIbsCbsSchema
>;
