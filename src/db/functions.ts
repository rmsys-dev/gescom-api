import { timestamp } from "drizzle-orm/pg-core";

/** Coluna timestamptz (instante com fuso). */
export const tz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

/** Percentual 0–100 (ex.: 10.50 = 10,5%). */
export const percentageDecimal = { precision: 13, scale: 10 } as const;
