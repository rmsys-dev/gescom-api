import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { sectorsRentalController } from "./controller.js";
import {
  createSectorRentalSchema,
  listSectorsRentalQuerySchema,
  patchSectorRentalSchema,
  sectorRentalParamsSchema,
} from "./schema.js";

const sectorsRentalRouter = Router();

sectorsRentalRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_saldos_estoque"),
  validateSchema({ query: listSectorsRentalQuerySchema }),
  sectorsRentalController.list,
);

sectorsRentalRouter.get(
  "/:sectorRentalId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_saldos_estoque"),
  validateSchema({
    params: sectorRentalParamsSchema,
    query: emptyQuerySchema,
  }),
  sectorsRentalController.getById,
);

sectorsRentalRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_saldos_estoque"),
  validateSchema({ body: createSectorRentalSchema }),
  sectorsRentalController.create,
);

sectorsRentalRouter.patch(
  "/:sectorRentalId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_saldos_estoque"),
  validateSchema({
    params: sectorRentalParamsSchema,
    body: patchSectorRentalSchema,
  }),
  sectorsRentalController.patch,
);

sectorsRentalRouter.delete(
  "/:sectorRentalId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_saldos_estoque"),
  validateSchema({
    params: sectorRentalParamsSchema,
    query: emptyQuerySchema,
  }),
  sectorsRentalController.delete,
);

export { sectorsRentalRouter };
