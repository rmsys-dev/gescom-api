import { z } from "zod";
import {
  createPaginationQuerySchema,
  optionalTrimmedStringSchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";

const xJustSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(15, "Justificativa deve ter ao menos 15 caracteres")
      .max(255, "Justificativa deve ter no maximo 255 caracteres"),
  );

const modSchema = z.enum(["55", "65"]);

export const cancelNfeSchema = z.object({ xJust: xJustSchema }).strict();

export const cancelNfeBySubstitutionSchema = z
  .object({
    xJust: xJustSchema,
    nfeSubstitutaId: uuidSchema("nfeSubstitutaId"),
  })
  .strict();

export const inutilizeNfeNoteSchema = z.object({ xJust: xJustSchema }).strict();

export const inutilizeNfeRangeSchema = z
  .object({
    mod: modSchema,
    serie: z.number().int().min(0).max(999),
    nNfIni: z.number().int().min(1).max(999_999_999),
    nNfFin: z.number().int().min(1).max(999_999_999),
    ano: z
      .string()
      .regex(/^\d{2}$/, "Ano deve ter 2 digitos")
      .optional(),
    xJust: xJustSchema,
  })
  .strict()
  .refine((data) => data.nNfIni <= data.nNfFin, {
    message: "Numero inicial deve ser menor ou igual ao numero final",
    path: ["nNfFin"],
  });

export const listInutilizationsQuerySchema = createPaginationQuerySchema(100)
  .extend({ mod: modSchema.optional() })
  .strict();

export const listNfeEventsQuerySchema = createPaginationQuerySchema(100)
  .extend({
    /** Número da nota (também casa com faixas inutilizadas), chave ou destinatário. */
    search: optionalTrimmedStringSchema("search", 60).optional(),
    eventType: z
      .enum(["CANCELAMENTO", "CARTA_CORRECAO", "INUTILIZACAO", "CANCELAMENTO_SUBSTITUICAO"])
      .optional(),
    mod: modSchema.optional(),
    /** Período da data do evento (dhEvento), limites inclusivos. */
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .strict();

export type CancelNfeInput = z.infer<typeof cancelNfeSchema>;
export type CancelNfeBySubstitutionInput = z.infer<
  typeof cancelNfeBySubstitutionSchema
>;
export type InutilizeNfeNoteInput = z.infer<typeof inutilizeNfeNoteSchema>;
export type InutilizeNfeRangeInput = z.infer<typeof inutilizeNfeRangeSchema>;
export type ListNfeEventsQuery = z.infer<typeof listNfeEventsQuerySchema>;
export type ListInutilizationsQuery = z.infer<
  typeof listInutilizationsQuerySchema
>;
