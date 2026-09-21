import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { patchNfeParametersSchema } from "../../../nfe/parameters/schema.js";
import { maintainerNfeParametersController } from "./controller.js";

const maintainerNfeParametersRouter = Router();

maintainerNfeParametersRouter.get(
  "/",
  requireMaintainerApiKey,
  validateSchema({ query: emptyQuerySchema }),
  maintainerNfeParametersController.list,
);

maintainerNfeParametersRouter.patch(
  "/",
  requireMaintainerApiKey,
  validateSchema({
    body: patchNfeParametersSchema,
    query: emptyQuerySchema,
  }),
  maintainerNfeParametersController.patch,
);

export { maintainerNfeParametersRouter };
