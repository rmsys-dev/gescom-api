import { z } from "zod";
import { createUserBodySchema } from "../users/schema.js";
import {
  memberClassEnum,
  statusEnum,
  statusPermissionEnum,
} from "../../db/schema.js";
import {
  createPaginationQuerySchema,
  cpfCnpjSchema,
  emailSchema,
  phoneSchema,
  uuidSchema,
} from "../../shared/validation/common-schemas.js";

const registrationSchema = cpfCnpjSchema("registration");

export const listMembersQuerySchema = createPaginationQuerySchema(100)
  .extend({
    userId: uuidSchema("userId").optional(),
    code: z.coerce.number().int().optional(),
    class: z.enum(memberClassEnum.enumValues).optional(),
    status: z.enum(statusEnum.enumValues).optional(),
    registration: registrationSchema.optional(),
    email: emailSchema("email").optional(),
    phone: phoneSchema("phone").optional(),
  })
  .strict();

export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;

const membershipPercentageSchema = z.number().min(0).max(100);

const membershipSalesFieldsSchema = z
  .object({
    saleLimit: membershipPercentageSchema.optional(),
    exceedDiscountSale: z.boolean().optional(),
    receiptLimitDiscount: membershipPercentageSchema.optional(),
    comissionOnSight: membershipPercentageSchema.optional(),
    comissionToTerms: membershipPercentageSchema.optional(),
    comissionPartial: membershipPercentageSchema.optional(),
  })
  .strict();

const hasMembershipSalesField = (
  data: z.infer<typeof membershipSalesFieldsSchema>,
) =>
  data.saleLimit !== undefined ||
  data.exceedDiscountSale !== undefined ||
  data.receiptLimitDiscount !== undefined ||
  data.comissionOnSight !== undefined ||
  data.comissionToTerms !== undefined ||
  data.comissionPartial !== undefined;

//Esquema de empresa de membro
export const membershipEnterpriseParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
  })
  .strict();

//Tipo de entrada de empresa de membro
export type MembershipEnterpriseParams = z.infer<
  typeof membershipEnterpriseParamsSchema
>;

//Esquema de departamento de membro
export const membershipDepartmentSchema = z
  .object({
    departmentId: uuidSchema("departmentId"),
    mainDepartment: z.boolean(),
  })
  .strict();

/** Regras: CLIENTE sem departamentos; demais classes exigem ao menos um e exatamente um principal. */
export const refineMembershipDepartmentsByClass = <
  T extends {
    class: (typeof memberClassEnum.enumValues)[number];
    departments: { mainDepartment: boolean }[];
  },
>(
  data: T,
  ctx: z.RefinementCtx,
) => {
  if (data.class === "CLIENTE") {
    if (data.departments.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Membros da classe CLIENTE nao devem ter vinculo com departamentos",
        path: ["departments"],
      });
    }
    return;
  }

  if (data.departments.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe ao menos um departamento para esta classe de membro",
      path: ["departments"],
    });
    return;
  }

  const mainCount = data.departments.filter(
    (d) => d.mainDepartment === true,
  ).length;
  if (mainCount !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Deve haver exatamente um departamento principal",
      path: ["departments"],
    });
  }
};

// Objeto base sem refinamento — Zod 4 não permite .omit() após .superRefine()
const createMembershipInnerSchema = z
  .object({
    userId: uuidSchema("userId"),
    code: z.coerce.number().int().optional(),
    class: z.enum(memberClassEnum.enumValues),
    departments: z.array(membershipDepartmentSchema).default([]),
  })
  .merge(membershipSalesFieldsSchema);

//Esquema de criação de membro
export const createMembershipSchema = createMembershipInnerSchema.superRefine(
  refineMembershipDepartmentsByClass,
);

//Tipo de entrada de criação de membro
export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;

//Esquema de criação de membro com utilizador (parte `member` sem userId)
export const createOnboardMemberPartSchema = createMembershipInnerSchema
  .omit({ userId: true })
  .superRefine(refineMembershipDepartmentsByClass);

export const createOnboardMembershipSchema = z
  .object({
    user: createUserBodySchema,
    member: createOnboardMemberPartSchema,
    sendEmail: z.boolean().optional(),
  })
  .strict();

//Tipo de entrada de criação de membro com usuário e verifica se ele tem acesso à empresa
export type CreateOnboardMembershipInput = z.infer<
  typeof createOnboardMembershipSchema
>;

export const inviteMembershipBodySchema = z
  .object({
    member: createOnboardMemberPartSchema,
    inviteEmail: emailSchema("inviteEmail").optional(),
    invitePhone: phoneSchema("invitePhone").optional(),
    sendEmail: z.boolean().optional(),
  })
  .strict()
  .refine((b) => Boolean(b.inviteEmail ?? b.invitePhone), {
    message: "Informe inviteEmail e/ou invitePhone",
    path: ["inviteEmail"],
  });

export type InviteMembershipBody = z.infer<typeof inviteMembershipBodySchema>;

//Esquema de parâmetros de patch de membro (empresa + id do vínculo)
export const membershipPatchParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
    memberId: uuidSchema("memberId"),
  })
  .strict();

export type MembershipPatchParams = z.infer<typeof membershipPatchParamsSchema>;

export const membershipCodeParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
    code: z.coerce.number().int(),
  })
  .strict();

export type MembershipCodeParams = z.infer<typeof membershipCodeParamsSchema>;

//Esquema de alteração (patch) de membro
export const patchMembershipSchema = z
  .object({
    code: z.coerce.number().int().nullable().optional(),
    class: z.enum(memberClassEnum.enumValues).optional(),
    status: z.enum(statusEnum.enumValues).optional(),
    // Se `true`, o back define `deleted_at` com a data/hora do servidor (soft delete)
    softDelete: z.boolean().optional(),
  })
  .merge(membershipSalesFieldsSchema)
  .refine(
    (data) =>
      data.code !== undefined ||
      data.class !== undefined ||
      data.status !== undefined ||
      data.softDelete === true ||
      hasMembershipSalesField(data),
    "Deve haver ao menos um campo para atualizar",
  );

export type PatchMembershipInput = z.infer<typeof patchMembershipSchema>;

//Esquema de parâmetros base para vínculo membro-departamento (sem memberDepartmentId)
export const memberDepartmentBaseParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
    memberId: uuidSchema("memberId"),
  })
  .strict();

export type MemberDepartmentBaseParams = z.infer<
  typeof memberDepartmentBaseParamsSchema
>;

//Esquema de parâmetros completos para alteração de vínculo membro-departamento
export const memberDepartmentParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
    memberId: uuidSchema("memberId"),
    memberDepartmentId: uuidSchema("memberDepartmentId"),
  })
  .strict();

export type MemberDepartmentParams = z.infer<
  typeof memberDepartmentParamsSchema
>;

//Esquema de inclusão de vínculo membro-departamento
export const addMemberDepartmentSchema = z
  .object({
    departmentId: uuidSchema("departmentId"),
    mainDepartment: z.boolean(),
  })
  .strict();

export type AddMemberDepartmentInput = z.infer<
  typeof addMemberDepartmentSchema
>;

//Esquema de alteração (patch) de vínculo membro-departamento
export const patchMemberDepartmentSchema = z
  .object({
    departmentId: uuidSchema("departmentId").optional(),
    mainDepartment: z.boolean().optional(),
    status: z.enum(statusEnum.enumValues).optional(),
    // Se `true`, o back define `deleted_at` com a data/hora do servidor (soft delete)
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.departmentId !== undefined ||
      data.mainDepartment !== undefined ||
      data.status !== undefined ||
      data.softDelete === true,
    "Deve haver ao menos um campo para atualizar",
  );

export type PatchMemberDepartmentInput = z.infer<
  typeof patchMemberDepartmentSchema
>;

// Parâmetros: empresa, membro e departamento do vínculo
export const membershipMemberDepartmentParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
    memberId: uuidSchema("memberId"),
    departmentId: uuidSchema("departmentId"),
  })
  .strict();

export type MembershipMemberDepartmentParams = z.infer<
  typeof membershipMemberDepartmentParamsSchema
>;

// PATCH em member_permissions_default ou member_extra_permissions
export const patchMemberDepartmentPermissionBodySchema = z
  .object({
    permission: z
      .string()
      .min(1, "Campo 'permission' e obrigatorio")
      .max(255, "Campo 'permission' deve ter no maximo 255 caracteres"),
    status: z.enum(statusPermissionEnum.enumValues).optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => data.status !== undefined || data.softDelete === true,
    "Informe 'status' ou softDelete: true",
  );

export type PatchMemberDepartmentPermissionInput = z.infer<
  typeof patchMemberDepartmentPermissionBodySchema
>;
