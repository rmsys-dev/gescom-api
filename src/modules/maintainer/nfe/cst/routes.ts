import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerCstController } from "./controller.js";
import { createCstSchema, cstParamsSchema, patchCstSchema } from "./schema.js";

const maintainerCstRouter = Router();

maintainerCstRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createCstSchema }),
  maintainerCstController.create,
);

maintainerCstRouter.patch(
  "/:cstId",
  requireMaintainerApiKey,
  validateSchema({ params: cstParamsSchema, body: patchCstSchema }),
  maintainerCstController.patch,
);

maintainerCstRouter.delete(
  "/:cstId",
  requireMaintainerApiKey,
  validateSchema({
    params: cstParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerCstController.remove,
);

export { maintainerCstRouter };
