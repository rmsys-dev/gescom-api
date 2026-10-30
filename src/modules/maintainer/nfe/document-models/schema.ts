import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const modelCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9A-Z]{2}$/, "Modelo deve ter 2 caracteres (ex.: 55, 65, 1B)");

export const createDocumentModelSchema = z
  .object({
    code: modelCode,
    description: z.string().trim().min(1).max(255),
    electronic: z.boolean().default(false),
  })
  .strict();

/** O código não muda: é a chave referenciada pelas notas (nfe_headers.mod). */
export const patchDocumentModelSchema = z
  .object({
    description: z.string().trim().min(1).max(255).optional(),
    electronic: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Deve haver ao menos um campo para atualizar",
  });

export const documentModelParamsSchema = z
  .object({ documentModelId: uuidSchema("documentModelId") })
  .strict();

export type CreateDocumentModelInput = z.infer<typeof createDocumentModelSchema>;
export type PatchDocumentModelInput = z.infer<typeof patchDocumentModelSchema>;
