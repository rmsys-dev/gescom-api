import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../shared/validation/common-schemas.js";
import { entityAuditLogController } from "./controller.js";
import {
  entityAuditLogParamsSchema,
  listEntityAuditLogQuerySchema,
} from "./schema.js";

const entityAuditLogRouter = Router();

entityAuditLogRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("gerenciais_auditoria"),
  validateSchema({ query: listEntityAuditLogQuerySchema }),
  entityAuditLogController.list,
);

entityAuditLogRouter.get(
  "/actors",
  authMiddleware,
  tenantMiddleware,
  requirePermission("gerenciais_auditoria"),
  validateSchema({ query: emptyQuerySchema }),
  entityAuditLogController.actors,
);

entityAuditLogRouter.get(
  "/:entityAuditLogId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("gerenciais_auditoria"),
  validateSchema({ params: entityAuditLogParamsSchema, query: emptyQuerySchema }),
  entityAuditLogController.getById,
);

export { entityAuditLogRouter };
