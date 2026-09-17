import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../shared/validation/common-schemas.js";
import { modulesController } from "./controller.js";
import { listModulesQuerySchema, moduleParamsSchema } from "./schema.js";
import { PERM } from "../auth/default-permissions.js";

const modulesRouter = Router();

modulesRouter.get(
  "/",
  authMiddleware,
  requirePermission(PERM.consultar_modulos),
  validateSchema({ query: listModulesQuerySchema }),
  modulesController.list,
);

modulesRouter.get(
  "/:moduleId",
  authMiddleware,
  requirePermission(PERM.consultar_modulos),
  validateSchema({ params: moduleParamsSchema, query: emptyQuerySchema }),
  modulesController.getById,
);

export { modulesRouter };
