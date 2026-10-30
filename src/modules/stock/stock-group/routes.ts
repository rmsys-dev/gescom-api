import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { stockGroupController } from "./controller.js";
import { listStockGroupQuerySchema } from "./schema.js";

const stockGroupRouter = Router();

stockGroupRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_estoque_grupo"),
  validateSchema({ query: listStockGroupQuerySchema }),
  stockGroupController.list,
);

export { stockGroupRouter };
