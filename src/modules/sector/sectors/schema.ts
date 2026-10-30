import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listSectorsQuerySchema = createPaginationQuerySchema(100);

export const createSectorSchema = z
  .object({
    description: z.string().trim().min(1).max(255),
  })
  .strict();

export const patchSectorSchema = z
  .object({
    description: z.string().trim().min(1).max(255).optional(),
  })
  .strict()
  .refine(
    (data) => data.description !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const sectorParamsSchema = z
  .object({
    sectorId: z.string().uuid("Campo 'sectorId' deve ser um UUID valido"),
  })
  .strict();

export type ListSectorsQuery = z.infer<typeof listSectorsQuerySchema>;
export type CreateSectorInput = z.infer<typeof createSectorSchema>;
export type PatchSectorInput = z.infer<typeof patchSectorSchema>;
