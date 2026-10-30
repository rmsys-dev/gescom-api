import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerPisCofinsSituationController } from "./controller.js";
import {
  createPisCofinsSituationSchema,
  patchPisCofinsSituationSchema,
  pisCofinsSituationParamsSchema,
} from "./schema.js";

const maintainerPisCofinsSituationRouter = Router();

maintainerPisCofinsSituationRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createPisCofinsSituationSchema }),
  maintainerPisCofinsSituationController.create,
);

maintainerPisCofinsSituationRouter.patch(
  "/:pisCofinsSituationId",
  requireMaintainerApiKey,
  validateSchema({
    params: pisCofinsSituationParamsSchema,
    body: patchPisCofinsSituationSchema,
  }),
  maintainerPisCofinsSituationController.patch,
);

maintainerPisCofinsSituationRouter.delete(
  "/:pisCofinsSituationId",
  requireMaintainerApiKey,
  validateSchema({
    params: pisCofinsSituationParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerPisCofinsSituationController.remove,
);

export { maintainerPisCofinsSituationRouter };
