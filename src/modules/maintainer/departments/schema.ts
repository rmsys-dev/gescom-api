import { z } from "zod";
import { isPermissionReference } from "../../auth/default-permissions.js";
import {
  optionalTrimmedStringSchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";

export const createDepartmentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Campo 'name' e obrigatorio")
      .max(120, "Campo 'name' deve ter no maximo 120 caracteres"),
    description: optionalTrimmedStringSchema("description", 255),
    permissionReference: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(isPermissionReference, {
        message: "permissionReference invalido (SKU nao catalogado)",
      }),
  })
  .strict();

export const patchDepartmentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Campo 'name' e obrigatorio")
      .max(120, "Campo 'name' deve ter no maximo 120 caracteres")
      .optional(),
    description: optionalTrimmedStringSchema("description", 255),
    permissionReference: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(isPermissionReference, {
        message: "permissionReference invalido (SKU nao catalogado)",
      })
      .optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.permissionReference !== undefined ||
      data.softDelete === true,
    "Deve haver ao menos um campo para atualizar",
  );

export const departmentParamsSchema = z
  .object({
    departmentId: uuidSchema("departmentId"),
  })
  .strict();

export type CreateMaintainerDepartmentInput = z.infer<
  typeof createDepartmentSchema
>;
export type PatchMaintainerDepartmentInput = z.infer<
  typeof patchDepartmentSchema
>;
