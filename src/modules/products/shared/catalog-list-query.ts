import { z } from "zod";

/** Filtro opcional de texto na listagem (AND com demais filtros). */
export const catalogListFilterText = z.string().trim().min(1).max(255).optional();

export const catalogListQueryBase = {
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  description: catalogListFilterText,
} as const;
