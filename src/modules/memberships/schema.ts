import { z } from "zod";
import { createUserBodySchema } from "../users/schema.js";
import { memberClassEnum, statusEnum } from "../../db/schema.js";
import { ACCESS_LEVELS, isPermissionSlug } from "../auth/default-permissions.js";
import {
  createPaginationQuerySchema,
  cpfCnpjSchema,
  emailSchema,
  optionalTrimmedStringSchema,
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
    postSalesStatus: z.enum(statusEnum.enumValues).optional(),
    name: optionalTrimmedStringSchema("name", 255).optional(),
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
    notifyMaturity: z.boolean().optional(),
    observations: z.string().max(500).optional(),
    comissionService: membershipPercentageSchema.optional(),
    typeSupplierCustomerId: uuidSchema("typeSupplierCustomerId").optional(),
    typeNetworkId: uuidSchema("typeNetworkId").optional(),
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
  data.comissionPartial !== undefined ||
  data.notifyMaturity !== undefined ||
  data.observations !== undefined ||
  data.comissionService !== undefined ||
  data.typeSupplierCustomerId !== undefined ||
  data.typeNetworkId !== undefined;

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

//Esquema de módulo de membro
export const membershipModuleSchema = z
  .object({
    moduleId: uuidSchema("moduleId"),
    accessLevel: z.enum(ACCESS_LEVELS),
  })
  .strict();

/** Regras: CLIENTE sem módulos; demais classes exigem ao menos um módulo. */
export const refineMembershipModulesByClass = <
  T extends {
    class: (typeof memberClassEnum.enumValues)[number];
    modules: { moduleId: string; accessLevel: string }[];
  },
>(
  data: T,
  ctx: z.RefinementCtx,
) => {
  if (data.class === "CLIENTE") {
    if (data.modules.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Membros da classe CLIENTE nao devem ter vinculo com modulos",
        path: ["modules"],
      });
    }
    return;
  }

  if (data.modules.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe ao menos um modulo para esta classe de membro",
      path: ["modules"],
    });
    return;
  }

  const seen = new Set<string>();
  const duplicated = data.modules.find((item) => {
    if (seen.has(item.moduleId)) {
      return true;
    }
    seen.add(item.moduleId);
    return false;
  });
  if (duplicated) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Modulo duplicado no vinculo",
      path: ["modules"],
    });
  }
};

const createMembershipInnerSchema = z
  .object({
    userId: uuidSchema("userId"),
    code: z.coerce.number().int().optional(),
    class: z.enum(memberClassEnum.enumValues),
    modules: z.array(membershipModuleSchema).default([]),
  })
  .merge(membershipSalesFieldsSchema);

export const createMembershipSchema = createMembershipInnerSchema.superRefine(
  refineMembershipModulesByClass,
);

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;

export const createOnboardMemberPartSchema = createMembershipInnerSchema
  .omit({ userId: true })
  .superRefine(refineMembershipModulesByClass);

export const createOnboardMembershipSchema = z
  .object({
    user: createUserBodySchema,
    member: createOnboardMemberPartSchema,
  })
  .strict();

export type CreateOnboardMembershipInput = z.infer<
  typeof createOnboardMembershipSchema
>;

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
    postSalesStatus: z.enum(statusEnum.enumValues).optional(),
    // Se `true`, o back define `deleted_at` com a data/hora do servidor (soft delete)
    softDelete: z.boolean().optional(),
  })
  .merge(membershipSalesFieldsSchema)
  .refine(
    (data) =>
      data.code !== undefined ||
      data.class !== undefined ||
      data.status !== undefined ||
      data.postSalesStatus !== undefined ||
      data.softDelete === true ||
      hasMembershipSalesField(data),
    "Deve haver ao menos um campo para atualizar",
  );

export type PatchMembershipInput = z.infer<typeof patchMembershipSchema>;

export const memberModuleBaseParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
    memberId: uuidSchema("memberId"),
  })
  .strict();

export type MemberModuleBaseParams = z.infer<
  typeof memberModuleBaseParamsSchema
>;

export const memberModuleParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
    memberId: uuidSchema("memberId"),
    memberModuleId: uuidSchema("memberModuleId"),
  })
  .strict();

export type MemberModuleParams = z.infer<typeof memberModuleParamsSchema>;

export const addMemberModuleSchema = z
  .object({
    moduleId: uuidSchema("moduleId"),
    accessLevel: z.enum(ACCESS_LEVELS),
  })
  .strict();

export type AddMemberModuleInput = z.infer<typeof addMemberModuleSchema>;

export const patchMemberModuleSchema = z
  .object({
    accessLevel: z.enum(ACCESS_LEVELS).optional(),
    status: z.enum(statusEnum.enumValues).optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.accessLevel !== undefined ||
      data.status !== undefined ||
      data.softDelete === true,
    "Deve haver ao menos um campo para atualizar",
  );

export type PatchMemberModuleInput = z.infer<typeof patchMemberModuleSchema>;

export const memberModulePermissionParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
    memberId: uuidSchema("memberId"),
    memberModuleId: uuidSchema("memberModuleId"),
    permission: z
      .string()
      .min(1, "Campo 'permission' e obrigatorio")
      .max(255)
      .refine(isPermissionSlug, { message: "permission invalida" }),
  })
  .strict();

export type MemberModulePermissionParams = z.infer<
  typeof memberModulePermissionParamsSchema
>;

export const patchMemberModulePermissionSchema = z
  .object({
    status: z.enum(["ALLOW", "DENIED"]),
  })
  .strict();

export type PatchMemberModulePermissionInput = z.infer<
  typeof patchMemberModulePermissionSchema
>;

