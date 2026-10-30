import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { addressesCountriesController } from "./controller.js";
import {
  countryParamsSchema,
  createCountrySchema,
  listCountriesQuerySchema,
  patchCountrySchema,
} from "./schema.js";

const addressesCountriesRouter = Router();

addressesCountriesRouter.get(
  "/",
  authMiddleware,
  validateSchema({ query: listCountriesQuerySchema }),
  addressesCountriesController.list,
);

addressesCountriesRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_enderecos"),
  validateSchema({ body: createCountrySchema }),
  addressesCountriesController.create,
);

addressesCountriesRouter.patch(
  "/:countryId",
  authMiddleware,
  requirePermission("alterar_enderecos"),
  validateSchema({
    params: countryParamsSchema,
    body: patchCountrySchema,
  }),
  addressesCountriesController.patch,
);

export { addressesCountriesRouter };
