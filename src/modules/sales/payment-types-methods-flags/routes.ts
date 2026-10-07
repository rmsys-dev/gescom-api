import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { paymentTypesMethodsFlagsController } from "./controller.js";
import {
  createPaymentTypesMethodsFlagsSchema,
  listPaymentTypesMethodsFlagsQuerySchema,
  patchPaymentTypesMethodsFlagsSchema,
  paymentTypesMethodsFlagsParamsSchema,
} from "./schema.js";

const paymentTypesMethodsFlagsRouter = Router();

paymentTypesMethodsFlagsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_tipos_pagamento"),
  validateSchema({ query: listPaymentTypesMethodsFlagsQuerySchema }),
  paymentTypesMethodsFlagsController.list,
);

paymentTypesMethodsFlagsRouter.get(
  "/:paymentConfigId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_tipos_pagamento"),
  validateSchema({
    params: paymentTypesMethodsFlagsParamsSchema,
    query: emptyQuerySchema,
  }),
  paymentTypesMethodsFlagsController.getById,
);

paymentTypesMethodsFlagsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_tipos_pagamento"),
  validateSchema({ body: createPaymentTypesMethodsFlagsSchema }),
  paymentTypesMethodsFlagsController.create,
);

paymentTypesMethodsFlagsRouter.patch(
  "/:paymentConfigId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_tipos_pagamento"),
  validateSchema({
    params: paymentTypesMethodsFlagsParamsSchema,
    body: patchPaymentTypesMethodsFlagsSchema,
  }),
  paymentTypesMethodsFlagsController.patch,
);

paymentTypesMethodsFlagsRouter.delete(
  "/:paymentConfigId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_tipos_pagamento"),
  validateSchema({
    params: paymentTypesMethodsFlagsParamsSchema,
    query: emptyQuerySchema,
  }),
  paymentTypesMethodsFlagsController.delete,
);

export { paymentTypesMethodsFlagsRouter };
