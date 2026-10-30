import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../shared/validation/common-schemas.js";
import { printersController } from "./controller.js";
import {
  createPrinterSchema,
  listPrintersQuerySchema,
  patchPrinterSchema,
  printerParamsSchema,
} from "./schema.js";

const printersRouter = Router();

printersRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_impressoras"),
  validateSchema({ query: listPrintersQuerySchema }),
  printersController.list,
);

printersRouter.get(
  "/:printerId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_impressoras"),
  validateSchema({ params: printerParamsSchema, query: emptyQuerySchema }),
  printersController.getById,
);

printersRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_impressoras"),
  validateSchema({ body: createPrinterSchema }),
  printersController.create,
);

printersRouter.patch(
  "/:printerId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_impressoras"),
  validateSchema({ params: printerParamsSchema, body: patchPrinterSchema }),
  printersController.patch,
);

printersRouter.delete(
  "/:printerId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_impressoras"),
  validateSchema({ params: printerParamsSchema, query: emptyQuerySchema }),
  printersController.delete,
);

export { printersRouter };
