import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { icmsTaxationController } from "./controller.js";
import {
  icmsTaxationParamsSchema,
  listIcmsTaxationQuerySchema,
} from "./schema.js";

const icmsTaxationRouter = Router();

icmsTaxationRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_tributacao_icms"),
  validateSchema({ query: listIcmsTaxationQuerySchema }),
  icmsTaxationController.list,
);

icmsTaxationRouter.get(
  "/:icmsTaxationId",
  authMiddleware,
  requirePermission("consultar_tributacao_icms"),
  validateSchema({ params: icmsTaxationParamsSchema, query: emptyQuerySchema }),
  icmsTaxationController.getById,
);

export { icmsTaxationRouter };
