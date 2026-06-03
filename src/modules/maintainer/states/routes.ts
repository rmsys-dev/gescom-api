import { Router } from "express";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { requireMaintainerApiKey } from "../shared/require-maintainer-api-key.js";
import { maintainerStatesController } from "./controller.js";
import {
  createStateSchema,
  patchStateSchema,
  stateParamsSchema,
} from "./schema.js";

const maintainerStatesRouter = Router();

maintainerStatesRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createStateSchema }),
  maintainerStatesController.create,
);

maintainerStatesRouter.patch(
  "/:stateId",
  requireMaintainerApiKey,
  validateSchema({
    params: stateParamsSchema,
    body: patchStateSchema,
  }),
  maintainerStatesController.patch,
);

export { maintainerStatesRouter };
