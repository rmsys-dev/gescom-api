import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { addressesStatesController } from "./controller.js";
import {
  createStateSchema,
  listStatesQuerySchema,
  patchStateSchema,
  stateParamsSchema,
} from "./schema.js";

const addressesStatesRouter = Router();

addressesStatesRouter.get(
  "/",
  authMiddleware,
  validateSchema({ query: listStatesQuerySchema }),
  addressesStatesController.list,
);

addressesStatesRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_enderecos"),
  validateSchema({ body: createStateSchema }),
  addressesStatesController.create,
);

addressesStatesRouter.patch(
  "/:stateId",
  authMiddleware,
  requirePermission("alterar_enderecos"),
  validateSchema({
    params: stateParamsSchema,
    body: patchStateSchema,
  }),
  addressesStatesController.patch,
);

export { addressesStatesRouter };
