import { z } from "zod";
import {
  catalogListFilterText,
  catalogListQueryBase,
} from "../shared/catalog-list-query.js";

export const listProductsNcmQuerySchema = z
  .object({
    ...catalogListQueryBase,
    ncm: catalogListFilterText,
  })
  .strict();

const ncmCodeSchema = z
  .string()
  .trim()
  .min(2, "NCM deve ter no minimo 2 caracteres");

export const createProductsNcmSchema = z
  .object({
    ncm: ncmCodeSchema,
    description: z.string().trim().min(1).max(255).toUpperCase(),
  })
  .strict();

export const patchProductsNcmSchema = z
  .object({
    ncm: ncmCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.ncm !== undefined ||
      data.description !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const productsNcmParamsSchema = z
  .object({
    productsNcmId: z
      .string()
      .uuid("Campo 'productsNcmId' deve ser um UUID valido"),
  })
  .strict();

export type ListProductsNcmQuery = z.infer<typeof listProductsNcmQuerySchema>;
export type CreateProductsNcmInput = z.infer<typeof createProductsNcmSchema>;
export type PatchProductsNcmInput = z.infer<typeof patchProductsNcmSchema>;
export type ProductsNcmParams = z.infer<typeof productsNcmParamsSchema>;
