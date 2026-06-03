import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { membershipsController } from "./controller.js";
import {
  addMemberDepartmentSchema,
  createMembershipSchema,
  createOnboardMembershipSchema,
  inviteMembershipBodySchema,
  listMembersQuerySchema,
  memberDepartmentBaseParamsSchema,
  memberDepartmentParamsSchema,
  membershipEnterpriseParamsSchema,
  membershipMemberDepartmentParamsSchema,
  membershipPatchParamsSchema,
  patchMemberDepartmentPermissionBodySchema,
  patchMemberDepartmentSchema,
  patchMembershipSchema,
} from "./schema.js";

const membershipsRouter = Router({ mergeParams: true });

//Criação de membro com usuário
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

// Convite de vínculo (membro PENDENTE + código por email/SMS)
membershipsRouter.post(
  "/invite",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_membros"),
  validateSchema({
    params: membershipEnterpriseParamsSchema,
    body: inviteMembershipBodySchema,
  }),
  membershipsController.inviteMembership,
);

//Listagem de membros
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

//Detalhe de membro por ID
membershipsRouter.get(
  "/:memberId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_membros"),
  validateSchema({ params: membershipPatchParamsSchema }),
  membershipsController.getById,
);

//Criação de membro
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

//Vincula um membro existente a um novo departamento (snapshot em member_extra_permissions)
membershipsRouter.post(
  "/:memberId/departments",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_membros"),
  validateSchema({
    params: memberDepartmentBaseParamsSchema,
    body: addMemberDepartmentSchema,
  }),
  membershipsController.addDepartment,
);

//Alteração de vínculo membro-departamento (soft delete quando `softDelete: true` no body)
membershipsRouter.patch(
  "/:memberId/departments/:memberDepartmentId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_membros"),
  validateSchema({
    params: memberDepartmentParamsSchema,
    body: patchMemberDepartmentSchema,
  }),
  membershipsController.patchDepartment,
);

//Alteração de permissões padrão do membro (snapshot por departamento)
membershipsRouter.patch(
  "/:memberId/departments/:departmentId/permissions-default",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_permissoes"),
  validateSchema({
    params: membershipMemberDepartmentParamsSchema,
    body: patchMemberDepartmentPermissionBodySchema,
  }),
  membershipsController.patchMemberDepartmentPermissionDefault,
);

//Alteração de permissões extras do membro (por departamento)
membershipsRouter.patch(
  "/:memberId/departments/:departmentId/extra-permissions",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_permissoes"),
  validateSchema({
    params: membershipMemberDepartmentParamsSchema,
    body: patchMemberDepartmentPermissionBodySchema,
  }),
  membershipsController.patchMemberDepartmentPermissionExtra,
);

//Alteração de membro (soft delete quando `softDelete: true` no body)
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
