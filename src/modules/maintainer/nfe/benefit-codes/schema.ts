import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const uf = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/,
    "UF invalida",
  );

export const createBenefitCodeSchema = z
  .object({
    uf,
    codeBenefit: z.string().trim().min(1).max(10),
    descriptionBenefit: z.string().trim().optional(),
    observationBenefit: z.string().trim().optional(),
  })
  .strict();

export const patchBenefitCodeSchema = z
  .object({
    uf: uf.optional(),
    codeBenefit: z.string().trim().min(1).max(10).optional(),
    descriptionBenefit: z.string().trim().nullable().optional(),
    observationBenefit: z.string().trim().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Deve haver ao menos um campo para atualizar",
  });

export const benefitCodeParamsSchema = z
  .object({ benefitCodeId: uuidSchema("benefitCodeId") })
  .strict();

export const linkCompatibleCstSchema = z
  .object({
    situationTributaryCstId: uuidSchema("situationTributaryCstId"),
  })
  .strict();

export const compatibleCstParamsSchema = z
  .object({ linkId: uuidSchema("linkId") })
  .strict();

export type CreateBenefitCodeInput = z.infer<typeof createBenefitCodeSchema>;
export type PatchBenefitCodeInput = z.infer<typeof patchBenefitCodeSchema>;
export type LinkCompatibleCstInput = z.infer<typeof linkCompatibleCstSchema>;
