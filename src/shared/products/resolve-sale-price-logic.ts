/** Tolerância em centavos para comparar preços monetários. */
export const PRICE_MATCH_TOLERANCE = 0.02;

export type PromotionalPriceCandidate = {
  id: string;
  price: string;
  startDate: Date;
  endDate: Date;
};

/**
 * Seleciona a promoção vigente em `at` (UTC).
 * Desempate: `startDate` mais recente, depois `id` DESC.
 */
export const pickActivePromotionalPrice = <
  T extends PromotionalPriceCandidate,
>(
  candidates: T[],
  at: Date,
): T | null => {
  const atMs = at.getTime();
  const active = candidates.filter((row) => {
    const startMs = row.startDate.getTime();
    const endMs = row.endDate.getTime();
    return startMs <= atMs && endMs >= atMs;
  });

  if (active.length === 0) return null;

  active.sort((a, b) => {
    const startDiff = b.startDate.getTime() - a.startDate.getTime();
    if (startDiff !== 0) return startDiff;
    return b.id < a.id ? -1 : b.id > a.id ? 1 : 0;
  });

  return active[0] ?? null;
};

export const moneyEquals = (
  a: number,
  b: number,
  tolerance = PRICE_MATCH_TOLERANCE,
): boolean => Math.abs(a - b) <= tolerance;

/**
 * Modo híbrido:
 * - Sem promoção: mantém `valueUnit` do cliente.
 * - Com promoção: se `valueUnit` ≈ preço de tabela (ou já ≈ promo),
 *   aplica o preço promocional; caso contrário, mantém o enviado
 *   (preço customizado). Desconto adicional continua via `valueDiscount`.
 */
export const applyPromotionalUnitPrice = (input: {
  valueUnit: number;
  tablePrice: number | null;
  promotionalPrice: number | null;
}): { valueUnit: number; appliedPromotional: boolean } => {
  const { valueUnit, tablePrice, promotionalPrice } = input;

  if (promotionalPrice === null) {
    return { valueUnit, appliedPromotional: false };
  }

  if (tablePrice !== null && moneyEquals(valueUnit, tablePrice)) {
    return { valueUnit: promotionalPrice, appliedPromotional: true };
  }

  if (moneyEquals(valueUnit, promotionalPrice)) {
    return { valueUnit: promotionalPrice, appliedPromotional: true };
  }

  return { valueUnit, appliedPromotional: false };
};
