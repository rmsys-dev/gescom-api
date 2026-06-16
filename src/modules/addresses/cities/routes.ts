import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { addressesCitiesController } from "./controller.js";
import {
  cityParamsSchema,
  createCitySchema,
  listCitiesQuerySchema,
  patchCitySchema,
} from "./schema.js";

const addressesCitiesRouter = Router();

addressesCitiesRouter.get(
  "/",
  authMiddleware,
  validateSchema({ query: listCitiesQuerySchema }),
  addressesCitiesController.list,
);

addressesCitiesRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_enderecos"),
  validateSchema({ body: createCitySchema }),
  addressesCitiesController.create,
);

addressesCitiesRouter.patch(
  "/:cityId",
  authMiddleware,
  requirePermission("alterar_enderecos"),
  validateSchema({
    params: cityParamsSchema,
    body: patchCitySchema,
  }),
  addressesCitiesController.patch,
);

export { addressesCitiesRouter };
