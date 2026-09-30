import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const flag = z.enum(["0", "1"]).default("0");

export const createCstIbsCbsSchema = z
  .object({
    status: z.boolean().default(true),
    cst: z.string().trim().regex(/^[0-9]{3}$/, "CST IBS/CBS deve ter 3 digitos"),
    description: z.string().trim().min(1).max(255),
    ind_gIBSCBS: flag,
    ind_gIBSCBSMono: flag,
    ind_gRED: flag,
    ind_gDif: flag,
    ind_gTransfCred: flag,
    ind_gCredPresIBSZFM: flag,
    ind_gAjusteCompet: flag,
    ind_RedutorBC: flag,
  })
  .strict();

const optionalFlag = z.enum(["0", "1"]).optional();

export const patchCstIbsCbsSchema = z
  .object({
    status: z.boolean().optional(),
    cst: z
      .string()
      .trim()
      .regex(/^[0-9]{3}$/, "CST IBS/CBS deve ter 3 digitos")
      .optional(),
    description: z.string().trim().min(1).max(255).optional(),
    ind_gIBSCBS: optionalFlag,
    ind_gIBSCBSMono: optionalFlag,
    ind_gRED: optionalFlag,
    ind_gDif: optionalFlag,
    ind_gTransfCred: optionalFlag,
    ind_gCredPresIBSZFM: optionalFlag,
    ind_gAjusteCompet: optionalFlag,
    ind_RedutorBC: optionalFlag,
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Deve haver ao menos um campo para atualizar",
  });

export const cstIbsCbsParamsSchema = z
  .object({ cstIbsCbsId: uuidSchema("cstIbsCbsId") })
  .strict();

export type CreateCstIbsCbsInput = z.infer<typeof createCstIbsCbsSchema>;
export type PatchCstIbsCbsInput = z.infer<typeof patchCstIbsCbsSchema>;
