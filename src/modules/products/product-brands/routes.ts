import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { productBrandsController } from "./controller.js";
import {
  createProductBrandSchema,
  listProductBrandsQuerySchema,
  patchProductBrandSchema,
  productBrandParamsSchema,
} from "./schema.js";

const productBrandsRouter = Router();

productBrandsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_marcas_produto"),
  validateSchema({ query: listProductBrandsQuerySchema }),
  productBrandsController.list,
);

productBrandsRouter.get(
  "/:productBrandId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_marcas_produto"),
  validateSchema({ params: productBrandParamsSchema, query: emptyQuerySchema }),
  productBrandsController.getById,
);

productBrandsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_marcas_produto"),
  validateSchema({ body: createProductBrandSchema }),
  productBrandsController.create,
);

productBrandsRouter.patch(
  "/:productBrandId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_marcas_produto"),
  validateSchema({
    params: productBrandParamsSchema,
    body: patchProductBrandSchema,
  }),
  productBrandsController.patch,
);

productBrandsRouter.delete(
  "/:productBrandId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_marcas_produto"),
  validateSchema({ params: productBrandParamsSchema, query: emptyQuerySchema }),
  productBrandsController.delete,
);

export { productBrandsRouter };
