import { Router } from "express";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { requireMaintainerApiKey } from "../shared/require-maintainer-api-key.js";
import { maintainerCountriesController } from "./controller.js";
import {
  countryParamsSchema,
  createCountrySchema,
  patchCountrySchema,
} from "./schema.js";

const maintainerCountriesRouter = Router();

maintainerCountriesRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createCountrySchema }),
  maintainerCountriesController.create,
);

maintainerCountriesRouter.patch(
  "/:countryId",
  requireMaintainerApiKey,
  validateSchema({
    params: countryParamsSchema,
    body: patchCountrySchema,
  }),
  maintainerCountriesController.patch,
);

export { maintainerCountriesRouter };
