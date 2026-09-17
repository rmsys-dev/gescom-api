import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { stockMinMaxController } from "./controller.js";
import {
  createStockMinMaxSchema,
  listStockMinMaxQuerySchema,
  patchStockMinMaxSchema,
  stockMinMaxParamsSchema,
} from "./schema.js";

const stockMinMaxRouter = Router();

stockMinMaxRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_estoque_min_max"),
  validateSchema({ query: listStockMinMaxQuerySchema }),
  stockMinMaxController.list,
);

stockMinMaxRouter.get(
  "/:stockMinMaxId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_estoque_min_max"),
  validateSchema({ params: stockMinMaxParamsSchema, query: emptyQuerySchema }),
  stockMinMaxController.getById,
);

stockMinMaxRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_estoque_min_max"),
  validateSchema({ body: createStockMinMaxSchema }),
  stockMinMaxController.create,
);

stockMinMaxRouter.patch(
  "/:stockMinMaxId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_estoque_min_max"),
  validateSchema({
    params: stockMinMaxParamsSchema,
    body: patchStockMinMaxSchema,
  }),
  stockMinMaxController.patch,
);

stockMinMaxRouter.delete(
  "/:stockMinMaxId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_estoque_min_max"),
  validateSchema({ params: stockMinMaxParamsSchema, query: emptyQuerySchema }),
  stockMinMaxController.delete,
);

export { stockMinMaxRouter };
