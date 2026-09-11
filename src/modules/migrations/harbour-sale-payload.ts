export type HarbourSaleLike<TPayment = unknown> = {
  memberId: string;
  member: object | null;
  payments: TPayment[];
  generatedSales?: readonly { id: string }[];
  items?: unknown[];
  code?: number | null;
  user?: unknown;
  seller?: unknown;
  memberRef?: unknown;
};

const OMITTED_SALE_KEYS = new Set(["user", "seller", "memberRef"]);
const OMITTED_ITEM_KEYS = new Set(["user", "seller", "productCode"]);

const readProductCode = (item: Record<string, unknown>): number | null => {
  if (typeof item.productCode === "number") return item.productCode;
  if (item.productCode === null) return null;
  const productsEnterprises = item.productsEnterprises;
  if (
    productsEnterprises &&
    typeof productsEnterprises === "object" &&
    "code" in productsEnterprises
  ) {
    const nested = (productsEnterprises as { code?: number | null }).code;
    return typeof nested === "number" ? nested : null;
  }
  return null;
};

const shapeHarbourItem = (item: Record<string, unknown>) => {
  const code = readProductCode(item);
  const shaped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(item)) {
    if (key === "productsEnterprises") {
      shaped.code = code;
      continue;
    }
    if (OMITTED_ITEM_KEYS.has(key)) continue;
    shaped[key] = value;
  }

  if (!Object.prototype.hasOwnProperty.call(shaped, "code")) {
    shaped.code = code;
  }

  return shaped;
};

export const applyMemberCodes = <T extends HarbourSaleLike>(
  sales: T[],
  codesByMemberId: Map<string, number | null>,
): T[] =>
  sales.map((sale) => {
    const code = codesByMemberId.get(sale.memberId) ?? null;
    const shaped: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(sale)) {
      if (OMITTED_SALE_KEYS.has(key)) continue;
      if (key === "memberId") {
        shaped.code = code;
      }
      if (key === "member" && value && typeof value === "object") {
        shaped.member = { ...(value as object), code };
        continue;
      }
      if (key === "items" && Array.isArray(value)) {
        shaped.items = value.map((item) =>
          item && typeof item === "object"
            ? shapeHarbourItem(item as Record<string, unknown>)
            : item,
        );
        continue;
      }
      shaped[key] = value;
    }

    if (!Object.prototype.hasOwnProperty.call(shaped, "code")) {
      shaped.code = code;
    }

    return shaped as T;
  });

export const collectGeneratedSaleIdsNeedingPayments = <
  T extends HarbourSaleLike,
>(
  sales: T[],
): string[] => {
  const ids = new Set<string>();
  for (const sale of sales) {
    if (sale.payments.length > 0) continue;
    for (const generated of sale.generatedSales ?? []) {
      ids.add(generated.id);
    }
  }
  return [...ids];
};

export const applyGeneratedPayments = <T extends HarbourSaleLike>(
  sales: T[],
  paymentsBySaleId: Map<string, T["payments"]>,
): T[] =>
  sales.map((sale) => {
    if (sale.payments.length > 0) return sale;
    const generatedIds = (sale.generatedSales ?? []).map(
      (generated) => generated.id,
    );
    if (generatedIds.length === 0) return sale;
    const payments = generatedIds.flatMap(
      (id) => paymentsBySaleId.get(id) ?? [],
    ) as T["payments"];
    return { ...sale, payments };
  });
