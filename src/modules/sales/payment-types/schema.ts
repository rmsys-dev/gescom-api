import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
import { paymentTypeEnum } from "../../../db/schema.js";

export const listPaymentTypesQuerySchema = createPaginationQuerySchema(100);

const statusSchema = z.enum(["ATIVO", "INATIVO", "BLOQUEADO", "PENDENTE", "ESPECIAL"]);
const paymentTypeSchema = z.enum(paymentTypeEnum.enumValues);

export const createPaymentTypeSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase(),
    paymentType: paymentTypeSchema,
    status: statusSchema.default("ATIVO").optional(),
  })
  .strict();

export const patchPaymentTypeSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
    paymentType: paymentTypeSchema.optional(),
    status: statusSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.description !== undefined ||
      data.paymentType !== undefined ||
      data.status !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const paymentTypeParamsSchema = z
  .object({
    paymentTypeId: z
      .string()
      .uuid("Campo 'paymentTypeId' deve ser um UUID valido"),
  })
  .strict();

export type ListPaymentTypesQuery = z.infer<typeof listPaymentTypesQuerySchema>;
export type CreatePaymentTypeInput = z.infer<typeof createPaymentTypeSchema>;
export type PatchPaymentTypeInput = z.infer<typeof patchPaymentTypeSchema>;
