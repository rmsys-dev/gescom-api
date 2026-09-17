import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerUnitsController } from "./controller.js";
import {
  createUnitSchema,
  patchUnitSchema,
  unitParamsSchema,
} from "./schema.js";

const maintainerUnitsRouter = Router();

maintainerUnitsRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createUnitSchema }),
  maintainerUnitsController.create,
);

maintainerUnitsRouter.patch(
  "/:unitId",
  requireMaintainerApiKey,
  validateSchema({
    params: unitParamsSchema,
    body: patchUnitSchema,
  }),
  maintainerUnitsController.patch,
);

maintainerUnitsRouter.delete(
  "/:unitId",
  requireMaintainerApiKey,
  validateSchema({
    params: unitParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerUnitsController.remove,
);

export { maintainerUnitsRouter };
