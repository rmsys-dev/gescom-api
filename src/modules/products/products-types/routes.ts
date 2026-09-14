import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { typesProductsController } from "./controller.js";
import {
  listTypesProductsQuerySchema,
  typeProductParamsSchema,
} from "./schema.js";

const typesProductsRouter = Router();

typesProductsRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_tipos_produto"),
  validateSchema({ query: listTypesProductsQuerySchema }),
  typesProductsController.list,
);

typesProductsRouter.get(
  "/:typeProductId",
  authMiddleware,
  requirePermission("consultar_tipos_produto"),
  validateSchema({ params: typeProductParamsSchema, query: emptyQuerySchema }),
  typesProductsController.getById,
);

export { typesProductsRouter };
