import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../shared/validation/common-schemas.js";
import { salesController } from "./controller.js";
import { salesAnalyticsRouter } from "./analytics/routes.js";
import { salesReturnsRouter } from "./returns/routes.js";
import {
  convertBudgetToOsSchema,
  convertBudgetToSaleSchema,
  convertOsToSaleSchema,
  createSaleItemSchema,
  createSaleSchema,
  listSalesQuerySchema,
  patchSaleItemSchema,
  patchSaleSchema,
  saleItemParamsSchema,
  saleParamsSchema,
} from "./schema.js";

const salesRouter = Router();

salesRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_vendas"),
  validateSchema({ query: listSalesQuerySchema }),
  salesController.list,
);

salesRouter.use("/analytics", salesAnalyticsRouter);

salesRouter.get(
  "/:saleId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_vendas"),
  validateSchema({ params: saleParamsSchema, query: emptyQuerySchema }),
  salesController.getById,
);

salesRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_vendas"),
  validateSchema({ body: createSaleSchema }),
  salesController.create,
);

salesRouter.patch(
  "/:saleId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_vendas"),
  validateSchema({ params: saleParamsSchema, body: patchSaleSchema }),
  salesController.patch,
);

salesRouter.post(
  "/:saleId/recalculate-totals",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_vendas"),
  validateSchema({ params: saleParamsSchema, query: emptyQuerySchema }),
  salesController.recalculateTotals,
);

salesRouter.post(
  "/:saleId/convert-to-sale",
  authMiddleware,
  tenantMiddleware,
  requireAnyPermission(["gerar_vendas", "alterar_vendas"]),
  validateSchema({
    params: saleParamsSchema,
    body: convertBudgetToSaleSchema,
    query: emptyQuerySchema,
  }),
  salesController.convertBudgetToSale,
);

salesRouter.post(
  "/:saleId/convert-to-os",
  authMiddleware,
  tenantMiddleware,
  requireAnyPermission(["gerar_vendas", "alterar_vendas"]),
  validateSchema({
    params: saleParamsSchema,
    body: convertBudgetToOsSchema,
    query: emptyQuerySchema,
  }),
  salesController.convertBudgetToOs,
);

salesRouter.post(
  "/:saleId/convert-os-to-sale",
  authMiddleware,
  tenantMiddleware,
  requireAnyPermission(["gerar_vendas", "alterar_vendas"]),
  validateSchema({
    params: saleParamsSchema,
    body: convertOsToSaleSchema,
    query: emptyQuerySchema,
  }),
  salesController.convertOsToSale,
);

salesRouter.get(
  "/:saleId/sale-conversions",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_vendas"),
  validateSchema({ params: saleParamsSchema, query: emptyQuerySchema }),
  salesController.listSaleConversions,
);

salesRouter.post(
  "/:saleId/items",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_vendas"),
  validateSchema({
    params: saleParamsSchema,
    body: createSaleItemSchema,
    query: emptyQuerySchema,
  }),
  salesController.addItem,
);

salesRouter.patch(
  "/:saleId/items/:saleItemId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_vendas"),
  validateSchema({
    params: saleItemParamsSchema,
    body: patchSaleItemSchema,
  }),
  salesController.updateItem,
);

salesRouter.delete(
  "/:saleId/items/:saleItemId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_vendas"),
  validateSchema({
    params: saleItemParamsSchema,
    query: emptyQuerySchema,
  }),
  salesController.removeItem,
);

salesRouter.use("/:saleId/returns", salesReturnsRouter);

export { salesRouter };
