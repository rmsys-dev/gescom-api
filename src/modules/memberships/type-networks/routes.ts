import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { typeNetworksController } from "./controller.js";
import {
  createTypeNetworkSchema,
  listTypeNetworksQuerySchema,
  patchTypeNetworkSchema,
  typeNetworkParamsSchema,
} from "./schema.js";

const typeNetworksRouter = Router();

typeNetworksRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_tipos_rede"),
  validateSchema({ query: listTypeNetworksQuerySchema }),
  typeNetworksController.list,
);

typeNetworksRouter.get(
  "/:typeNetworkId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_tipos_rede"),
  validateSchema({
    params: typeNetworkParamsSchema,
    query: emptyQuerySchema,
  }),
  typeNetworksController.getById,
);

typeNetworksRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_tipos_rede"),
  validateSchema({ body: createTypeNetworkSchema }),
  typeNetworksController.create,
);

typeNetworksRouter.patch(
  "/:typeNetworkId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_tipos_rede"),
  validateSchema({
    params: typeNetworkParamsSchema,
    body: patchTypeNetworkSchema,
  }),
  typeNetworksController.patch,
);

typeNetworksRouter.delete(
  "/:typeNetworkId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_tipos_rede"),
  validateSchema({
    params: typeNetworkParamsSchema,
    query: emptyQuerySchema,
  }),
  typeNetworksController.delete,
);

export { typeNetworksRouter };
