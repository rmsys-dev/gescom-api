import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { addressesCepsController } from "./controller.js";
import { listCepsQuerySchema } from "./schema.js";

const addressesCepsRouter = Router();

addressesCepsRouter.get(
  "/",
  authMiddleware,
  validateSchema({ query: listCepsQuerySchema }),
  addressesCepsController.list,
);

export { addressesCepsRouter };
