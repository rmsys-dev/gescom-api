import { z } from "zod";
import {
  cpfCnpjSchema,
  emailSchema,
  optionalTrimmedStringSchema,
  uuidSchema,
} from "../../shared/validation/common-schemas.js";

const loginTypeSchema = z.enum(["EMAIL", "CPF/CNPJ"]);
const cpfOrCnpjSchema = cpfCnpjSchema("cpf");
const codeSchema = z
  .string()
  .trim()
  .length(6, "Campo 'code' deve conter exatamente 6 caracteres")
  .regex(/^\d{6}$/, "Campo 'code' deve conter apenas digitos");

export const loginSchema = z
  .object({
    loginType: loginTypeSchema,
    login: z.string().trim().min(1).max(255),
    password: z.string().min(1).max(255),
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(20),
  })
  .strict();

export const switchEnterpriseSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
  })
  .strict();

export const firstAccessLookupSchema = z
  .object({
    email: emailSchema("email").optional(),
    cpf: cpfOrCnpjSchema.optional(),
  })
  .refine((data) => Boolean(data.email || data.cpf), {
    message: "Informe ao menos um dos campos: email ou cpf",
    path: ["email"],
  })
  .strict();

export const firstAccessVerifySchema = z
  .object({
    loginType: loginTypeSchema,
    login: z.string().trim().min(1).max(255),
    code: codeSchema,
    password: z
      .string()
      .min(8, "Campo 'password' deve ter ao menos 8 caracteres")
      .max(255),
    confirmPassword: z
      .string()
      .min(8, "Campo 'confirmPassword' deve ter ao menos 8 caracteres")
      .max(255),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas nao conferem",
    path: ["confirmPassword"],
  });

export const firstAccessResendSchema = firstAccessLookupSchema;

export const passwordResetRequestSchema = z
  .object({
    email: emailSchema("email").optional(),
    cpf: cpfOrCnpjSchema.optional(),
  })
  .refine((data) => Boolean(data.email || data.cpf), {
    message: "Informe ao menos um dos campos: email ou cpf",
    path: ["email"],
  })
  .strict();

export const passwordResetVerifySchema = z
  .object({
    loginType: loginTypeSchema,
    login: z.string().trim().min(1).max(255),
    code: codeSchema,
    password: z
      .string()
      .min(8, "Campo 'password' deve ter ao menos 8 caracteres")
      .max(255),
    confirmPassword: z
      .string()
      .min(8, "Campo 'confirmPassword' deve ter ao menos 8 caracteres")
      .max(255),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas nao conferem",
    path: ["confirmPassword"],
  });

export const passwordResetResendSchema = passwordResetRequestSchema;

export const invitationAcceptPublicSchema = z
  .object({
    loginType: loginTypeSchema,
    login: z.string().trim().min(1).max(255),
    password: z.string().min(1).max(255),
    code: codeSchema,
  })
  .strict();

export const invitationDeclineSchema = z
  .object({
    reason: optionalTrimmedStringSchema("reason", 500),
  })
  .strict();

export const memberIdParamsSchema = z
  .object({
    memberId: uuidSchema("memberId"),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type SwitchEnterpriseInput = z.infer<typeof switchEnterpriseSchema>;
export type FirstAccessLookupInput = z.infer<typeof firstAccessLookupSchema>;
export type FirstAccessVerifyInput = z.infer<typeof firstAccessVerifySchema>;
export type FirstAccessResendInput = z.infer<typeof firstAccessResendSchema>;
export type PasswordResetRequestInput = z.infer<
  typeof passwordResetRequestSchema
>;
export type PasswordResetVerifyInput = z.infer<
  typeof passwordResetVerifySchema
>;
export type PasswordResetResendInput = z.infer<
  typeof passwordResetResendSchema
>;
export type InvitationAcceptPublicInput = z.infer<
  typeof invitationAcceptPublicSchema
>;
export type InvitationDeclineInput = z.infer<typeof invitationDeclineSchema>;
export type MemberIdParams = z.infer<typeof memberIdParamsSchema>;
