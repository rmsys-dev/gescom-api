import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { productGroupsController } from "./controller.js";
import {
  createProductGroupSchema,
  listProductGroupsQuerySchema,
  patchProductGroupSchema,
  productGroupParamsSchema,
} from "./schema.js";

const productGroupsRouter = Router();

productGroupsRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_grupos_produto"),
  validateSchema({ query: listProductGroupsQuerySchema }),
  productGroupsController.list,
);

productGroupsRouter.get(
  "/:productGroupId",
  authMiddleware,
  requirePermission("consultar_grupos_produto"),
  validateSchema({ params: productGroupParamsSchema, query: emptyQuerySchema }),
  productGroupsController.getById,
);

productGroupsRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_grupos_produto"),
  validateSchema({ body: createProductGroupSchema }),
  productGroupsController.create,
);

productGroupsRouter.patch(
  "/:productGroupId",
  authMiddleware,
  requirePermission("alterar_grupos_produto"),
  validateSchema({
    params: productGroupParamsSchema,
    body: patchProductGroupSchema,
  }),
  productGroupsController.patch,
);

productGroupsRouter.delete(
  "/:productGroupId",
  authMiddleware,
  requirePermission("excluir_grupos_produto"),
  validateSchema({ params: productGroupParamsSchema, query: emptyQuerySchema }),
  productGroupsController.delete,
);

export { productGroupsRouter };
