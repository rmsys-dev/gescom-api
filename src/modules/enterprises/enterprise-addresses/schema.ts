import { z } from "zod";
import { adressTypeEnum } from "../../../db/schema.js";
import {
  createPaginationQuerySchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";

const adressTypeSchema = z.enum(adressTypeEnum.enumValues);

export const enterpriseAddressEnterpriseParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
  })
  .strict();

export const enterpriseAddressParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
    addressId: uuidSchema("addressId"),
  })
  .strict();

export const listEnterpriseAddressesQuerySchema = createPaginationQuerySchema(
  100,
)
  .extend({
    adressType: adressTypeSchema.optional(),
  })
  .strict();

export const createEnterpriseAddressSchema = z
  .object({
    cepId: uuidSchema("cepId"),
    countryId: uuidSchema("countryId"),
    stateId: uuidSchema("stateId"),
    cityId: uuidSchema("cityId"),
    adressType: adressTypeSchema,
  })
  .strict();

export const patchEnterpriseAddressSchema = z
  .object({
    cepId: uuidSchema("cepId").optional(),
    countryId: uuidSchema("countryId").optional(),
    stateId: uuidSchema("stateId").optional(),
    cityId: uuidSchema("cityId").optional(),
    adressType: adressTypeSchema.optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.cepId !== undefined ||
      data.countryId !== undefined ||
      data.stateId !== undefined ||
      data.cityId !== undefined ||
      data.adressType !== undefined ||
      data.softDelete === true,
    "Deve haver ao menos um campo para atualizar",
  );

export type ListEnterpriseAddressesQuery = z.infer<
  typeof listEnterpriseAddressesQuerySchema
>;
export type CreateEnterpriseAddressInput = z.infer<
  typeof createEnterpriseAddressSchema
>;
export type PatchEnterpriseAddressInput = z.infer<
  typeof patchEnterpriseAddressSchema
>;
