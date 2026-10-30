import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { productsAnpController } from "./controller.js";
import {
  listProductsAnpQuerySchema,
  productsAnpParamsSchema,
} from "./schema.js";

const productsAnpRouter = Router();

productsAnpRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_anp_produtos"),
  validateSchema({ query: listProductsAnpQuerySchema }),
  productsAnpController.list,
);

productsAnpRouter.get(
  "/:productsAnpId",
  authMiddleware,
  requirePermission("consultar_anp_produtos"),
  validateSchema({ params: productsAnpParamsSchema, query: emptyQuerySchema }),
  productsAnpController.getById,
);

export { productsAnpRouter };
