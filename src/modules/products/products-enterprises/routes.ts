import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { productsEnterprisesController } from "./controller.js";
import {
  createProductEnterpriseSchema,
  listProductsEnterprisesQuerySchema,
  patchProductEnterpriseSchema,
  productEnterpriseCodeParamsSchema,
  productEnterpriseParamsSchema,
} from "./schema.js";

const productsEnterprisesRouter = Router();

productsEnterprisesRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_produtos"),
  validateSchema({ query: listProductsEnterprisesQuerySchema }),
  productsEnterprisesController.list,
);

productsEnterprisesRouter.get(
  "/code/:code",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_produtos"),
  validateSchema({
    params: productEnterpriseCodeParamsSchema,
    query: emptyQuerySchema,
  }),
  productsEnterprisesController.getByCode,
);

productsEnterprisesRouter.get(
  "/:productEnterpriseId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_produtos"),
  validateSchema({ params: productEnterpriseParamsSchema, query: emptyQuerySchema }),
  productsEnterprisesController.getById,
);

productsEnterprisesRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_produtos"),
  validateSchema({ body: createProductEnterpriseSchema }),
  productsEnterprisesController.create,
);

productsEnterprisesRouter.patch(
  "/:productEnterpriseId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_produtos"),
  validateSchema({
    params: productEnterpriseParamsSchema,
    body: patchProductEnterpriseSchema,
  }),
  productsEnterprisesController.patch,
);

productsEnterprisesRouter.delete(
  "/:productEnterpriseId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_produtos"),
  validateSchema({ params: productEnterpriseParamsSchema, query: emptyQuerySchema }),
  productsEnterprisesController.delete,
);

export { productsEnterprisesRouter };
