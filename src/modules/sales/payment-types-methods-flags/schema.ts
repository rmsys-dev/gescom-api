import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
import {
  paymentMethodIntegrationEnum,
  statusEnum,
} from "../../../db/schema.js";

export const listPaymentTypesMethodsFlagsQuerySchema =
  createPaginationQuerySchema(100);

const statusSchema = z.enum(statusEnum.enumValues);
const integrationSchema = z.enum(paymentMethodIntegrationEnum.enumValues);
const uuidField = (field: string) =>
  z.string().uuid(`Campo '${field}' deve ser um UUID valido`);

export const createPaymentTypesMethodsFlagsSchema = z
  .object({
    paymentTypesId: uuidField("paymentTypesId"),
    paymentMethodsId: uuidField("paymentMethodsId"),
    typeFlagsId: uuidField("typeFlagsId").nullable().optional(),
    status: statusSchema.default("ATIVO").optional(),
    sped1601: z.boolean().default(false).optional(),
    generateCharge: z.boolean().default(false).optional(),
    integration: integrationSchema,
    bandMemberId: uuidField("bandMemberId").nullable().optional(),
    intermediaryMemberId: uuidField("intermediaryMemberId").nullable().optional(),
  })
  .strict();

export const patchPaymentTypesMethodsFlagsSchema = z
  .object({
    paymentTypesId: uuidField("paymentTypesId").optional(),
    paymentMethodsId: uuidField("paymentMethodsId").optional(),
    typeFlagsId: uuidField("typeFlagsId").nullable().optional(),
    status: statusSchema.optional(),
    sped1601: z.boolean().optional(),
    generateCharge: z.boolean().optional(),
    integration: integrationSchema.optional(),
    bandMemberId: uuidField("bandMemberId").nullable().optional(),
    intermediaryMemberId: uuidField("intermediaryMemberId").nullable().optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const paymentTypesMethodsFlagsParamsSchema = z
  .object({
    paymentConfigId: uuidField("paymentConfigId"),
  })
  .strict();

export type ListPaymentTypesMethodsFlagsQuery = z.infer<
  typeof listPaymentTypesMethodsFlagsQuerySchema
>;
export type CreatePaymentTypesMethodsFlagsInput = z.infer<
  typeof createPaymentTypesMethodsFlagsSchema
>;
export type PatchPaymentTypesMethodsFlagsInput = z.infer<
  typeof patchPaymentTypesMethodsFlagsSchema
>;
