import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { typeFlagsController } from "./controller.js";
import {
  createTypeFlagSchema,
  listTypeFlagsQuerySchema,
  patchTypeFlagSchema,
  typeFlagParamsSchema,
} from "./schema.js";

const typeFlagsRouter = Router();

typeFlagsRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_tipos_pagamento"),
  validateSchema({ query: listTypeFlagsQuerySchema }),
  typeFlagsController.list,
);

typeFlagsRouter.get(
  "/:typeFlagId",
  authMiddleware,
  requirePermission("consultar_tipos_pagamento"),
  validateSchema({
    params: typeFlagParamsSchema,
    query: emptyQuerySchema,
  }),
  typeFlagsController.getById,
);

typeFlagsRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_tipos_pagamento"),
  validateSchema({ body: createTypeFlagSchema }),
  typeFlagsController.create,
);

typeFlagsRouter.patch(
  "/:typeFlagId",
  authMiddleware,
  requirePermission("alterar_tipos_pagamento"),
  validateSchema({
    params: typeFlagParamsSchema,
    body: patchTypeFlagSchema,
  }),
  typeFlagsController.patch,
);

typeFlagsRouter.delete(
  "/:typeFlagId",
  authMiddleware,
  requirePermission("excluir_tipos_pagamento"),
  validateSchema({
    params: typeFlagParamsSchema,
    query: emptyQuerySchema,
  }),
  typeFlagsController.delete,
);

export { typeFlagsRouter };
