import { type Column, ilike, sql, type SQL } from "drizzle-orm";

/** Busca parcial por codigo fiscal, ignorando pontuacao (ex.: NCM 1234.56.78 x 12345678). */
export const fiscalCodeIlikeCondition = (column: Column, term: string): SQL => {
  const trimmed = term.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length > 0) {
    return sql`regexp_replace(${column}::text, '[^0-9]', '', 'g') ilike ${`%${digits}%`}`;
  }

  return ilike(column, `%${trimmed}%`);
};
