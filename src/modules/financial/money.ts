export const toCents = (value: string | number | null | undefined): number =>
  Math.round(Number(value ?? 0) * 100);

export const fromCents = (cents: number): string => (cents / 100).toFixed(2);

export const todayDateOnly = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

export const asDateOnly = (value: Date | string): string =>
  typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
