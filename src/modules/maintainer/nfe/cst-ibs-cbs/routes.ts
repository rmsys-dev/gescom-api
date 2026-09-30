import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerCstIbsCbsController } from "./controller.js";
import {
  createCstIbsCbsSchema,
  cstIbsCbsParamsSchema,
  patchCstIbsCbsSchema,
} from "./schema.js";

const maintainerCstIbsCbsRouter = Router();

maintainerCstIbsCbsRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createCstIbsCbsSchema }),
  maintainerCstIbsCbsController.create,
);

maintainerCstIbsCbsRouter.patch(
  "/:cstIbsCbsId",
  requireMaintainerApiKey,
  validateSchema({ params: cstIbsCbsParamsSchema, body: patchCstIbsCbsSchema }),
  maintainerCstIbsCbsController.patch,
);

maintainerCstIbsCbsRouter.delete(
  "/:cstIbsCbsId",
  requireMaintainerApiKey,
  validateSchema({
    params: cstIbsCbsParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerCstIbsCbsController.remove,
);

export { maintainerCstIbsCbsRouter };
