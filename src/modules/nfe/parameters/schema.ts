import { z } from "zod";
import {
  nfeParameterCatalog,
  type NfeParameterSlug,
} from "./catalog.js";

const parameterValueSchema = z
  .string()
  .trim()
  .min(1, "Valor do parametro nao pode ser vazio")
  .max(500, "Valor do parametro deve ter no maximo 500 caracteres");

const portalUrlSchema = parameterValueSchema.url(
  "Campo deve ser uma URL valida",
);

const parameterFields = {
  portal_nfe: portalUrlSchema.optional(),
  portal_consulta_nfe: portalUrlSchema.optional(),
  versao_layout: parameterValueSchema.optional(),
} as const satisfies Record<
  NfeParameterSlug,
  z.ZodOptional<z.ZodString>
>;

export const patchNfeParametersSchema = z
  .object(parameterFields)
  .strict()
  .refine(
    (data) => nfeParameterCatalog.some((slug) => data[slug] !== undefined),
    "Informe ao menos um parametro para alterar",
  );

export type PatchNfeParametersInput = z.infer<typeof patchNfeParametersSchema>;
