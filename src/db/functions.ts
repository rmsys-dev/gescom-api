import { timestamp } from "drizzle-orm/pg-core";

/** Coluna timestamptz (instante com fuso). */
export const tz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

/** Percentual 0–100 (ex.: 10.50 = 10,5%). */
export const percentageDecimal = { precision: 15, scale: 10 } as const;

/** Campo de valores com 2 casas decimais */
export const valorDuasCasasDecimais = { precision: 15, scale: 2 } as const;

/** campo de valores com 4 casas decimais */
export const valorQuatroCasasDecimais = { precision: 15, scale: 4 } as const;