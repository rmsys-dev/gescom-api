import { z } from "zod";
import {
  enterpriseParameterCatalog,
  type EnterpriseParameterSlug,
} from "./catalog.js";

const parameterFields = Object.fromEntries(
  enterpriseParameterCatalog.map((slug) => [slug, z.boolean().optional()]),
) as Record<EnterpriseParameterSlug, z.ZodOptional<z.ZodBoolean>>;

export const patchEnterpriseParametersSchema = z
  .object(parameterFields)
  .strict()
  .refine(
    (data) =>
      enterpriseParameterCatalog.some((slug) => data[slug] !== undefined),
    "Informe ao menos um parâmetro para alterar",
  );

export type PatchEnterpriseParametersInput = z.infer<
  typeof patchEnterpriseParametersSchema
>;
