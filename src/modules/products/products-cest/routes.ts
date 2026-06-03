import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { productsCestController } from "./controller.js";
import {
  createProductsCestSchema,
  listProductsCestQuerySchema,
  patchProductsCestSchema,
  productsCestParamsSchema,
} from "./schema.js";

const productsCestRouter = Router();

productsCestRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_cest_produtos"),
  validateSchema({ query: listProductsCestQuerySchema }),
  productsCestController.list,
);

productsCestRouter.get(
  "/:productsCestId",
  authMiddleware,
  requirePermission("consultar_cest_produtos"),
  validateSchema({ params: productsCestParamsSchema, query: emptyQuerySchema }),
  productsCestController.getById,
);

productsCestRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_cest_produtos"),
  validateSchema({ body: createProductsCestSchema }),
  productsCestController.create,
);

productsCestRouter.patch(
  "/:productsCestId",
  authMiddleware,
  requirePermission("alterar_cest_produtos"),
  validateSchema({
    params: productsCestParamsSchema,
    body: patchProductsCestSchema,
  }),
  productsCestController.patch,
);

productsCestRouter.delete(
  "/:productsCestId",
  authMiddleware,
  requirePermission("excluir_cest_produtos"),
  validateSchema({ params: productsCestParamsSchema, query: emptyQuerySchema }),
  productsCestController.delete,
);

export { productsCestRouter };
