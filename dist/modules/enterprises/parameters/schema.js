import { z } from "zod";
import { enterpriseParameterCatalog, } from "./catalog.js";
const parameterFields = Object.fromEntries(enterpriseParameterCatalog.map((slug) => [slug, z.boolean().optional()]));
export const patchEnterpriseParametersSchema = z
    .object(parameterFields)
    .strict()
    .refine((data) => enterpriseParameterCatalog.some((slug) => data[slug] !== undefined), "Informe ao menos um parâmetro para alterar");
