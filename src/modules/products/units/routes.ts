import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { unitsController } from "./controller.js";
import { listUnitsQuerySchema, unitParamsSchema } from "./schema.js";

const unitsRouter = Router();

unitsRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_unidades_medida"),
  validateSchema({ query: listUnitsQuerySchema }),
  unitsController.list,
);

unitsRouter.get(
  "/:unitId",
  authMiddleware,
  requirePermission("consultar_unidades_medida"),
  validateSchema({ params: unitParamsSchema, query: emptyQuerySchema }),
  unitsController.getById,
);

export { unitsRouter };
