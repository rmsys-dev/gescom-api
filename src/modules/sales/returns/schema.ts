import { z } from "zod";

export const saleReturnParamsSchema = z
  .object({
    saleId: z.string().uuid("Campo 'saleId' deve ser um UUID valido"),
    salesReturnId: z
      .string()
      .uuid("Campo 'salesReturnId' deve ser um UUID valido")
      .optional(),
  })
  .strict();

export const salesReturnIdParamsSchema = z
  .object({
    saleId: z.string().uuid("Campo 'saleId' deve ser um UUID valido"),
    salesReturnId: z
      .string()
      .uuid("Campo 'salesReturnId' deve ser um UUID valido"),
  })
  .strict();

export const createPartialReturnSchema = z
  .object({
    notes: z.string().trim().max(500).optional(),
    items: z
      .array(
        z
          .object({
            saleItemId: z.string().uuid(),
            quantity: z.number().positive(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const createFullReturnSchema = z
  .object({
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export type CreatePartialReturnInput = z.infer<typeof createPartialReturnSchema>;
export type CreateFullReturnInput = z.infer<typeof createFullReturnSchema>;
