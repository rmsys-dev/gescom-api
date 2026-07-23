import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { mechanicSalesItemsController } from "./controller.js";
import {
  createMechanicSalesItemSchema,
  listMechanicSalesItemsQuerySchema,
  mechanicSalesItemParamsSchema,
  patchMechanicSalesItemSchema,
} from "./schema.js";

const mechanicSalesItemsRouter = Router();

mechanicSalesItemsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_comissoes_itens_venda"),
  validateSchema({ query: listMechanicSalesItemsQuerySchema }),
  mechanicSalesItemsController.list,
);

mechanicSalesItemsRouter.get(
  "/:mechanicSalesItemId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_comissoes_itens_venda"),
  validateSchema({
    params: mechanicSalesItemParamsSchema,
    query: emptyQuerySchema,
  }),
  mechanicSalesItemsController.getById,
);

mechanicSalesItemsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_comissoes_itens_venda"),
  validateSchema({ body: createMechanicSalesItemSchema }),
  mechanicSalesItemsController.create,
);

mechanicSalesItemsRouter.patch(
  "/:mechanicSalesItemId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_comissoes_itens_venda"),
  validateSchema({
    params: mechanicSalesItemParamsSchema,
    body: patchMechanicSalesItemSchema,
  }),
  mechanicSalesItemsController.patch,
);

mechanicSalesItemsRouter.delete(
  "/:mechanicSalesItemId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_comissoes_itens_venda"),
  validateSchema({
    params: mechanicSalesItemParamsSchema,
    query: emptyQuerySchema,
  }),
  mechanicSalesItemsController.delete,
);

export { mechanicSalesItemsRouter };
