import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { productsNcmController } from "./controller.js";
import {
  listProductsNcmQuerySchema,
  productsNcmParamsSchema,
} from "./schema.js";

const productsNcmRouter = Router();

productsNcmRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_ncm_produtos"),
  validateSchema({ query: listProductsNcmQuerySchema }),
  productsNcmController.list,
);

productsNcmRouter.get(
  "/:productsNcmId",
  authMiddleware,
  requirePermission("consultar_ncm_produtos"),
  validateSchema({ params: productsNcmParamsSchema, query: emptyQuerySchema }),
  productsNcmController.getById,
);

export { productsNcmRouter };
