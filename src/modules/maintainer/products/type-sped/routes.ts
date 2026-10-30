import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerTypeSpedController } from "./controller.js";
import {
  createTypeSpedSchema,
  patchTypeSpedSchema,
  typeSpedParamsSchema,
} from "./schema.js";

const maintainerTypeSpedRouter = Router();

maintainerTypeSpedRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createTypeSpedSchema }),
  maintainerTypeSpedController.create,
);

maintainerTypeSpedRouter.patch(
  "/:typeSpedId",
  requireMaintainerApiKey,
  validateSchema({
    params: typeSpedParamsSchema,
    body: patchTypeSpedSchema,
  }),
  maintainerTypeSpedController.patch,
);

maintainerTypeSpedRouter.delete(
  "/:typeSpedId",
  requireMaintainerApiKey,
  validateSchema({
    params: typeSpedParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerTypeSpedController.remove,
);

export { maintainerTypeSpedRouter };
