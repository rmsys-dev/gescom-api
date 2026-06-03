import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listIcmsTaxationQuerySchema = createPaginationQuerySchema(100);

const icmsCodeSchema = z.string().trim().min(1).max(255);

export const createIcmsTaxationSchema = z
  .object({
    icms: icmsCodeSchema,
    description: z.string().trim().min(1).max(255).toUpperCase(),
    icmsRate: z.number().min(0).max(100).default(0).optional(),
    simplesIcmsRate: z.number().min(0).max(100).default(0).optional(),
  })
  .strict();

export const patchIcmsTaxationSchema = z
  .object({
    icms: icmsCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
    icmsRate: z.number().min(0).max(100).optional(),
    simplesIcmsRate: z.number().min(0).max(100).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.icms !== undefined ||
      data.description !== undefined ||
      data.icmsRate !== undefined ||
      data.simplesIcmsRate !== undefined ||
    "Deve haver ao menos um campo para atualizar",
  );

export const icmsTaxationParamsSchema = z
  .object({
    icmsTaxationId: z
      .string()
      .uuid("Campo 'icmsTaxationId' deve ser um UUID valido"),
  })
  .strict();

export type ListIcmsTaxationQuery = z.infer<typeof listIcmsTaxationQuerySchema>;
export type CreateIcmsTaxationInput = z.infer<typeof createIcmsTaxationSchema>;
export type PatchIcmsTaxationInput = z.infer<typeof patchIcmsTaxationSchema>;
export type IcmsTaxationParams = z.infer<typeof icmsTaxationParamsSchema>;
