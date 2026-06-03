import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { stockSectorsRentalController } from "./controller.js";
import {
  createStockSectorRentalSchema,
  listStockSectorsRentalQuerySchema,
  patchStockSectorRentalSchema,
  stockSectorRentalParamsSchema,
} from "./schema.js";

const stockSectorsRentalRouter = Router();

stockSectorsRentalRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_saldos_estoque"),
  validateSchema({ query: listStockSectorsRentalQuerySchema }),
  stockSectorsRentalController.list,
);

stockSectorsRentalRouter.get(
  "/:stockSectorRentalId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_saldos_estoque"),
  validateSchema({
    params: stockSectorRentalParamsSchema,
    query: emptyQuerySchema,
  }),
  stockSectorsRentalController.getById,
);

stockSectorsRentalRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_saldos_estoque"),
  validateSchema({ body: createStockSectorRentalSchema }),
  stockSectorsRentalController.create,
);

stockSectorsRentalRouter.patch(
  "/:stockSectorRentalId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_saldos_estoque"),
  validateSchema({
    params: stockSectorRentalParamsSchema,
    body: patchStockSectorRentalSchema,
  }),
  stockSectorsRentalController.patch,
);

stockSectorsRentalRouter.delete(
  "/:stockSectorRentalId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_saldos_estoque"),
  validateSchema({
    params: stockSectorRentalParamsSchema,
    query: emptyQuerySchema,
  }),
  stockSectorsRentalController.delete,
);

export { stockSectorsRentalRouter };
