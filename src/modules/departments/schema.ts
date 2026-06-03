import { z } from "zod";
import { createPaginationQuerySchema, uuidSchema } from "../../shared/validation/common-schemas.js";

export const departmentParamsSchema = z
  .object({
    departmentId: uuidSchema("departmentId"),
  })
  .strict();

export const listDepartmentsQuerySchema = createPaginationQuerySchema(100);

export type DepartmentParams = z.infer<typeof departmentParamsSchema>;
export type ListDepartmentsQuery = z.infer<typeof listDepartmentsQuerySchema>;
