import { Router, type NextFunction, type Request, type Response } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { membershipsController } from "./controller.js";
import type { PatchMemberModuleInput } from "./schema.js";
import {
  addMemberModuleSchema,
  createMembershipSchema,
  createOnboardMembershipSchema,
  listMembersQuerySchema,
  memberModuleBaseParamsSchema,
  memberModuleParamsSchema,
  memberModulePermissionParamsSchema,
  membershipCodeParamsSchema,
  membershipEnterpriseParamsSchema,
  membershipPatchParamsSchema,
  patchMemberModulePermissionSchema,
  patchMemberModuleSchema,
  patchMembershipSchema,
} from "./schema.js";
import { PERM } from "../auth/default-permissions.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../shared/validation/common-schemas.js";

const membershipsRouter = Router({ mergeParams: true });

membershipsRouter.post(
  "/create-with-user",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_usuarios"),
  requirePermission("incluir_membros"),
  validateSchema({
    params: membershipEnterpriseParamsSchema,
    body: createOnboardMembershipSchema,
  }),
  membershipsController.createOnboard,
);

membershipsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_membros"),
  validateSchema({
    params: membershipEnterpriseParamsSchema,
    body: createMembershipSchema,
  }),
  membershipsController.create,
);

membershipsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_membros"),
  validateSchema({
    params: membershipEnterpriseParamsSchema,
    query: listMembersQuerySchema,
  }),
  membershipsController.list,
);

membershipsRouter.get(
  "/code/:code",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_membros"),
  validateSchema({ params: membershipCodeParamsSchema }),
  membershipsController.getByCode,
);

membershipsRouter.post(
  "/:memberId/approve",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_membros"),
  validateSchema({
    params: membershipPatchParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  membershipsController.approve,
);

membershipsRouter.get(
  "/:memberId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_membros"),
  validateSchema({ params: membershipPatchParamsSchema }),
  membershipsController.getById,
);

membershipsRouter.post(
  "/:memberId/modules",
  authMiddleware,
  tenantMiddleware,
  requirePermission(PERM.incluir_membros_modulos),
  validateSchema({
    params: memberModuleBaseParamsSchema,
    body: addMemberModuleSchema,
  }),
  membershipsController.addModule,
);

const requireMemberModulePatchPermission = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const body = req.body as PatchMemberModuleInput;
  const slug =
    body.softDelete === true
      ? PERM.excluir_membros_modulos
      : PERM.alterar_membros_modulos;
  void requirePermission(slug)(req, res, next);
};

membershipsRouter.patch(
  "/:memberId/modules/:memberModuleId",
  authMiddleware,
  tenantMiddleware,
  requireAnyPermission([
    PERM.alterar_membros_modulos,
    PERM.excluir_membros_modulos,
  ]),
  validateSchema({
    params: memberModuleParamsSchema,
    body: patchMemberModuleSchema,
  }),
  requireMemberModulePatchPermission,
  membershipsController.patchModule,
);

membershipsRouter.patch(
  "/:memberId/modules/:memberModuleId/permissions/:permission",
  authMiddleware,
  tenantMiddleware,
  requirePermission(PERM.alterar_permissoes),
  validateSchema({
    params: memberModulePermissionParamsSchema,
    body: patchMemberModulePermissionSchema,
  }),
  membershipsController.patchModulePermission,
);

membershipsRouter.patch(
  "/:memberId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_membros"),
  validateSchema({
    params: membershipPatchParamsSchema,
    body: patchMembershipSchema,
  }),
  membershipsController.patch,
);

export { membershipsRouter };
