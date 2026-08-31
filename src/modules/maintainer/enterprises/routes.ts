import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../shared/validation/common-schemas.js";
import { patchEnterpriseParametersSchema } from "../../enterprises/parameters/schema.js";
import { maintainerEnterprisesController } from "./controller.js";
import { requireMaintainerApiKey } from "../require-maintainer-api-key.js";
import { createEnterpriseSchema, enterpriseParamsSchema } from "./schema.js";

const maintainerEnterprisesRouter = Router();

maintainerEnterprisesRouter.post(
  "/",
  requireMaintainerApiKey,
  authMiddleware,
  validateSchema({ body: createEnterpriseSchema }),
  maintainerEnterprisesController.create,
);

maintainerEnterprisesRouter.patch(
  "/:enterpriseId/parameters",
  requireMaintainerApiKey,
  validateSchema({
    params: enterpriseParamsSchema,
    body: patchEnterpriseParametersSchema,
    query: emptyQuerySchema,
  }),
  maintainerEnterprisesController.patchParameters,
);

maintainerEnterprisesRouter.delete(
  "/:enterpriseId",
  requireMaintainerApiKey,
  validateSchema({
    params: enterpriseParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerEnterprisesController.remove,
);

export { maintainerEnterprisesRouter };
