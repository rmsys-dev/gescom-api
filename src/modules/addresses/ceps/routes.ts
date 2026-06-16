import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { addressesCepsController } from "./controller.js";
import {
  cepParamsSchema,
  createCepSchema,
  listCepsQuerySchema,
  patchCepSchema,
} from "./schema.js";

const addressesCepsRouter = Router();

addressesCepsRouter.get(
  "/",
  authMiddleware,
  validateSchema({ query: listCepsQuerySchema }),
  addressesCepsController.list,
);

addressesCepsRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_enderecos"),
  validateSchema({ body: createCepSchema }),
  addressesCepsController.create,
);

addressesCepsRouter.patch(
  "/:cepId",
  authMiddleware,
  requirePermission("alterar_enderecos"),
  validateSchema({
    params: cepParamsSchema,
    body: patchCepSchema,
  }),
  addressesCepsController.patch,
);

export { addressesCepsRouter };
