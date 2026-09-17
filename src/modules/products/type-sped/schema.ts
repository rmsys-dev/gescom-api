import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listTypeSpedQuerySchema = createPaginationQuerySchema(100);

export const typeSpedParamsSchema = z
  .object({
    typeSpedId: z.string().uuid("Campo 'typeSpedId' deve ser um UUID valido"),
  })
  .strict();

export type ListTypeSpedQuery = z.infer<typeof listTypeSpedQuerySchema>;
export type TypeSpedParams = z.infer<typeof typeSpedParamsSchema>;
