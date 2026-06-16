import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { productSubgroupsController } from "./controller.js";
import {
  createProductSubgroupSchema,
  listProductSubgroupsQuerySchema,
  patchProductSubgroupSchema,
  productSubgroupEnterpriseParamsSchema,
  productSubgroupParamsSchema,
} from "./schema.js";

const productSubgroupsRouter = Router();

productSubgroupsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_subgrupos_produto"),
  validateSchema({ query: listProductSubgroupsQuerySchema }),
  productSubgroupsController.list,
);

productSubgroupsRouter.get(
  "/:productSubgroupId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_subgrupos_produto"),
  validateSchema({ params: productSubgroupParamsSchema, query: emptyQuerySchema }),
  productSubgroupsController.getById,
);

productSubgroupsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_subgrupos_produto"),
  validateSchema({ body: createProductSubgroupSchema }),
  productSubgroupsController.create,
);

productSubgroupsRouter.patch(
  "/:productSubgroupId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_subgrupos_produto"),
  validateSchema({
    params: productSubgroupParamsSchema,
    body: patchProductSubgroupSchema,
  }),
  productSubgroupsController.patch,
);

productSubgroupsRouter.delete(
  "/:productSubgroupId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_subgrupos_produto"),
  validateSchema({ params: productSubgroupParamsSchema, query: emptyQuerySchema }),
  productSubgroupsController.delete,
);

const enterpriseProductSubgroupsRouter = Router({ mergeParams: true });

enterpriseProductSubgroupsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_subgrupos_produto"),
  validateSchema({
    params: productSubgroupEnterpriseParamsSchema,
    query: listProductSubgroupsQuerySchema,
  }),
  productSubgroupsController.list,
);

export { productSubgroupsRouter, enterpriseProductSubgroupsRouter };
