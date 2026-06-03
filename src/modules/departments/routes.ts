import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../shared/validation/common-schemas.js";
import { departmentsController } from "./controller.js";
import {
  departmentParamsSchema,
  listDepartmentsQuerySchema,
} from "./schema.js";

const departmentsRouter = Router();

departmentsRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_departamentos"),
  validateSchema({ query: listDepartmentsQuerySchema }),
  departmentsController.list,
);

departmentsRouter.get(
  "/:departmentId",
  authMiddleware,
  requirePermission("consultar_departamentos"),
  validateSchema({ params: departmentParamsSchema, query: emptyQuerySchema }),
  departmentsController.getById,
);

export { departmentsRouter };
