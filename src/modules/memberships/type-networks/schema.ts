import { z } from "zod";
import { statusEnum } from "../../../db/schema.js";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listTypeNetworksQuerySchema = createPaginationQuerySchema(100);

const statusSchema = z.enum(statusEnum.enumValues);

export const createTypeNetworkSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase(),
    status: statusSchema.default("ATIVO").optional(),
  })
  .strict();

export const patchTypeNetworkSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
    status: statusSchema.optional(),
  })
  .strict()
  .refine(
    (data) => data.description !== undefined || data.status !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const typeNetworkParamsSchema = z
  .object({
    typeNetworkId: z
      .string()
      .uuid("Campo 'typeNetworkId' deve ser um UUID valido"),
  })
  .strict();

export type ListTypeNetworksQuery = z.infer<typeof listTypeNetworksQuerySchema>;
export type CreateTypeNetworkInput = z.infer<typeof createTypeNetworkSchema>;
export type PatchTypeNetworkInput = z.infer<typeof patchTypeNetworkSchema>;
