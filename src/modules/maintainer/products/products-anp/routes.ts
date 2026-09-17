import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerProductsAnpController } from "./controller.js";
import {
  createProductsAnpSchema,
  patchProductsAnpSchema,
  productsAnpParamsSchema,
} from "./schema.js";

const maintainerProductsAnpRouter = Router();

maintainerProductsAnpRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createProductsAnpSchema }),
  maintainerProductsAnpController.create,
);

maintainerProductsAnpRouter.patch(
  "/:productsAnpId",
  requireMaintainerApiKey,
  validateSchema({
    params: productsAnpParamsSchema,
    body: patchProductsAnpSchema,
  }),
  maintainerProductsAnpController.patch,
);

maintainerProductsAnpRouter.delete(
  "/:productsAnpId",
  requireMaintainerApiKey,
  validateSchema({
    params: productsAnpParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerProductsAnpController.remove,
);

export { maintainerProductsAnpRouter };
