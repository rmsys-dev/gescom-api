import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { addressesCountriesController } from "./controller.js";
import { listCountriesQuerySchema } from "./schema.js";

const addressesCountriesRouter = Router();

addressesCountriesRouter.get(
  "/",
  authMiddleware,
  validateSchema({ query: listCountriesQuerySchema }),
  addressesCountriesController.list,
);

export { addressesCountriesRouter };
