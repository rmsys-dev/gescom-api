import { z } from "zod";
import {
  createPaginationQuerySchema,
  optionalTrimmedStringSchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";

const xJustSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(15, "Justificativa deve ter ao menos 15 caracteres")
      .max(255, "Justificativa deve ter no maximo 255 caracteres"),
  );

export const manifestacaoTipoSchema = z.enum([
  "CIENCIA",
  "CONFIRMACAO",
  "DESCONHECIMENTO",
  "OPERACAO_NAO_REALIZADA",
]);

export const createManifestacaoSchema = z
  .object({
    chave: z
      .string()
      .transform((value) => value.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{44}$/, "Chave de acesso deve ter 44 digitos")),
    tipo: manifestacaoTipoSchema,
    xJust: xJustSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.tipo === "OPERACAO_NAO_REALIZADA" && !data.xJust) {
      ctx.addIssue({
        code: "custom",
        path: ["xJust"],
        message: "Justificativa obrigatoria para operacao nao realizada",
      });
    }
    if (data.tipo !== "OPERACAO_NAO_REALIZADA" && data.xJust) {
      ctx.addIssue({
        code: "custom",
        path: ["xJust"],
        message: "Justificativa vale apenas para operacao nao realizada",
      });
    }
  });

export const manifestacaoIdParamsSchema = z
  .object({
    manifestacaoId: uuidSchema("manifestacaoId"),
  })
  .strict();

export const listManifestacoesQuerySchema = createPaginationQuerySchema(100)
  .extend({
    chave: optionalTrimmedStringSchema("chave", 54).optional(),
    tipo: manifestacaoTipoSchema.optional(),
  })
  .strict();

export type CreateManifestacaoInput = z.infer<typeof createManifestacaoSchema>;
export type ListManifestacoesQuery = z.infer<typeof listManifestacoesQuerySchema>;
