import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { prices, promotionalPrices } from "../../db/schema.js";
import { applyPromotionalUnitPrice, moneyEquals, pickActivePromotionalPrice, PRICE_MATCH_TOLERANCE, } from "./resolve-sale-price-logic.js";
export { applyPromotionalUnitPrice, moneyEquals, pickActivePromotionalPrice, PRICE_MATCH_TOLERANCE, };
/**
 * Resolve o preço efetivo do produto na data `at` (default: agora, UTC).
 * Consulta promoção vigente em `promotional_prices`; fallback em `prices`.
 *
 * Regras:
 * - Desempate: `startDate` DESC, depois `id` DESC
 * - Vigência comparada em UTC (`startDate <= at <= endDate`)
 * - Orçamento: preço congelado na criação do item (conversão herda snapshot)
 */
export const resolveEffectiveSalePrice = async (productsEnterprisesId, at = new Date(), executor = db) => {
    const [priceRow, promoRows] = await Promise.all([
        executor
            .select({
            averageCost: prices.averageCost,
            actualRealCost: prices.actualRealCost,
            priceCost: prices.priceCost,
            price: prices.price,
        })
            .from(prices)
            .where(eq(prices.productsEnterprisesId, productsEnterprisesId))
            .limit(1)
            .then((rows) => rows[0] ?? null),
        executor
            .select({
            id: promotionalPrices.id,
            price: promotionalPrices.price,
            startDate: promotionalPrices.startDate,
            endDate: promotionalPrices.endDate,
        })
            .from(promotionalPrices)
            .where(and(eq(promotionalPrices.productsEnterprisesId, productsEnterprisesId), lte(promotionalPrices.startDate, at), gte(promotionalPrices.endDate, at)))
            .orderBy(desc(promotionalPrices.startDate), desc(promotionalPrices.id))
            .limit(1),
    ]);
    const tablePrice = priceRow?.price !== undefined && priceRow.price !== null
        ? Number(priceRow.price)
        : null;
    const activePromo = promoRows[0] ?? null;
    const promotionalPrice = activePromo ? Number(activePromo.price) : null;
    const isPromotional = promotionalPrice !== null && !Number.isNaN(promotionalPrice);
    const effectivePrice = isPromotional ? promotionalPrice : tablePrice;
    return {
        tablePrice,
        effectivePrice,
        averageCost: priceRow?.averageCost ?? null,
        actualRealCost: priceRow?.actualRealCost ?? null,
        priceCost: priceRow?.priceCost ?? null,
        priceSale: effectivePrice !== null && !Number.isNaN(effectivePrice)
            ? effectivePrice.toFixed(4)
            : null,
        promotionalPriceId: isPromotional ? activePromo.id : null,
        isPromotional,
    };
};
