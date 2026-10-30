import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { addressesStatesDivisionsController } from "./controller.js";
import {
  createStateDivisionSchema,
  listStatesDivisionsQuerySchema,
  patchStateDivisionSchema,
  stateDivisionParamsSchema,
} from "./schema.js";

const addressesStatesDivisionsRouter = Router();

addressesStatesDivisionsRouter.get(
  "/",
  authMiddleware,
  validateSchema({ query: listStatesDivisionsQuerySchema }),
  addressesStatesDivisionsController.list,
);

addressesStatesDivisionsRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_enderecos"),
  validateSchema({ body: createStateDivisionSchema }),
  addressesStatesDivisionsController.create,
);

addressesStatesDivisionsRouter.patch(
  "/:stateDivisionId",
  authMiddleware,
  requirePermission("alterar_enderecos"),
  validateSchema({
    params: stateDivisionParamsSchema,
    body: patchStateDivisionSchema,
  }),
  addressesStatesDivisionsController.patch,
);

export { addressesStatesDivisionsRouter };
