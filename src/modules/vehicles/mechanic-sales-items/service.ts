import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  enterprisesMembers,
  mechanicSalesItems,
  sales,
  salesItems,
} from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  withEnterpriseAuditContext,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import type {
  CreateMechanicSalesItemInput,
  ListMechanicSalesItemsQuery,
  PatchMechanicSalesItemInput,
} from "./schema.js";

export class MechanicSalesItemsService {
  private tenantScope(enterpriseId: string, id?: string) {
    const base = [
      eq(enterprisesMembers.enterpriseId, enterpriseId),
      isNull(enterprisesMembers.deletedAt),
      eq(sales.enterprisesId, enterpriseId),
    ];
    if (id) base.push(eq(mechanicSalesItems.id, id));
    return and(...base);
  }

  private async assertMechanicInEnterprise( // verifica se o mecânico existe na empresa
    enterpriseId: string,
    mechanicId: string,
  ) {
    const row = (
      await db
        .select({ id: enterprisesMembers.id })
        .from(enterprisesMembers)
        .where(
          and(
            eq(enterprisesMembers.id, mechanicId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            isNull(enterprisesMembers.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new ValidationError(
        [
          {
            path: "body.mechanic",
            message: "Mecanico nao encontrado na empresa",
          },
        ],
        "Mecanico invalido",
      );
    }
  }

  private async assertSaleItemInEnterprise( // verifica se o item de venda existe na empresa
    enterpriseId: string,
    salesItemsId: string,
  ) {
    const row = (
      await db
        .select({ id: salesItems.id })
        .from(salesItems)
        .innerJoin(sales, eq(salesItems.salesId, sales.id))
        .where(
          and(
            eq(salesItems.id, salesItemsId),
            eq(sales.enterprisesId, enterpriseId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new ValidationError(
        [
          {
            path: "body.salesItemsId",
            message: "Item de venda nao encontrado na empresa",
          },
        ],
        "Item de venda invalido",
      );
    }
  }

  public async list( // lista os itens de venda relacionados a um mecânico
    enterpriseId: string,
    query: ListMechanicSalesItemsQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const filters = [this.tenantScope(enterpriseId)!];
    if (query.mechanic) {
      filters.push(eq(mechanicSalesItems.mechanic, query.mechanic));
    }
    if (query.salesItemsId) {
      filters.push(eq(mechanicSalesItems.salesItemsId, query.salesItemsId));
    }
    if (query.saleId) {
      filters.push(eq(salesItems.salesId, query.saleId));
    }
    const where = and(...filters);

    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: mechanicSalesItems.id,
          mechanic: mechanicSalesItems.mechanic,
          salesItemsId: mechanicSalesItems.salesItemsId,
          comissionService: mechanicSalesItems.comissionService,
          createdAt: mechanicSalesItems.createdAt,
          updatedAt: mechanicSalesItems.updatedAt,
          saleId: salesItems.salesId,
          saleOrderNumber: sales.orderNumber,
          saleType: sales.type,
        })
        .from(mechanicSalesItems)
        .innerJoin(
          enterprisesMembers,
          eq(mechanicSalesItems.mechanic, enterprisesMembers.id),
        )
        .innerJoin(
          salesItems,
          eq(mechanicSalesItems.salesItemsId, salesItems.id),
        )
        .innerJoin(sales, eq(salesItems.salesId, sales.id))
        .where(where)
        .orderBy(asc(mechanicSalesItems.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(mechanicSalesItems)
        .innerJoin(
          enterprisesMembers,
          eq(mechanicSalesItems.mechanic, enterprisesMembers.id),
        )
        .innerJoin(
          salesItems,
          eq(mechanicSalesItems.salesItemsId, salesItems.id),
        )
        .innerJoin(sales, eq(salesItems.salesId, sales.id))
        .where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select({
          id: mechanicSalesItems.id,
          mechanic: mechanicSalesItems.mechanic,
          salesItemsId: mechanicSalesItems.salesItemsId,
          comissionService: mechanicSalesItems.comissionService,
          createdAt: mechanicSalesItems.createdAt,
          updatedAt: mechanicSalesItems.updatedAt,
          saleId: salesItems.salesId,
          saleOrderNumber: sales.orderNumber,
          saleType: sales.type,
        })
        .from(mechanicSalesItems)
        .innerJoin(
          enterprisesMembers,
          eq(mechanicSalesItems.mechanic, enterprisesMembers.id),
        )
        .innerJoin(
          salesItems,
          eq(mechanicSalesItems.salesItemsId, salesItems.id),
        )
        .innerJoin(sales, eq(salesItems.salesId, sales.id))
        .where(this.tenantScope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Comissao de mecanico no item nao encontrada",
        "MECHANIC_SALE_ITEM_COMMISSION_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateMechanicSalesItemInput,
    audit: EntityAuditContext,
  ) {
    await this.assertMechanicInEnterprise(enterpriseId, input.mechanic);
    await this.assertSaleItemInEnterprise(enterpriseId, input.salesItemsId);
    const ctx = withEnterpriseAuditContext(audit, enterpriseId);
    try {
      const [row] = await db
        .insert(mechanicSalesItems)
        .values({
          mechanic: input.mechanic,
          salesItemsId: input.salesItemsId,
          ...(input.comissionService !== undefined
            ? { comissionService: input.comissionService.toString() }
            : {}),
        })
        .returning();
      if (!row) throw new Error("Falha ao criar comissao de mecanico");
      await recordCreateAudit({
        entityType: EntityTypes.MECHANIC_SALES_ITEMS,
        entityId: row.id,
        after: row,
        ctx,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Ja existe comissao para este mecanico e item de venda",
          "MECHANIC_SALE_ITEM_COMMISSION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchMechanicSalesItemInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    const ctx = withEnterpriseAuditContext(audit, enterpriseId);
    const [row] = await db
      .update(mechanicSalesItems)
      .set({
        comissionService: input.comissionService.toString(),
        updatedAt: new Date(),
      })
      .where(eq(mechanicSalesItems.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Comissao de mecanico no item nao encontrada",
        "MECHANIC_SALE_ITEM_COMMISSION_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.MECHANIC_SALES_ITEMS,
      entityId: id,
      action: "UPDATE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx,
    });
    return row;
  }

  public async delete(
    enterpriseId: string,
    id: string,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    const ctx = withEnterpriseAuditContext(audit, enterpriseId);
    const [row] = await db
      .delete(mechanicSalesItems)
      .where(eq(mechanicSalesItems.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Comissao de mecanico no item nao encontrada",
        "MECHANIC_SALE_ITEM_COMMISSION_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.MECHANIC_SALES_ITEMS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx,
    });
    return row;
  }
}

export const mechanicSalesItemsService = new MechanicSalesItemsService();
