import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requireParameter } from "../../shared/middleware/parameter-middleware.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../shared/validation/common-schemas.js";
import { serviceOrderController } from "./controller.js";
import {
  convertBudgetToOsSchema,
  convertOsToSaleSchema,
  createSaleItemSchema,
  createServiceOrderSchema,
  listSaleSellersQuerySchema,
  listServiceOrdersQuerySchema,
  patchSaleItemSchema,
  patchServiceOrderSchema,
  printSaleQuerySchema,
  serviceOrderFromBudgetParamsSchema,
  serviceOrderItemParamsSchema,
  serviceOrderParamsSchema,
} from "./schema.js";

const serviceOrdersRouter = Router();
const requireOs = requireParameter("trabalha_os");

serviceOrdersRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("consultar_ordem_servico"),
  validateSchema({ query: listServiceOrdersQuerySchema }),
  serviceOrderController.list,
);

serviceOrdersRouter.get(
  "/summary",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("consultar_ordem_servico"),
  validateSchema({ query: listServiceOrdersQuerySchema }),
  serviceOrderController.summary,
);

serviceOrdersRouter.get(
  "/sellers",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requireAnyPermission(["incluir_ordem_servico", "alterar_ordem_servico"]),
  validateSchema({ query: listSaleSellersQuerySchema }),
  serviceOrderController.listSellers,
);

serviceOrdersRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("incluir_ordem_servico"),
  validateSchema({ body: createServiceOrderSchema }),
  serviceOrderController.create,
);

serviceOrdersRouter.post(
  "/from-budget/:saleId",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("incluir_ordem_servico"),
  validateSchema({
    params: serviceOrderFromBudgetParamsSchema,
    body: convertBudgetToOsSchema,
    query: emptyQuerySchema,
  }),
  serviceOrderController.convertFromBudget,
);

serviceOrdersRouter.get(
  "/:serviceOrderId/print",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("consultar_ordem_servico"),
  validateSchema({
    params: serviceOrderParamsSchema,
    query: printSaleQuerySchema,
  }),
  serviceOrderController.print,
);
  
serviceOrdersRouter.get(
  "/:serviceOrderId/conversions",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("consultar_ordem_servico"),
  validateSchema({
    params: serviceOrderParamsSchema,
    query: emptyQuerySchema,
  }),
  serviceOrderController.listConversions,
);

serviceOrdersRouter.post(
  "/:serviceOrderId/items",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("alterar_ordem_servico"),
  validateSchema({
    params: serviceOrderParamsSchema,
    body: createSaleItemSchema,
    query: emptyQuerySchema,
  }),
  serviceOrderController.addItem,
);

serviceOrdersRouter.patch(
  "/:serviceOrderId/items/:saleItemId",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("alterar_ordem_servico"),
  validateSchema({
    params: serviceOrderItemParamsSchema,
    body: patchSaleItemSchema,
  }),
  serviceOrderController.updateItem,
);

serviceOrdersRouter.delete(
  "/:serviceOrderId/items/:saleItemId",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("alterar_ordem_servico"),
  validateSchema({
    params: serviceOrderItemParamsSchema,
    query: emptyQuerySchema,
  }),
  serviceOrderController.removeItem,
);

serviceOrdersRouter.post(
  "/:serviceOrderId/recalculate-totals",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("alterar_ordem_servico"),
  validateSchema({
    params: serviceOrderParamsSchema,
    query: emptyQuerySchema,
  }),
  serviceOrderController.recalculateTotals,
);

serviceOrdersRouter.post(
  "/:serviceOrderId/convert-to-sale",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("alterar_ordem_servico"),
  validateSchema({
    params: serviceOrderParamsSchema,
    body: convertOsToSaleSchema,
    query: emptyQuerySchema,
  }),
  serviceOrderController.convertToSale,
);

serviceOrdersRouter.post(
  "/:serviceOrderId/cancel",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("alterar_ordem_servico"),
  validateSchema({
    params: serviceOrderParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  serviceOrderController.cancel,
);

serviceOrdersRouter.post(
  "/:serviceOrderId/estorno",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("alterar_ordem_servico"),
  validateSchema({
    params: serviceOrderParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  serviceOrderController.estorno,
);

serviceOrdersRouter.get(
  "/:serviceOrderId",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("consultar_ordem_servico"),
  validateSchema({
    params: serviceOrderParamsSchema,
    query: emptyQuerySchema,
  }),
  serviceOrderController.getById,
);

serviceOrdersRouter.patch(
  "/:serviceOrderId",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("alterar_ordem_servico"),
  validateSchema({
    params: serviceOrderParamsSchema,
    body: patchServiceOrderSchema,
  }),
  serviceOrderController.patch,
);

export { serviceOrdersRouter };
