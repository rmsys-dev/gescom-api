import { Router } from "express";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { requireMaintainerApiKey } from "../shared/require-maintainer-api-key.js";
import { maintainerCitiesController } from "./controller.js";
import {
  cityParamsSchema,
  createCitySchema,
  patchCitySchema,
} from "./schema.js";

const maintainerCitiesRouter = Router();

maintainerCitiesRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createCitySchema }),
  maintainerCitiesController.create,
);

maintainerCitiesRouter.patch(
  "/:cityId",
  requireMaintainerApiKey,
  validateSchema({
    params: cityParamsSchema,
    body: patchCitySchema,
  }),
  maintainerCitiesController.patch,
);

export { maintainerCitiesRouter };
