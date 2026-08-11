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
  listMembersQuerySchema,
  memberDepartmentBaseParamsSchema,
  memberDepartmentParamsSchema,
  membershipCodeParamsSchema,
  membershipEnterpriseParamsSchema,
  membershipMemberDepartmentParamsSchema,
  membershipPatchParamsSchema,
  patchMemberDepartmentPermissionBodySchema,
  patchMemberDepartmentSchema,
  patchMembershipSchema,
} from "./schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../shared/validation/common-schemas.js";

const membershipsRouter = Router({ mergeParams: true });

// Criação com utilizador: cria user+membro ou, se contactos já existirem, só o vínculo (PENDENTE)
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

// Vínculo de membro a utilizador já existente (PENDENTE; e-mail na aprovação, excepto CLIENTE)
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

//Detalhe de membro por código
membershipsRouter.get(
  "/code/:code",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_membros"),
  validateSchema({ params: membershipCodeParamsSchema }),
  membershipsController.getByCode,
);

//Aprovação de cadastro (PENDENTE → ATIVO; FIRST_ACCESS / MEMBERSHIP_ACCEPT excepto CLIENTE)
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

//Detalhe de membro por ID
membershipsRouter.get(
  "/:memberId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_membros"),
  validateSchema({ params: membershipPatchParamsSchema }),
  membershipsController.getById,
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
