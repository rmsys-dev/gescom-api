import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listSectorsRentalQuerySchema = createPaginationQuerySchema(100);

export const createSectorRentalSchema = z
  .object({
    productsEnterprisesId: z.string().uuid(),
    locationsId: z.string().uuid(),
  })
  .strict();

export const patchSectorRentalSchema = z
  .object({
    productsEnterprisesId: z.string().uuid().optional(),
    locationsId: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const sectorRentalParamsSchema = z
  .object({
    sectorRentalId: z
      .string()
      .uuid("Campo 'sectorRentalId' deve ser um UUID valido"),
  })
  .strict();

export type ListSectorsRentalQuery = z.infer<typeof listSectorsRentalQuerySchema>;
export type CreateSectorRentalInput = z.infer<typeof createSectorRentalSchema>;
export type PatchSectorRentalInput = z.infer<typeof patchSectorRentalSchema>;
