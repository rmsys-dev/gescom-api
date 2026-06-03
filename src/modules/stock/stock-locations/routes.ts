import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { stockLocationsController } from "./controller.js";
import {
  createStockLocationSchema,
  listStockLocationsQuerySchema,
  patchStockLocationSchema,
  stockLocationParamsSchema,
} from "./schema.js";

const stockLocationsRouter = Router();

stockLocationsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_locacoes_estoque"),
  validateSchema({ query: listStockLocationsQuerySchema }),
  stockLocationsController.list,
);

stockLocationsRouter.get(
  "/:stockLocationId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_locacoes_estoque"),
  validateSchema({ params: stockLocationParamsSchema, query: emptyQuerySchema }),
  stockLocationsController.getById,
);

stockLocationsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_locacoes_estoque"),
  validateSchema({ body: createStockLocationSchema }),
  stockLocationsController.create,
);

stockLocationsRouter.patch(
  "/:stockLocationId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_locacoes_estoque"),
  validateSchema({
    params: stockLocationParamsSchema,
    body: patchStockLocationSchema,
  }),
  stockLocationsController.patch,
);

stockLocationsRouter.delete(
  "/:stockLocationId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_locacoes_estoque"),
  validateSchema({ params: stockLocationParamsSchema, query: emptyQuerySchema }),
  stockLocationsController.delete,
);

export { stockLocationsRouter };
