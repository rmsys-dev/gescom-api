import { z } from "zod";
import { createPaginationQuerySchema, uuidSchema, } from "../../shared/validation/common-schemas.js";
export const moduleParamsSchema = z
    .object({
    moduleId: uuidSchema("moduleId"),
})
    .strict();
export const listModulesQuerySchema = createPaginationQuerySchema(100);
