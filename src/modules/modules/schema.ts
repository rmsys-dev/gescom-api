import { z } from "zod";
import {
  createPaginationQuerySchema,
  uuidSchema,
} from "../../shared/validation/common-schemas.js";

export const moduleParamsSchema = z
  .object({
    moduleId: uuidSchema("moduleId"),
  })
  .strict();

export const listModulesQuerySchema = createPaginationQuerySchema(100);

export type ModuleParams = z.infer<typeof moduleParamsSchema>;
export type ListModulesQuery = z.infer<typeof listModulesQuerySchema>;
