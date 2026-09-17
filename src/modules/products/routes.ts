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

// Cria produto+vínculo ou, se barCode (ou description sem barCode) já existir, só o snapshot em products-enterprises.
// Mutações posteriores são só em /products-enterprises — a raiz products é imutável após o POST.
productsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_produtos"),
  validateSchema({ body: createProductWithEnterpriseSchema }),
  productsController.create,
);

export { productsRouter };
