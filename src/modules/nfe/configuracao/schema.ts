import { z } from "zod";
import { NFE_TIPOS_EMISSAO } from "../sefaz/types.js";

const optionalBlankToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

export const patchNfeConfiguracaoSchema = z
  .object({
    ambiente: z.union([z.literal(1), z.literal(2)]).optional(),
    serieNfe: z.number().int().min(0).max(999).optional(),
    serieNfce: z.number().int().min(0).max(999).optional(),
    idCsc: z.preprocess(
      optionalBlankToUndefined,
      z.string().trim().min(1).max(6).optional().nullable(),
    ),
    csc: z.preprocess(
      optionalBlankToUndefined,
      z.string().trim().min(1).max(500).optional().nullable(),
    ),
    tipoEmissao: z
      .number()
      .int()
      .refine(
        (value): value is (typeof NFE_TIPOS_EMISSAO)[number] =>
          (NFE_TIPOS_EMISSAO as readonly number[]).includes(value),
        "Campo 'tipoEmissao' deve ser 1, 2, 4, 5, 6, 7 ou 9",
      )
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.ambiente !== undefined ||
      data.serieNfe !== undefined ||
      data.serieNfce !== undefined ||
      data.idCsc !== undefined ||
      data.csc !== undefined ||
      data.tipoEmissao !== undefined,
    "Informe ao menos um campo para alterar",
  );

export type PatchNfeConfiguracaoInput = z.infer<
  typeof patchNfeConfiguracaoSchema
>;

export const nfeCertificadoUploadSchema = z.object({
  password: z.string().min(1, "Informe a senha do certificado digital"),
});

export type NfeCertificadoUploadInput = z.infer<
  typeof nfeCertificadoUploadSchema
>;
