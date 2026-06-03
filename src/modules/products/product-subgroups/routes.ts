import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { productSubgroupsController } from "./controller.js";
import {
  createProductSubgroupSchema,
  listProductSubgroupsQuerySchema,
  patchProductSubgroupSchema,
  productSubgroupParamsSchema,
} from "./schema.js";

const productSubgroupsRouter = Router();

productSubgroupsRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_subgrupos_produto"),
  validateSchema({ query: listProductSubgroupsQuerySchema }),
  productSubgroupsController.list,
);

productSubgroupsRouter.get(
  "/:productSubgroupId",
  authMiddleware,
  requirePermission("consultar_subgrupos_produto"),
  validateSchema({ params: productSubgroupParamsSchema, query: emptyQuerySchema }),
  productSubgroupsController.getById,
);

productSubgroupsRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_subgrupos_produto"),
  validateSchema({ body: createProductSubgroupSchema }),
  productSubgroupsController.create,
);

productSubgroupsRouter.patch(
  "/:productSubgroupId",
  authMiddleware,
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
  requirePermission("excluir_subgrupos_produto"),
  validateSchema({ params: productSubgroupParamsSchema, query: emptyQuerySchema }),
  productSubgroupsController.delete,
);

export { productSubgroupsRouter };
