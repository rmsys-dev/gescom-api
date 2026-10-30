import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerClassificationIbsCbsController } from "./controller.js";
import {
  classificationParamsSchema,
  createClassificationIbsCbsSchema,
  patchClassificationIbsCbsSchema,
} from "./schema.js";

const maintainerClassificationIbsCbsRouter = Router();

maintainerClassificationIbsCbsRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createClassificationIbsCbsSchema }),
  maintainerClassificationIbsCbsController.create,
);

maintainerClassificationIbsCbsRouter.patch(
  "/:classificationId",
  requireMaintainerApiKey,
  validateSchema({
    params: classificationParamsSchema,
    body: patchClassificationIbsCbsSchema,
  }),
  maintainerClassificationIbsCbsController.patch,
);

maintainerClassificationIbsCbsRouter.delete(
  "/:classificationId",
  requireMaintainerApiKey,
  validateSchema({
    params: classificationParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerClassificationIbsCbsController.remove,
);

export { maintainerClassificationIbsCbsRouter };
