import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { stockBatchBalancesController } from "./controller.js";
import {
  createStockBatchBalanceSchema,
  listStockBatchBalancesQuerySchema,
  patchStockBatchBalanceSchema,
  stockBatchBalanceParamsSchema,
} from "./schema.js";

const stockBatchBalancesRouter = Router();

stockBatchBalancesRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_saldos_lote_estoque"),
  validateSchema({ query: listStockBatchBalancesQuerySchema }),
  stockBatchBalancesController.list,
);

stockBatchBalancesRouter.get(
  "/:stockBatchBalanceId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_saldos_lote_estoque"),
  validateSchema({
    params: stockBatchBalanceParamsSchema,
    query: emptyQuerySchema,
  }),
  stockBatchBalancesController.getById,
);

stockBatchBalancesRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_saldos_lote_estoque"),
  validateSchema({ body: createStockBatchBalanceSchema }),
  stockBatchBalancesController.create,
);

stockBatchBalancesRouter.patch(
  "/:stockBatchBalanceId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_saldos_lote_estoque"),
  validateSchema({
    params: stockBatchBalanceParamsSchema,
    body: patchStockBatchBalanceSchema,
  }),
  stockBatchBalancesController.patch,
);

stockBatchBalancesRouter.delete(
  "/:stockBatchBalanceId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_saldos_lote_estoque"),
  validateSchema({
    params: stockBatchBalanceParamsSchema,
    query: emptyQuerySchema,
  }),
  stockBatchBalancesController.delete,
);

export { stockBatchBalancesRouter };
