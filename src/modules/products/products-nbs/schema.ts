import { z } from "zod";
import {
  catalogListFilterText,
  catalogListQueryBase,
} from "../shared/catalog-list-query.js";

const nbsCodeSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)+$/, "NBS deve seguir o formato numerico com pontos (ex.: 1.1502.10.00)");

const snSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v === "S" || v === "N", "Valor deve ser S ou N");

const productsNbsFieldsSchema = z.object({
  lc116Item: z.string().trim().min(1).max(32),
  lc116Description: z.string().trim().min(1),
  nbs: nbsCodeSchema,
  description: z.string().trim().min(1),
  psOnerosa: snSchema,
  adqExterior: snSchema,
  indop: z.string().trim().min(1).max(32),
  cClassTrib: z.string().trim().min(1).max(32),
  cClassTribName: z.string().trim().min(1),
});

export const createProductsNbsSchema = productsNbsFieldsSchema.strict();

export const patchProductsNbsSchema = productsNbsFieldsSchema
  .partial()
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const productsNbsParamsSchema = z
  .object({
    productsNbsId: z
      .string()
      .uuid("Campo 'productsNbsId' deve ser um UUID valido"),
  })
  .strict();

export const listProductsNbsQuerySchema = z
  .object({
    ...catalogListQueryBase,
    nbs: catalogListFilterText,
  })
  .strict();

export type CreateProductsNbsInput = z.infer<typeof createProductsNbsSchema>;
export type PatchProductsNbsInput = z.infer<typeof patchProductsNbsSchema>;
export type ListProductsNbsQuery = z.infer<typeof listProductsNbsQuerySchema>;
