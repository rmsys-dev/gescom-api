import { Router } from "express";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { requireMaintainerApiKey } from "../shared/require-maintainer-api-key.js";
import { maintainerCepsController } from "./controller.js";
import {
  cepParamsSchema,
  createCepSchema,
  patchCepSchema,
} from "./schema.js";

const maintainerCepsRouter = Router();

maintainerCepsRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createCepSchema }),
  maintainerCepsController.create,
);

maintainerCepsRouter.patch(
  "/:cepId",
  requireMaintainerApiKey,
  validateSchema({
    params: cepParamsSchema,
    body: patchCepSchema,
  }),
  maintainerCepsController.patch,
);

export { maintainerCepsRouter };
