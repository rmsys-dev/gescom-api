import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { stockMovementsController } from "./controller.js";
import {
  createStockMovementSchema,
  listStockMovementsQuerySchema,
  stockMovementParamsSchema,
} from "./schema.js";

const stockMovementsRouter = Router();

stockMovementsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_movimentos_estoque"),
  validateSchema({ query: listStockMovementsQuerySchema }),
  stockMovementsController.list,
);

stockMovementsRouter.get(
  "/:stockMovementId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_movimentos_estoque"),
  validateSchema({ params: stockMovementParamsSchema, query: emptyQuerySchema }),
  stockMovementsController.getById,
);

stockMovementsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_movimentos_estoque"),
  validateSchema({ body: createStockMovementSchema }),
  stockMovementsController.create,
);

export { stockMovementsRouter };
