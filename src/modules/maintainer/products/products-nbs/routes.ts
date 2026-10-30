import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerProductsNbsController } from "./controller.js";
import {
  createProductsNbsSchema,
  patchProductsNbsSchema,
  productsNbsParamsSchema,
} from "./schema.js";

const maintainerProductsNbsRouter = Router();

maintainerProductsNbsRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createProductsNbsSchema }),
  maintainerProductsNbsController.create,
);

maintainerProductsNbsRouter.patch(
  "/:productsNbsId",
  requireMaintainerApiKey,
  validateSchema({
    params: productsNbsParamsSchema,
    body: patchProductsNbsSchema,
  }),
  maintainerProductsNbsController.patch,
);

maintainerProductsNbsRouter.delete(
  "/:productsNbsId",
  requireMaintainerApiKey,
  validateSchema({
    params: productsNbsParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerProductsNbsController.remove,
);

export { maintainerProductsNbsRouter };
