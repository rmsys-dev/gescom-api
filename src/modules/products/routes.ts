import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { emptyQuerySchema } from "../../shared/validation/common-schemas.js";
import { productsController } from "./controller.js";
import {
  createProductSchema,
  createProductWithEnterpriseSchema,
  listProductsQuerySchema,
  patchProductSchema,
  productParamsSchema,
} from "./schema.js";

const productsRouter = Router();

// Catálogo global: GET permanece sem tenant (listagem compartilhada).
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
  "/base",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_produtos"),
  validateSchema({ body: createProductSchema, query: emptyQuerySchema }),
  productsController.createBase,
);

productsRouter.patch(
  "/:productId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_produtos"),
  validateSchema({ params: productParamsSchema, body: patchProductSchema, query: emptyQuerySchema }),
  productsController.patch,
);

productsRouter.delete(
  "/:productId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_produtos"),
  validateSchema({ params: productParamsSchema, query: emptyQuerySchema }),
  productsController.remove,
);

// Cria produto+vínculo ou, se barCode (ou description sem barCode) já existir, só o snapshot em products-enterprises.
productsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_produtos"),
  validateSchema({ body: createProductWithEnterpriseSchema }),
  productsController.create,
);

export { productsRouter };
