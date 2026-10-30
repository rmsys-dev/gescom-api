import {
  and,
  asc,
  countDistinct,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  enterpriseGroups,
  enterprises,
  products,
  productsEnterprises,
} from "../../../db/schema.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListStockGroupQuery } from "./schema.js";

type ScopeEnterprise = { id: string; tradeName: string; legalName: string };

type StockGroupScope = {
  group: { id: string; name: string } | null;
  enterprises: ScopeEnterprise[];
};

const DEFAULT_LIMIT = 20;

const sumBalances = (values: string[]) =>
  values.reduce((total, value) => total + Number(value || 0), 0).toFixed(4);

export class StockGroupService {
  /**
   * Lojas visíveis a partir da loja do token: todas as lojas ativas do mesmo
   * grupo (mesmo sem vínculo do membro nelas) ou apenas a própria loja quando
   * ela não pertence a um grupo ativo.
   */
  private async resolveScope(enterpriseId: string): Promise<StockGroupScope> {
    const [current] = await db
      .select({
        id: enterprises.id,
        tradeName: enterprises.tradeName,
        legalName: enterprises.legalName,
        groupId: enterpriseGroups.id,
        groupName: enterpriseGroups.name,
      })
      .from(enterprises)
      .leftJoin(
        enterpriseGroups,
        and(
          eq(enterpriseGroups.id, enterprises.groupId),
          eq(enterpriseGroups.status, "ATIVO"),
          isNull(enterpriseGroups.deletedAt),
        ),
      )
      .where(eq(enterprises.id, enterpriseId))
      .limit(1);
    if (!current) return { group: null, enterprises: [] };
    const self = { id: current.id, tradeName: current.tradeName, legalName: current.legalName };
    if (!current.groupId || !current.groupName) {
      return { group: null, enterprises: [self] };
    }
    const members = await db
      .select({
        id: enterprises.id,
        tradeName: enterprises.tradeName,
        legalName: enterprises.legalName,
      })
      .from(enterprises)
      .where(
        and(
          eq(enterprises.groupId, current.groupId),
          eq(enterprises.status, "ATIVO"),
          isNull(enterprises.deletedAt),
        ),
      )
      .orderBy(asc(enterprises.tradeName));
    const list = members.some((item) => item.id === self.id) ? members : [self, ...members];
    return {
      group: { id: current.groupId, name: current.groupName },
      enterprises: [
        ...list.filter((item) => item.id === self.id),
        ...list.filter((item) => item.id !== self.id),
      ],
    };
  }

  private productConditions(query: ListStockGroupQuery): SQL[] {
    const conditions: SQL[] = [];
    if (query.productId) conditions.push(eq(productsEnterprises.productId, query.productId));
    if (query.barCode) conditions.push(eq(products.barCode, query.barCode));
    if (query.search) {
      const term = `%${query.search}%`;
      const match = or(
        ilike(productsEnterprises.description, term),
        ilike(products.description, term),
        ilike(products.barCode, term),
        ilike(sql`cast(${productsEnterprises.code} as text)`, term),
      );
      if (match) conditions.push(match);
    }
    return conditions;
  }

  public async list(enterpriseId: string, query: ListStockGroupQuery) {
    const { limit, offset } = resolveListPagination(query, DEFAULT_LIMIT);
    const scope = await this.resolveScope(enterpriseId);
    const requested = query.enterpriseIds ? new Set(query.enterpriseIds) : null;
    const scopeEnterprises = requested
      ? scope.enterprises.filter((item) => requested.has(item.id))
      : scope.enterprises;
    const scopeIds = scopeEnterprises.map((item) => item.id);
    const base = {
      group: scope.group,
      enterprises: scopeEnterprises.map((item) => ({
        ...item,
        isCurrent: item.id === enterpriseId,
      })),
    };
    if (scopeIds.length === 0) {
      return { ...base, items: [], total: 0, limit, offset };
    }

    const where = and(
      inArray(productsEnterprises.enterprisesId, scopeIds),
      ...this.productConditions(query),
    );
    const [pageRows, totalRows] = await Promise.all([
      db
        .select({ productId: productsEnterprises.productId })
        .from(productsEnterprises)
        .innerJoin(products, eq(products.id, productsEnterprises.productId))
        .where(where)
        .groupBy(productsEnterprises.productId, products.description)
        .orderBy(asc(products.description), asc(productsEnterprises.productId))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: countDistinct(productsEnterprises.productId) })
        .from(productsEnterprises)
        .innerJoin(products, eq(products.id, productsEnterprises.productId))
        .where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    const productIds = pageRows.map((row) => row.productId);
    if (productIds.length === 0) {
      return { ...base, items: [], total, limit, offset };
    }

    const rows = await db
      .select({
        productId: products.id,
        productDescription: products.description,
        barCode: products.barCode,
        enterpriseId: productsEnterprises.enterprisesId,
        productsEnterprisesId: productsEnterprises.id,
        code: productsEnterprises.code,
        description: productsEnterprises.description,
        stockBalance: productsEnterprises.stockBalance,
      })
      .from(productsEnterprises)
      .innerJoin(products, eq(products.id, productsEnterprises.productId))
      .where(
        and(
          inArray(productsEnterprises.enterprisesId, scopeIds),
          inArray(productsEnterprises.productId, productIds),
        ),
      )
      .orderBy(asc(productsEnterprises.code));

    const items = productIds.map((productId) => {
      const productRows = rows.filter((row) => row.productId === productId);
      const first = productRows[0];
      const stores = scopeEnterprises.map((enterprise) => {
        const entries = productRows
          .filter((row) => row.enterpriseId === enterprise.id)
          .map((row) => ({
            productsEnterprisesId: row.productsEnterprisesId,
            code: row.code,
            description: row.description,
            stockBalance: row.stockBalance,
          }));
        return {
          enterpriseId: enterprise.id,
          tradeName: enterprise.tradeName,
          isCurrent: enterprise.id === enterpriseId,
          registered: entries.length > 0,
          stockBalance: sumBalances(entries.map((entry) => entry.stockBalance)),
          entries,
        };
      });
      return {
        productId,
        description: first?.productDescription ?? "",
        barCode: first?.barCode ?? null,
        totalStockBalance: sumBalances(productRows.map((row) => row.stockBalance)),
        stores,
      };
    });

    return { ...base, items, total, limit, offset };
  }
}

export const stockGroupService = new StockGroupService();
