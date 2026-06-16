import { z } from "zod";
import { statusEnum } from "../../../db/enums.js";

/** Filtros combinados com AND; `search` mantém busca ampla legada (OR). */
const optionalFilterText = z.string().trim().min(1).optional();

export const listProductsEnterprisesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    search: optionalFilterText,
    description: optionalFilterText,
    code: optionalFilterText,
    barCode: optionalFilterText,
    manufacturer: optionalFilterText,
    origin: optionalFilterText,
    group: optionalFilterText,
    subgroup: optionalFilterText,
    brand: optionalFilterText,
    application: optionalFilterText,
    status: z.enum(statusEnum.enumValues).optional(),
  })
  .strict();

export const createProductEnterpriseSchema = z
  .object({
    productId: z.string().uuid(),
    code: z.coerce.number().int().optional(),
    description: z.string().trim().min(1).max(255).toUpperCase(),
    origin: z.string().trim().max(255).optional(),
    manufacturer: z.string().trim().max(255).optional(),
    measurementUnitId: z.string().uuid(),
    productTypeId: z.string().uuid(),
    productNcmId: z.string().uuid().optional(),
    productCestId: z.string().uuid().optional(),
    productAnpId: z.string().uuid().optional(),
    productNbsId: z.string().uuid().optional(),
    productGroupId: z.string().uuid(),
    productSubgroupId: z.string().uuid(),
    productBrandId: z.string().uuid(),
    controlsBatch: z.boolean().optional(),
  })
  .strict();

export const patchProductEnterpriseSchema = z
  .object({
    code: z.coerce.number().int().nullable().optional(),
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
    origin: z.string().trim().max(255).nullable().optional(),
    manufacturer: z.string().trim().max(255).nullable().optional(),
    measurementUnitId: z.string().uuid().optional(),
    productTypeId: z.string().uuid().optional(),
    productNcmId: z.string().uuid().optional(),
    productCestId: z.string().uuid().optional(),
    productAnpId: z.string().uuid().optional(),
    productNbsId: z.string().uuid().optional(),
    productGroupId: z.string().uuid().optional(),
    productSubgroupId: z.string().uuid().optional(),
    productBrandId: z.string().uuid().optional(),
    controlsBatch: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const productEnterpriseParamsSchema = z
  .object({
    productEnterpriseId: z
      .string()
      .uuid("Campo 'productEnterpriseId' deve ser um UUID valido"),
  })
  .strict();

export const productEnterpriseCodeParamsSchema = z
  .object({
    code: z.coerce.number().int(),
  })
  .strict();

export const createProductEnterprisePayloadSchema =
  createProductEnterpriseSchema.omit({ productId: true });

export type CreateProductEnterpriseInput = z.infer<
  typeof createProductEnterpriseSchema
>;
export type CreateProductEnterprisePayloadInput = z.infer<
  typeof createProductEnterprisePayloadSchema
>;
export type PatchProductEnterpriseInput = z.infer<
  typeof patchProductEnterpriseSchema
>;
export type ListProductsEnterprisesQuery = z.infer<
  typeof listProductsEnterprisesQuerySchema
>;
