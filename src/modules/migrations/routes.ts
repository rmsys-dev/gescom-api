import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { migrationsController } from "./controller.js";
import { listMigrationSalesQuerySchema } from "./schema.js";

const migrationsRouter = Router();

migrationsRouter.get(
  "/sales",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_vendas"),
  validateSchema({ query: listMigrationSalesQuerySchema }),
  migrationsController.listSales,
);

export { migrationsRouter };
