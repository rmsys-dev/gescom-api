import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { icmsTaxationController } from "./controller.js";
import {
  createIcmsTaxationSchema,
  icmsTaxationParamsSchema,
  listIcmsTaxationQuerySchema,
  patchIcmsTaxationSchema,
} from "./schema.js";

const icmsTaxationRouter = Router();

icmsTaxationRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_tributacao_icms"),
  validateSchema({ query: listIcmsTaxationQuerySchema }),
  icmsTaxationController.list,
);

icmsTaxationRouter.get(
  "/:icmsTaxationId",
  authMiddleware,
  requirePermission("consultar_tributacao_icms"),
  validateSchema({ params: icmsTaxationParamsSchema, query: emptyQuerySchema }),
  icmsTaxationController.getById,
);

icmsTaxationRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_tributacao_icms"),
  validateSchema({ body: createIcmsTaxationSchema }),
  icmsTaxationController.create,
);

icmsTaxationRouter.patch(
  "/:icmsTaxationId",
  authMiddleware,
  requirePermission("alterar_tributacao_icms"),
  validateSchema({
    params: icmsTaxationParamsSchema,
    body: patchIcmsTaxationSchema,
  }),
  icmsTaxationController.patch,
);

icmsTaxationRouter.delete(
  "/:icmsTaxationId",
  authMiddleware,
  requirePermission("excluir_tributacao_icms"),
  validateSchema({ params: icmsTaxationParamsSchema, query: emptyQuerySchema }),
  icmsTaxationController.delete,
);

export { icmsTaxationRouter };
