import { Router } from "express";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { requireMaintainerApiKey } from "../require-maintainer-api-key.js";
import { maintainerModulesController } from "./controller.js";
import {
  createModuleSchema,
  moduleParamsSchema,
  patchModuleSchema,
} from "./schema.js";

const maintainerModulesRouter = Router();

maintainerModulesRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createModuleSchema }),
  maintainerModulesController.create,
);

maintainerModulesRouter.patch(
  "/:moduleId",
  requireMaintainerApiKey,
  validateSchema({
    params: moduleParamsSchema,
    body: patchModuleSchema,
  }),
  maintainerModulesController.patch,
);

export { maintainerModulesRouter };
