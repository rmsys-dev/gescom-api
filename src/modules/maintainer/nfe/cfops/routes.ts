import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerCfopsController } from "./controller.js";
import {
  cfopParamsSchema,
  createCfopSchema,
  patchCfopSchema,
} from "./schema.js";

const maintainerCfopsRouter = Router();

maintainerCfopsRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createCfopSchema }),
  maintainerCfopsController.create,
);

maintainerCfopsRouter.patch(
  "/:cfopId",
  requireMaintainerApiKey,
  validateSchema({ params: cfopParamsSchema, body: patchCfopSchema }),
  maintainerCfopsController.patch,
);

maintainerCfopsRouter.delete(
  "/:cfopId",
  requireMaintainerApiKey,
  validateSchema({
    params: cfopParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerCfopsController.remove,
);

export { maintainerCfopsRouter };
