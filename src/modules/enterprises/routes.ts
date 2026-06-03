import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../shared/validation/common-schemas.js";
import { enterpriseAddressesRouter } from "./enterprise-addresses/routes.js";
import { membershipsRouter } from "../memberships/routes.js";
import { usersRouter } from "../users/routes.js";
import { enterprisesController } from "./controller.js";
import {
  enterpriseParamsSchema,
  listEnterprisesQuerySchema,
  patchEnterpriseSchema,
} from "./schema.js";

const enterprisesRouter = Router();

//Listagem de empresas
enterprisesRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_empresas"),
  validateSchema({ query: listEnterprisesQuerySchema }),
  enterprisesController.list,
);

//Listagem de empresa
enterprisesRouter.get(
  "/:enterpriseId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_empresas"),
  validateSchema({ params: enterpriseParamsSchema, query: emptyQuerySchema }),
  enterprisesController.getById,
);

//Alteração de empresa
enterprisesRouter.patch(
  "/:enterpriseId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_empresas"),
  validateSchema({
    params: enterpriseParamsSchema,
    body: patchEnterpriseSchema,
  }),
  enterprisesController.patch,
);

//***ROTA DO MÓDULO DE ENDEREÇOS DA EMPRESA ***

enterprisesRouter.use("/:enterpriseId/addresses", enterpriseAddressesRouter);

//***ROTA DO MÓDULO DE MEMBROS ***

enterprisesRouter.use("/:enterpriseId/members", membershipsRouter);

//***ROTA DO MÓDULO DE UTILIZADORES ***

enterprisesRouter.use("/:enterpriseId/users", usersRouter);

export { enterprisesRouter };
