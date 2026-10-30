import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { enterpriseAddressesController } from "./controller.js";
import {
  createEnterpriseAddressSchema,
  enterpriseAddressEnterpriseParamsSchema,
  enterpriseAddressParamsSchema,
  listEnterpriseAddressesQuerySchema,
  patchEnterpriseAddressSchema,
} from "./schema.js";

const enterpriseAddressesRouter = Router({ mergeParams: true });

enterpriseAddressesRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_enderecos"),
  validateSchema({
    params: enterpriseAddressEnterpriseParamsSchema,
    query: listEnterpriseAddressesQuerySchema,
  }),
  enterpriseAddressesController.list,
);

enterpriseAddressesRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_enderecos"),
  validateSchema({
    params: enterpriseAddressEnterpriseParamsSchema,
    body: createEnterpriseAddressSchema,
  }),
  enterpriseAddressesController.create,
);

enterpriseAddressesRouter.patch(
  "/:addressId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_enderecos"),
  validateSchema({
    params: enterpriseAddressParamsSchema,
    body: patchEnterpriseAddressSchema,
  }),
  enterpriseAddressesController.patch,
);

export { enterpriseAddressesRouter };
