import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { productTaxationController } from "./controller.js";
import {
  createProductTaxationSchema,
  listProductTaxationQuerySchema,
  patchProductTaxationSchema,
  productTaxationParamsSchema,
} from "./schema.js";

const productTaxationRouter = Router();

productTaxationRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_tributacao_produto"),
  validateSchema({ query: listProductTaxationQuerySchema }),
  productTaxationController.list,
);

productTaxationRouter.get(
  "/:productTaxationId",
  authMiddleware,
  requirePermission("consultar_tributacao_produto"),
  validateSchema({ params: productTaxationParamsSchema, query: emptyQuerySchema }),
  productTaxationController.getById,
);

productTaxationRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_tributacao_produto"),
  validateSchema({ body: createProductTaxationSchema }),
  productTaxationController.create,
);

productTaxationRouter.patch(
  "/:productTaxationId",
  authMiddleware,
  requirePermission("alterar_tributacao_produto"),
  validateSchema({
    params: productTaxationParamsSchema,
    body: patchProductTaxationSchema,
  }),
  productTaxationController.patch,
);

productTaxationRouter.delete(
  "/:productTaxationId",
  authMiddleware,
  requirePermission("excluir_tributacao_produto"),
  validateSchema({ params: productTaxationParamsSchema, query: emptyQuerySchema }),
  productTaxationController.delete,
);

export { productTaxationRouter };
