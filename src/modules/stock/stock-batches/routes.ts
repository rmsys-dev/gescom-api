import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { stockBatchesController } from "./controller.js";
import {
  createStockBatchSchema,
  listStockBatchesQuerySchema,
  patchStockBatchSchema,
  stockBatchParamsSchema,
} from "./schema.js";

const stockBatchesRouter = Router();

stockBatchesRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_lotes_estoque"),
  validateSchema({ query: listStockBatchesQuerySchema }),
  stockBatchesController.list,
);

stockBatchesRouter.get(
  "/:stockBatchId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_lotes_estoque"),
  validateSchema({ params: stockBatchParamsSchema, query: emptyQuerySchema }),
  stockBatchesController.getById,
);

stockBatchesRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_lotes_estoque"),
  validateSchema({ body: createStockBatchSchema }),
  stockBatchesController.create,
);

stockBatchesRouter.patch(
  "/:stockBatchId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_lotes_estoque"),
  validateSchema({
    params: stockBatchParamsSchema,
    body: patchStockBatchSchema,
  }),
  stockBatchesController.patch,
);

stockBatchesRouter.delete(
  "/:stockBatchId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_lotes_estoque"),
  validateSchema({ params: stockBatchParamsSchema, query: emptyQuerySchema }),
  stockBatchesController.delete,
);

export { stockBatchesRouter };
