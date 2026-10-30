import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerIcmsTaxationController } from "./controller.js";
import {
  createIcmsTaxationSchema,
  icmsTaxationParamsSchema,
  patchIcmsTaxationSchema,
} from "./schema.js";

const maintainerIcmsTaxationRouter = Router();

maintainerIcmsTaxationRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createIcmsTaxationSchema }),
  maintainerIcmsTaxationController.create,
);

maintainerIcmsTaxationRouter.patch(
  "/:icmsTaxationId",
  requireMaintainerApiKey,
  validateSchema({
    params: icmsTaxationParamsSchema,
    body: patchIcmsTaxationSchema,
  }),
  maintainerIcmsTaxationController.patch,
);

maintainerIcmsTaxationRouter.delete(
  "/:icmsTaxationId",
  requireMaintainerApiKey,
  validateSchema({
    params: icmsTaxationParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerIcmsTaxationController.remove,
);

export { maintainerIcmsTaxationRouter };
