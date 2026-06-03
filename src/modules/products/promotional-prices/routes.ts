import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { promotionalPricesController } from "./controller.js";
import {
  createPromotionalPriceSchema,
  listPromotionalPricesQuerySchema,
  patchPromotionalPriceSchema,
  promotionalPriceParamsSchema,
} from "./schema.js";

const promotionalPricesRouter = Router();

promotionalPricesRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_precos_promocionais"),
  validateSchema({ query: listPromotionalPricesQuerySchema }),
  promotionalPricesController.list,
);

promotionalPricesRouter.get(
  "/:promotionalPriceId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_precos_promocionais"),
  validateSchema({ params: promotionalPriceParamsSchema, query: emptyQuerySchema }),
  promotionalPricesController.getById,
);

promotionalPricesRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_precos_promocionais"),
  validateSchema({ body: createPromotionalPriceSchema }),
  promotionalPricesController.create,
);

promotionalPricesRouter.patch(
  "/:promotionalPriceId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_precos_promocionais"),
  validateSchema({
    params: promotionalPriceParamsSchema,
    body: patchPromotionalPriceSchema,
  }),
  promotionalPricesController.patch,
);

promotionalPricesRouter.delete(
  "/:promotionalPriceId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_precos_promocionais"),
  validateSchema({ params: promotionalPriceParamsSchema, query: emptyQuerySchema }),
  promotionalPricesController.delete,
);

export { promotionalPricesRouter };
