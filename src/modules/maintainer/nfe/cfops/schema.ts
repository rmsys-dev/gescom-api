import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const cfopCode = z.string().trim().regex(/^[0-9]{4}$/, "CFOP deve ter 4 digitos");
const moviment = z.enum(["ENTRADA", "SAIDA", "TRANSFERENCIA", "DEVOLUCAO"]);

export const createCfopSchema = z
  .object({
    cfop: cfopCode,
    description: z.string().trim().min(1).max(255),
    generateRevenue: z.boolean().default(false),
    issuedNfce: z.boolean().default(false),
    movimentType: moviment,
    cfopForFuels: z.boolean().default(false),
  })
  .strict();

export const patchCfopSchema = z
  .object({
    cfop: cfopCode.optional(),
    description: z.string().trim().min(1).max(255).optional(),
    generateRevenue: z.boolean().optional(),
    issuedNfce: z.boolean().optional(),
    movimentType: moviment.optional(),
    cfopForFuels: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Deve haver ao menos um campo para atualizar",
  });

export const cfopParamsSchema = z
  .object({ cfopId: uuidSchema("cfopId") })
  .strict();

export type CreateCfopInput = z.infer<typeof createCfopSchema>;
export type PatchCfopInput = z.infer<typeof patchCfopSchema>;
