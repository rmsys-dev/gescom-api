import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerAnexosRtController } from "./controller.js";
import {
  anexoRtParamsSchema,
  createAnexoRtSchema,
  patchAnexoRtSchema,
} from "./schema.js";

const maintainerAnexosRtRouter = Router();

maintainerAnexosRtRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createAnexoRtSchema }),
  maintainerAnexosRtController.create,
);

maintainerAnexosRtRouter.patch(
  "/:anexoRtId",
  requireMaintainerApiKey,
  validateSchema({ params: anexoRtParamsSchema, body: patchAnexoRtSchema }),
  maintainerAnexosRtController.patch,
);

maintainerAnexosRtRouter.delete(
  "/:anexoRtId",
  requireMaintainerApiKey,
  validateSchema({
    params: anexoRtParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerAnexosRtController.remove,
);

export { maintainerAnexosRtRouter };
