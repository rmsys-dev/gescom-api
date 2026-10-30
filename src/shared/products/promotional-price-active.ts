/**
 * Regra de cadastro: só permite nova promoção do mesmo produto
 * quando todas as existentes tiverem endDate < at (já encerradas).
 * endDate >= at bloqueia (vigente ou com fim hoje/futuro).
 */
export const isPromotionEndDateBlocking = (
  endDate: Date,
  at: Date = new Date(),
): boolean => endDate.getTime() >= at.getTime();

/**
 * Retorna a primeira promoção que bloqueia novo cadastro do produto,
 * ignorando `excludeId` (útil no patch do próprio registro).
 */
export const findBlockingPromotion = <T extends { id: string; endDate: Date }>(
  rows: T[],
  at: Date = new Date(),
  excludeId?: string,
): T | null => {
  for (const row of rows) {
    if (excludeId !== undefined && row.id === excludeId) continue;
    if (isPromotionEndDateBlocking(row.endDate, at)) return row;
  }
  return null;
};
