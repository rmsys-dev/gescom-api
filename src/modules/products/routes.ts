import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { emptyQuerySchema } from "../../shared/validation/common-schemas.js";
import { productsController } from "./controller.js";
import {
  createProductWithEnterpriseSchema,
  listProductsQuerySchema,
  patchProductSchema,
  productParamsSchema,
} from "./schema.js";

const productsRouter = Router();

productsRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_produtos"),
  validateSchema({ query: listProductsQuerySchema }),
  productsController.list,
);

productsRouter.get(
  "/:productId",
  authMiddleware,
  requirePermission("consultar_produtos"),
  validateSchema({ params: productParamsSchema, query: emptyQuerySchema }),
  productsController.getById,
);

productsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_produtos"),
  validateSchema({ body: createProductWithEnterpriseSchema }),
  productsController.create,
);

productsRouter.patch(
  "/:productId",
  authMiddleware,
  requirePermission("alterar_produtos"),
  validateSchema({ params: productParamsSchema, body: patchProductSchema }),
  productsController.patch,
);

productsRouter.delete(
  "/:productId",
  authMiddleware,
  requirePermission("excluir_produtos"),
  validateSchema({ params: productParamsSchema, query: emptyQuerySchema }),
  productsController.delete,
);

export { productsRouter };
