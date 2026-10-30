import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerProductsCestController } from "./controller.js";
import {
  createProductsCestSchema,
  patchProductsCestSchema,
  productsCestParamsSchema,
} from "./schema.js";

const maintainerProductsCestRouter = Router();

maintainerProductsCestRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createProductsCestSchema }),
  maintainerProductsCestController.create,
);

maintainerProductsCestRouter.patch(
  "/:productsCestId",
  requireMaintainerApiKey,
  validateSchema({
    params: productsCestParamsSchema,
    body: patchProductsCestSchema,
  }),
  maintainerProductsCestController.patch,
);

maintainerProductsCestRouter.delete(
  "/:productsCestId",
  requireMaintainerApiKey,
  validateSchema({
    params: productsCestParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerProductsCestController.remove,
);

export { maintainerProductsCestRouter };
