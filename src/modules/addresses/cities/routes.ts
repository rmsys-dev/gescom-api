import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { addressesCitiesController } from "./controller.js";
import { listCitiesQuerySchema } from "./schema.js";

const addressesCitiesRouter = Router();

addressesCitiesRouter.get(
  "/",
  authMiddleware,
  validateSchema({ query: listCitiesQuerySchema }),
  addressesCitiesController.list,
);

export { addressesCitiesRouter };
