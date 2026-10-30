import { z } from "zod";
import {
  isModuleReference,
} from "../../auth/default-permissions.js";
import {
  optionalTrimmedStringSchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";

export const createModuleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Campo 'name' e obrigatorio")
      .max(120, "Campo 'name' deve ter no maximo 120 caracteres"),
    description: optionalTrimmedStringSchema("description", 255),
    reference: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(isModuleReference, {
        message: "reference invalido (modulo nao catalogado)",
      }),
  })
  .strict();

export const patchModuleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Campo 'name' e obrigatorio")
      .max(120, "Campo 'name' deve ter no maximo 120 caracteres")
      .optional(),
    description: optionalTrimmedStringSchema("description", 255),
    reference: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(isModuleReference, {
        message: "reference invalido (modulo nao catalogado)",
      })
      .optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.reference !== undefined ||
      data.softDelete === true,
    "Deve haver ao menos um campo para atualizar",
  );

export const moduleParamsSchema = z
  .object({
    moduleId: uuidSchema("moduleId"),
  })
  .strict();

export type CreateMaintainerModuleInput = z.infer<typeof createModuleSchema>;
export type PatchMaintainerModuleInput = z.infer<typeof patchModuleSchema>;
