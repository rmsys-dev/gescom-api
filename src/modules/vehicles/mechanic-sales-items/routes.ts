import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requireParameter } from "../../../shared/middleware/parameter-middleware.js";
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
const requireOs = requireParameter("trabalha_os");

mechanicSalesItemsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("consultar_comissoes_itens_venda"),
  validateSchema({ query: listMechanicSalesItemsQuerySchema }),
  mechanicSalesItemsController.list,
);

mechanicSalesItemsRouter.get(
  "/:mechanicSalesItemId",
  authMiddleware,
  tenantMiddleware,
  requireOs,
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
  requireOs,
  requirePermission("incluir_comissoes_itens_venda"),
  validateSchema({ body: createMechanicSalesItemSchema }),
  mechanicSalesItemsController.create,
);

mechanicSalesItemsRouter.patch(
  "/:mechanicSalesItemId",
  authMiddleware,
  tenantMiddleware,
  requireOs,
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
  requireOs,
  requirePermission("excluir_comissoes_itens_venda"),
  validateSchema({
    params: mechanicSalesItemParamsSchema,
    query: emptyQuerySchema,
  }),
  mechanicSalesItemsController.delete,
);

export { mechanicSalesItemsRouter };
