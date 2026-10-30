import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const flag = z.enum(["0", "1"]);
const optionalText = z.string().trim().min(1).nullable().optional();
const optionalLabel = z.string().trim().min(1).max(100).nullable().optional();
const optionalRate = z.coerce.number().min(0).max(100).nullable().optional();
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato AAAA-MM-DD")
  .nullable()
  .optional();
const credPres = z
  .string()
  .trim()
  .regex(/^[0-9]{1,2}$/, "cCredPres deve ter ate 2 digitos")
  .transform((value) => value.padStart(2, "0"));

const presumedCreditFields = {
  credPres,
  description: z.string().trim().min(1),
  lcRedacao: optionalText,
  indNfe: flag.default("0"),
  indEvento: flag.default("0"),
  ind_DeduzCredPres: flag.default("0"),
  ind_gCBSCredPres: flag.default("0"),
  ind_gIBSCredPres: flag.default("0"),
  cbsRateType: optionalLabel,
  ibsRateType: optionalLabel,
  pAliqCredPresCbs: optionalText,
  pAliqCredPresIbs: optionalText,
  pCredPresCbs: optionalRate,
  pCredPresIbs: optionalRate,
  pRedTransicaoIbs: optionalText,
  cClassRef: optionalLabel,
  dIniVigCbs: optionalDate,
  dFimVigCbs: optionalDate,
  dIniVigIbs: optionalDate,
  dFimVigIbs: optionalDate,
};

const rateToString = <T extends { pCredPresCbs?: number | null; pCredPresIbs?: number | null }>(
  data: T,
) => ({
  ...data,
  pCredPresCbs:
    data.pCredPresCbs === undefined || data.pCredPresCbs === null
      ? data.pCredPresCbs
      : String(data.pCredPresCbs),
  pCredPresIbs:
    data.pCredPresIbs === undefined || data.pCredPresIbs === null
      ? data.pCredPresIbs
      : String(data.pCredPresIbs),
});

export const createPresumedCreditSchema = z
  .object(presumedCreditFields)
  .strict()
  .transform(rateToString);

export const patchPresumedCreditSchema = z
  .object({
    credPres: credPres.optional(),
    description: presumedCreditFields.description.optional(),
    lcRedacao: optionalText,
    indNfe: flag.optional(),
    indEvento: flag.optional(),
    ind_DeduzCredPres: flag.optional(),
    ind_gCBSCredPres: flag.optional(),
    ind_gIBSCredPres: flag.optional(),
    cbsRateType: optionalLabel,
    ibsRateType: optionalLabel,
    pAliqCredPresCbs: optionalText,
    pAliqCredPresIbs: optionalText,
    pCredPresCbs: optionalRate,
    pCredPresIbs: optionalRate,
    pRedTransicaoIbs: optionalText,
    cClassRef: optionalLabel,
    dIniVigCbs: optionalDate,
    dFimVigCbs: optionalDate,
    dIniVigIbs: optionalDate,
    dFimVigIbs: optionalDate,
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Deve haver ao menos um campo para atualizar",
  })
  .transform(rateToString);

export const presumedCreditParamsSchema = z
  .object({ presumedCreditId: uuidSchema("presumedCreditId") })
  .strict();

export type CreatePresumedCreditInput = z.infer<typeof createPresumedCreditSchema>;
export type PatchPresumedCreditInput = z.infer<typeof patchPresumedCreditSchema>;
