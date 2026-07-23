import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
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

vehiclesEnterprisesMembersRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_veiculos_membros"),
  validateSchema({ query: listVehiclesEnterprisesMembersQuerySchema }),
  vehiclesEnterprisesMembersController.list,
);

vehiclesEnterprisesMembersRouter.get(
  "/:vehiclesEnterprisesMemberId",
  authMiddleware,
  tenantMiddleware,
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
  requirePermission("incluir_veiculos_membros"),
  validateSchema({ body: createVehiclesEnterprisesMemberSchema }),
  vehiclesEnterprisesMembersController.create,
);

vehiclesEnterprisesMembersRouter.patch(
  "/:vehiclesEnterprisesMemberId",
  authMiddleware,
  tenantMiddleware,
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
  requirePermission("excluir_veiculos_membros"),
  validateSchema({
    params: vehiclesEnterprisesMemberParamsSchema,
    query: emptyQuerySchema,
  }),
  vehiclesEnterprisesMembersController.delete,
);

export { vehiclesEnterprisesMembersRouter };
