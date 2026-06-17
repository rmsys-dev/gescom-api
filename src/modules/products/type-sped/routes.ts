import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { typeSpedController } from "./controller.js";
import {
  createTypeSpedSchema,
  listTypeSpedQuerySchema,
  patchTypeSpedSchema,
  typeSpedParamsSchema,
} from "./schema.js";

const typeSpedRouter = Router();

typeSpedRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_tipos_sped"),
  validateSchema({ query: listTypeSpedQuerySchema }),
  typeSpedController.list,
);

typeSpedRouter.get(
  "/:typeSpedId",
  authMiddleware,
  requirePermission("consultar_tipos_sped"),
  validateSchema({ params: typeSpedParamsSchema, query: emptyQuerySchema }),
  typeSpedController.getById,
);

typeSpedRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_tipos_sped"),
  validateSchema({ body: createTypeSpedSchema }),
  typeSpedController.create,
);

typeSpedRouter.patch(
  "/:typeSpedId",
  authMiddleware,
  requirePermission("alterar_tipos_sped"),
  validateSchema({
    params: typeSpedParamsSchema,
    body: patchTypeSpedSchema,
  }),
  typeSpedController.patch,
);

typeSpedRouter.delete(
  "/:typeSpedId",
  authMiddleware,
  requirePermission("excluir_tipos_sped"),
  validateSchema({ params: typeSpedParamsSchema, query: emptyQuerySchema }),
  typeSpedController.delete,
);

export { typeSpedRouter };
