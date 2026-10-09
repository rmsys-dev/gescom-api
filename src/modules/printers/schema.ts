import { z } from "zod";
import { createPaginationQuerySchema } from "../../shared/validation/common-schemas.js";
import { statusEnum } from "../../db/enums.js";
import { PRINTER_PAPER_TYPES } from "../../db/entities/printers.js";

const statusSchema = z.enum(statusEnum.enumValues);
const paperTypeSchema = z.enum(PRINTER_PAPER_TYPES);

/** Nome NetBIOS/DNS ou IP do computador: sem barras, para compor `\\COMPUTADOR\IMPRESSORA`. */
export const computerNameSchema = z
  .string()
  .transform((value) => value.trim().replace(/^[\\/]+/, "").replace(/[\\/]+$/, ""))
  .pipe(
    z
      .string()
      .min(1, "Informe o nome do computador")
      .max(63, "Nome do computador deve ter no maximo 63 caracteres")
      .regex(
        /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*$/,
        "Nome do computador deve conter apenas letras, numeros, hifen e ponto (sem barras)",
      ),
  );

export const shareNameSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do compartilhamento")
  .max(255)
  .regex(/^[^\\/:*?"<>|]+$/, 'Compartilhamento nao pode conter \\ / : * ? " < > |');

/** Margem extra da bobina em mm (uma casa decimal). */
const marginSchema = z
  .number()
  .min(0, "Margem nao pode ser negativa")
  .max(20, "Margem deve ser de no maximo 20 mm")
  .transform((value) => Math.round(value * 10) / 10);

export const listPrintersQuerySchema = createPaginationQuerySchema(100)
  .extend({ status: statusSchema.optional() })
  .strict();

export const createPrinterSchema = z
  .object({
    description: z.string().trim().min(1).max(255),
    computerName: computerNameSchema,
    shareName: shareNameSchema,
    paperType: paperTypeSchema.default("A4"),
    isDefault: z.boolean().default(false),
    status: statusSchema.default("ATIVO"),
    marginTop: marginSchema.default(0),
    marginBottom: marginSchema.default(0),
    marginLeft: marginSchema.default(0),
    marginRight: marginSchema.default(0),
  })
  .strict();

export const patchPrinterSchema = z
  .object({
    description: z.string().trim().min(1).max(255).optional(),
    computerName: computerNameSchema.optional(),
    shareName: shareNameSchema.optional(),
    paperType: paperTypeSchema.optional(),
    isDefault: z.boolean().optional(),
    status: statusSchema.optional(),
    marginTop: marginSchema.optional(),
    marginBottom: marginSchema.optional(),
    marginLeft: marginSchema.optional(),
    marginRight: marginSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const printerParamsSchema = z
  .object({
    printerId: z.string().uuid("Campo 'printerId' deve ser um UUID valido"),
  })
  .strict();

export const buildPrinterUncPath = (computerName: string, shareName: string) =>
  `\\\\${computerName}\\${shareName}`;

export type ListPrintersQuery = z.infer<typeof listPrintersQuerySchema>;
export type CreatePrinterInput = z.infer<typeof createPrinterSchema>;
export type PatchPrinterInput = z.infer<typeof patchPrinterSchema>;
