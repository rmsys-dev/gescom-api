import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { productApplicationsController } from "./controller.js";
import {
  createProductApplicationSchema,
  listProductApplicationsQuerySchema,
  patchProductApplicationSchema,
  productApplicationParamsSchema,
} from "./schema.js";

const productApplicationsRouter = Router();

productApplicationsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_aplicacoes_produto"),
  validateSchema({ query: listProductApplicationsQuerySchema }),
  productApplicationsController.list,
);

productApplicationsRouter.get(
  "/:id",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_aplicacoes_produto"),
  validateSchema({ params: productApplicationParamsSchema, query: emptyQuerySchema }),
  productApplicationsController.listById,
);

productApplicationsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_aplicacoes_produto"),
  validateSchema({ body: createProductApplicationSchema }),
  productApplicationsController.create,
);

productApplicationsRouter.patch(
  "/:id",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_aplicacoes_produto"),
  validateSchema({
    params: productApplicationParamsSchema,
    body: patchProductApplicationSchema,
  }),
  productApplicationsController.patch,
);

productApplicationsRouter.delete(
  "/:id",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_aplicacoes_produto"),
  validateSchema({ params: productApplicationParamsSchema, query: emptyQuerySchema }),
  productApplicationsController.delete,
);

export { productApplicationsRouter };
