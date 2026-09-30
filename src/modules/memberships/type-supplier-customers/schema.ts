import { z } from "zod";
import {
  statusEnum,
  typeClassificationCustomersEnum,
} from "../../../db/schema.js";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listTypeSupplierCustomersQuerySchema =
  createPaginationQuerySchema(100);

const statusSchema = z.enum(statusEnum.enumValues);
const classificationSchema = z.enum(typeClassificationCustomersEnum.enumValues);
const percentageSchema = z.number().min(0).max(100);

export const createTypeSupplierCustomerSchema = z
  .object({
    description: z.string().trim().min(1).max(255),
    status: statusSchema.default("ATIVO").optional(),
    low: z.boolean().default(false).optional(),
    generatesSt: z.boolean().default(false).optional(),
    endConsumer: z.boolean().default(false).optional(),
    classification: classificationSchema.default("CLIENTE").optional(),
    customerDiscount: percentageSchema.optional().nullable(),
  })
  .strict();

export const patchTypeSupplierCustomerSchema = z
  .object({
    description: z.string().trim().min(1).max(255).optional(),
    status: statusSchema.optional(),
    low: z.boolean().optional(),
    generatesSt: z.boolean().optional(),
    endConsumer: z.boolean().optional(),
    classification: classificationSchema.optional(),
    customerDiscount: percentageSchema.optional().nullable(),
  })
  .strict()
  .refine(
    (data) =>
      data.description !== undefined ||
      data.status !== undefined ||
      data.low !== undefined ||
      data.generatesSt !== undefined ||
      data.endConsumer !== undefined ||
      data.classification !== undefined ||
      data.customerDiscount !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const typeSupplierCustomerParamsSchema = z
  .object({
    typeSupplierCustomerId: z
      .string()
      .uuid("Campo 'typeSupplierCustomerId' deve ser um UUID valido"),
  })
  .strict();

export type ListTypeSupplierCustomersQuery = z.infer<
  typeof listTypeSupplierCustomersQuerySchema
>;
export type CreateTypeSupplierCustomerInput = z.infer<
  typeof createTypeSupplierCustomerSchema
>;
export type PatchTypeSupplierCustomerInput = z.infer<
  typeof patchTypeSupplierCustomerSchema
>;
