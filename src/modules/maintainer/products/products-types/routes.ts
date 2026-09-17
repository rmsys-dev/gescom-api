import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerTypesProductsController } from "./controller.js";
import {
  createTypeProductSchema,
  patchTypeProductSchema,
  typeProductParamsSchema,
} from "./schema.js";

const maintainerTypesProductsRouter = Router();

maintainerTypesProductsRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createTypeProductSchema }),
  maintainerTypesProductsController.create,
);

maintainerTypesProductsRouter.patch(
  "/:typeProductId",
  requireMaintainerApiKey,
  validateSchema({
    params: typeProductParamsSchema,
    body: patchTypeProductSchema,
  }),
  maintainerTypesProductsController.patch,
);

maintainerTypesProductsRouter.delete(
  "/:typeProductId",
  requireMaintainerApiKey,
  validateSchema({
    params: typeProductParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerTypesProductsController.remove,
);

export { maintainerTypesProductsRouter };
