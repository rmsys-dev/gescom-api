import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve ser AAAA-MM-DD");

export const createAnexoRtSchema = z
  .object({
    productsNcmId: uuidSchema("productsNcmId"),
    dateFim: isoDate,
    legislation: z.string().trim().min(1).max(50),
    anexo: z.string().trim().min(1).max(20),
    cstIbsCbsId: uuidSchema("cstIbsCbsId"),
    classificationIbsCbsId: uuidSchema("classificationIbsCbsId"),
  })
  .strict();

export const patchAnexoRtSchema = z
  .object({
    productsNcmId: uuidSchema("productsNcmId").optional(),
    dateFim: isoDate.optional(),
    legislation: z.string().trim().min(1).max(50).optional(),
    anexo: z.string().trim().min(1).max(20).optional(),
    cstIbsCbsId: uuidSchema("cstIbsCbsId").optional(),
    classificationIbsCbsId: uuidSchema("classificationIbsCbsId").optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Deve haver ao menos um campo para atualizar",
  });

export const anexoRtParamsSchema = z
  .object({ anexoRtId: uuidSchema("anexoRtId") })
  .strict();

export type CreateAnexoRtInput = z.infer<typeof createAnexoRtSchema>;
export type PatchAnexoRtInput = z.infer<typeof patchAnexoRtSchema>;
