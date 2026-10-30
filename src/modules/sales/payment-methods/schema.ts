import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
import { paymentMethodTypeEnum, statusEnum } from "../../../db/schema.js";

export const listPaymentMethodsQuerySchema = createPaginationQuerySchema(100);

const statusSchema = z.enum(statusEnum.enumValues);
const typeSchema = z.enum(paymentMethodTypeEnum.enumValues);

export const createPaymentMethodSchema = z
  .object({
    paymentCode: z.string().trim().max(2).regex(/^[0-9]+$/, "O código do meio de pagamento deve ser um número"),
    description: z.string().trim().min(1).max(255),
    status: statusSchema.default("ATIVO").optional(),
    type: typeSchema,
  })
  .strict();

export const patchPaymentMethodSchema = z
  .object({
    paymentCode: z.string().trim().max(2).regex(/^[0-9]+$/, "O código do meio de pagamento deve ser um número").optional(),
    description: z.string().trim().min(1).max(255).optional(),
    status: statusSchema.optional(),
    type: typeSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const paymentMethodParamsSchema = z
  .object({
    paymentMethodId: z
      .string()
      .uuid("Campo 'paymentMethodId' deve ser um UUID valido"),
  })
  .strict();

export type ListPaymentMethodsQuery = z.infer<
  typeof listPaymentMethodsQuerySchema
>;
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type PatchPaymentMethodInput = z.infer<typeof patchPaymentMethodSchema>;
