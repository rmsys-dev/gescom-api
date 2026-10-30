import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerProductsNcmController } from "./controller.js";
import {
  createProductsNcmSchema,
  patchProductsNcmSchema,
  productsNcmParamsSchema,
} from "./schema.js";

const maintainerProductsNcmRouter = Router();

maintainerProductsNcmRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createProductsNcmSchema }),
  maintainerProductsNcmController.create,
);

maintainerProductsNcmRouter.patch(
  "/:productsNcmId",
  requireMaintainerApiKey,
  validateSchema({
    params: productsNcmParamsSchema,
    body: patchProductsNcmSchema,
  }),
  maintainerProductsNcmController.patch,
);

maintainerProductsNcmRouter.delete(
  "/:productsNcmId",
  requireMaintainerApiKey,
  validateSchema({
    params: productsNcmParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerProductsNcmController.remove,
);

export { maintainerProductsNcmRouter };
