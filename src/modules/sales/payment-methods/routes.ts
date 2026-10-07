import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { paymentMethodsController } from "./controller.js";
import {
  createPaymentMethodSchema,
  listPaymentMethodsQuerySchema,
  patchPaymentMethodSchema,
  paymentMethodParamsSchema,
} from "./schema.js";

const paymentMethodsRouter = Router();

paymentMethodsRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_tipos_pagamento"),
  validateSchema({ query: listPaymentMethodsQuerySchema }),
  paymentMethodsController.list,
);

paymentMethodsRouter.get(
  "/:paymentMethodId",
  authMiddleware,
  requirePermission("consultar_tipos_pagamento"),
  validateSchema({
    params: paymentMethodParamsSchema,
    query: emptyQuerySchema,
  }),
  paymentMethodsController.getById,
);

paymentMethodsRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_tipos_pagamento"),
  validateSchema({ body: createPaymentMethodSchema }),
  paymentMethodsController.create,
);

paymentMethodsRouter.patch(
  "/:paymentMethodId",
  authMiddleware,
  requirePermission("alterar_tipos_pagamento"),
  validateSchema({
    params: paymentMethodParamsSchema,
    body: patchPaymentMethodSchema,
  }),
  paymentMethodsController.patch,
);

paymentMethodsRouter.delete(
  "/:paymentMethodId",
  authMiddleware,
  requirePermission("excluir_tipos_pagamento"),
  validateSchema({
    params: paymentMethodParamsSchema,
    query: emptyQuerySchema,
  }),
  paymentMethodsController.delete,
);

export { paymentMethodsRouter };
