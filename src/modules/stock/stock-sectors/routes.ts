import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { stockSectorsController } from "./controller.js";
import {
  createStockSectorSchema,
  listStockSectorsQuerySchema,
  patchStockSectorSchema,
  stockSectorParamsSchema,
} from "./schema.js";

const stockSectorsRouter = Router();

stockSectorsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_setores_estoque"),
  validateSchema({ query: listStockSectorsQuerySchema }),
  stockSectorsController.list,
);

stockSectorsRouter.get(
  "/:stockSectorId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_setores_estoque"),
  validateSchema({ params: stockSectorParamsSchema, query: emptyQuerySchema }),
  stockSectorsController.getById,
);

stockSectorsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_setores_estoque"),
  validateSchema({ body: createStockSectorSchema }),
  stockSectorsController.create,
);

stockSectorsRouter.patch(
  "/:stockSectorId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_setores_estoque"),
  validateSchema({
    params: stockSectorParamsSchema,
    body: patchStockSectorSchema,
  }),
  stockSectorsController.patch,
);

stockSectorsRouter.delete(
  "/:stockSectorId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_setores_estoque"),
  validateSchema({ params: stockSectorParamsSchema, query: emptyQuerySchema }),
  stockSectorsController.delete,
);

export { stockSectorsRouter };
