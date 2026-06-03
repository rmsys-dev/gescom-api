import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { pricesController } from "./controller.js";
import {
  createPriceSchema,
  listPricesQuerySchema,
  patchPriceSchema,
  priceParamsSchema,
} from "./schema.js";

const pricesRouter = Router();

pricesRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_precos"),
  validateSchema({ query: listPricesQuerySchema }),
  pricesController.list,
);

pricesRouter.get(
  "/:priceId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_precos"),
  validateSchema({ params: priceParamsSchema, query: emptyQuerySchema }),
  pricesController.getById,
);

pricesRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_precos"),
  validateSchema({ body: createPriceSchema }),
  pricesController.create,
);

pricesRouter.patch(
  "/:priceId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_precos"),
  validateSchema({ params: priceParamsSchema, body: patchPriceSchema }),
  pricesController.patch,
);

pricesRouter.delete(
  "/:priceId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_precos"),
  validateSchema({ params: priceParamsSchema, query: emptyQuerySchema }),
  pricesController.delete,
);

export { pricesRouter };
