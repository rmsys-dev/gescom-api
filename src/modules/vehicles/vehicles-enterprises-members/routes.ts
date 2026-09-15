import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requireParameter } from "../../../shared/middleware/parameter-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { vehiclesEnterprisesMembersController } from "./controller.js";
import {
  createVehiclesEnterprisesMemberSchema,
  listVehiclesEnterprisesMembersQuerySchema,
  patchVehiclesEnterprisesMemberSchema,
  vehiclesEnterprisesMemberParamsSchema,
} from "./schema.js";

const vehiclesEnterprisesMembersRouter = Router();
const requireOs = requireParameter("trabalha_os");

vehiclesEnterprisesMembersRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("consultar_veiculos_membros"),
  validateSchema({ query: listVehiclesEnterprisesMembersQuerySchema }),
  vehiclesEnterprisesMembersController.list,
);

vehiclesEnterprisesMembersRouter.get(
  "/:vehiclesEnterprisesMemberId",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("consultar_veiculos_membros"),
  validateSchema({
    params: vehiclesEnterprisesMemberParamsSchema,
    query: emptyQuerySchema,
  }),
  vehiclesEnterprisesMembersController.getById,
);

vehiclesEnterprisesMembersRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("incluir_veiculos_membros"),
  validateSchema({ body: createVehiclesEnterprisesMemberSchema }),
  vehiclesEnterprisesMembersController.create,
);

vehiclesEnterprisesMembersRouter.patch(
  "/:vehiclesEnterprisesMemberId",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("alterar_veiculos_membros"),
  validateSchema({
    params: vehiclesEnterprisesMemberParamsSchema,
    body: patchVehiclesEnterprisesMemberSchema,
  }),
  vehiclesEnterprisesMembersController.patch,
);

vehiclesEnterprisesMembersRouter.delete(
  "/:vehiclesEnterprisesMemberId",
  authMiddleware,
  tenantMiddleware,
  requireOs,
  requirePermission("excluir_veiculos_membros"),
  validateSchema({
    params: vehiclesEnterprisesMemberParamsSchema,
    query: emptyQuerySchema,
  }),
  vehiclesEnterprisesMembersController.delete,
);

export { vehiclesEnterprisesMembersRouter };
