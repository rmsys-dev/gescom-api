import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { paymentTypesController } from "./controller.js";
import {
  createPaymentTypeSchema,
  listPaymentTypesQuerySchema,
  patchPaymentTypeSchema,
  paymentTypeParamsSchema,
} from "./schema.js";

const paymentTypesRouter = Router();

paymentTypesRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_tipos_pagamento"),
  validateSchema({ query: listPaymentTypesQuerySchema }),
  paymentTypesController.list,
);

paymentTypesRouter.get(
  "/:paymentTypeId",
  authMiddleware,
  requirePermission("consultar_tipos_pagamento"),
  validateSchema({
    params: paymentTypeParamsSchema,
    query: emptyQuerySchema,
  }),
  paymentTypesController.getById,
);

paymentTypesRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_tipos_pagamento"),
  validateSchema({ body: createPaymentTypeSchema }),
  paymentTypesController.create,
);

paymentTypesRouter.patch(
  "/:paymentTypeId",
  authMiddleware,
  requirePermission("alterar_tipos_pagamento"),
  validateSchema({
    params: paymentTypeParamsSchema,
    body: patchPaymentTypeSchema,
  }),
  paymentTypesController.patch,
);

paymentTypesRouter.delete(
  "/:paymentTypeId",
  authMiddleware,
  requirePermission("excluir_tipos_pagamento"),
  validateSchema({
    params: paymentTypeParamsSchema,
    query: emptyQuerySchema,
  }),
  paymentTypesController.delete,
);

export { paymentTypesRouter };
