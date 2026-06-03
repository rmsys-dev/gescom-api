import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { pisCofinsSituationController } from "./controller.js";
import {
  createPisCofinsSituationSchema,
  listPisCofinsSituationQuerySchema,
  patchPisCofinsSituationSchema,
  pisCofinsSituationParamsSchema,
} from "./schema.js";

const pisCofinsSituationRouter = Router();

pisCofinsSituationRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_situacao_pis_cofins"),
  validateSchema({ query: listPisCofinsSituationQuerySchema }),
  pisCofinsSituationController.list,
);

pisCofinsSituationRouter.get(
  "/:pisCofinsSituationId",
  authMiddleware,
  requirePermission("consultar_situacao_pis_cofins"),
  validateSchema({ params: pisCofinsSituationParamsSchema, query: emptyQuerySchema }),
  pisCofinsSituationController.getById,
);

pisCofinsSituationRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_situacao_pis_cofins"),
  validateSchema({ body: createPisCofinsSituationSchema }),
  pisCofinsSituationController.create,
);

pisCofinsSituationRouter.patch(
  "/:pisCofinsSituationId",
  authMiddleware,
  requirePermission("alterar_situacao_pis_cofins"),
  validateSchema({
    params: pisCofinsSituationParamsSchema,
    body: patchPisCofinsSituationSchema,
  }),
  pisCofinsSituationController.patch,
);

pisCofinsSituationRouter.delete(
  "/:pisCofinsSituationId",
  authMiddleware,
  requirePermission("excluir_situacao_pis_cofins"),
  validateSchema({ params: pisCofinsSituationParamsSchema, query: emptyQuerySchema }),
  pisCofinsSituationController.delete,
);

export { pisCofinsSituationRouter };
