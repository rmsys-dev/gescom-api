import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { productsNbsController } from "./controller.js";
import {
  listProductsNbsQuerySchema,
  productsNbsParamsSchema,
} from "./schema.js";

const productsNbsRouter = Router();

productsNbsRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_nbs_produtos"),
  validateSchema({ query: listProductsNbsQuerySchema }),
  productsNbsController.list,
);

productsNbsRouter.get(
  "/:productsNbsId",
  authMiddleware,
  requirePermission("consultar_nbs_produtos"),
  validateSchema({ params: productsNbsParamsSchema, query: emptyQuerySchema }),
  productsNbsController.getById,
);

export { productsNbsRouter };
