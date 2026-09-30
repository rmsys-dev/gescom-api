import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const regime = z.enum(["1", "2", "3", "4"]);
const taxation = z.enum(["1", "2", "3", "4"]);
const origin = z.enum(["0", "1", "2", "3", "4", "5", "6", "7", "8"]);
const cst = z.string().trim().regex(/^[0-9]{2,3}$/, "CST deve ter 2 ou 3 digitos");

export const cstLengthMessage = (regimeTributario: string): string =>
  regimeTributario === "3"
    ? "Para CRT 3 o CST deve ter 2 digitos"
    : "Para CRT diferente de 3 o CSOSN deve ter 3 digitos";

export const isCstValidForRegime = (regimeTributario: string, value: string): boolean =>
  regimeTributario === "3" ? /^[0-9]{2}$/.test(value) : /^[0-9]{3}$/.test(value);

export const createCstSchema = z
  .object({
    regimeTributario: regime,
    origin,
    cst,
    description: z.string().trim().min(1).max(255),
    allowsCredit: z.boolean().default(false),
    featuresReduction: z.boolean().default(false),
    withheldTax: z.boolean().default(false),
    taxationType: taxation.default("1"),
    observation: z.string().trim().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!isCstValidForRegime(data.regimeTributario, data.cst)) {
      ctx.addIssue({
        code: "custom",
        path: ["cst"],
        message: cstLengthMessage(data.regimeTributario),
      });
    }
  });

export const patchCstSchema = z
  .object({
    regimeTributario: regime.optional(),
    origin: origin.optional(),
    cst: cst.optional(),
    description: z.string().trim().min(1).max(255).optional(),
    allowsCredit: z.boolean().optional(),
    featuresReduction: z.boolean().optional(),
    withheldTax: z.boolean().optional(),
    taxationType: taxation.optional(),
    observation: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Deve haver ao menos um campo para atualizar",
  });

export const cstParamsSchema = z
  .object({ cstId: uuidSchema("cstId") })
  .strict();

export type CreateCstInput = z.infer<typeof createCstSchema>;
export type PatchCstInput = z.infer<typeof patchCstSchema>;
