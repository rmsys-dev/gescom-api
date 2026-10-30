import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { sectorsController } from "./controller.js";
import {
  createSectorSchema,
  listSectorsQuerySchema,
  patchSectorSchema,
  sectorParamsSchema,
} from "./schema.js";

const sectorsRouter = Router();

sectorsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_setores"),
  validateSchema({ query: listSectorsQuerySchema }),
  sectorsController.list,
);

sectorsRouter.get(
  "/:sectorId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_setores"),
  validateSchema({ params: sectorParamsSchema, query: emptyQuerySchema }),
  sectorsController.getById,
);

sectorsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_setores"),
  validateSchema({ body: createSectorSchema }),
  sectorsController.create,
);

sectorsRouter.patch(
  "/:sectorId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_setores"),
  validateSchema({
    params: sectorParamsSchema,
    body: patchSectorSchema,
  }),
  sectorsController.patch,
);

sectorsRouter.delete(
  "/:sectorId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_setores"),
  validateSchema({ params: sectorParamsSchema, query: emptyQuerySchema }),
  sectorsController.delete,
);

export { sectorsRouter };
