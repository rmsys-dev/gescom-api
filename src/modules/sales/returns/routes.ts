import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { salesReturnsController } from "./controller.js";
import {
  createFullReturnSchema,
  createPartialReturnSchema,
  salesReturnIdParamsSchema,
} from "./schema.js";
import { saleParamsSchema } from "../schema.js";

const salesReturnsRouter = Router({ mergeParams: true });

salesReturnsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_devolucoes_vendas"),
  validateSchema({ params: saleParamsSchema, query: emptyQuerySchema }),
  salesReturnsController.list,
);

salesReturnsRouter.post(
  "/partial",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_devolucoes_vendas"),
  validateSchema({
    params: saleParamsSchema,
    body: createPartialReturnSchema,
    query: emptyQuerySchema,
  }),
  salesReturnsController.createPartial,
);

salesReturnsRouter.post(
  "/full",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_devolucoes_vendas"),
  validateSchema({
    params: saleParamsSchema,
    body: createFullReturnSchema,
    query: emptyQuerySchema,
  }),
  salesReturnsController.createFull,
);

salesReturnsRouter.get(
  "/:salesReturnId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_devolucoes_vendas"),
  validateSchema({
    params: salesReturnIdParamsSchema,
    query: emptyQuerySchema,
  }),
  salesReturnsController.getById,
);

export { salesReturnsRouter };
