import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  sales,
  salesItems,
  salesReturnItems,
  salesReturns,
} from "../../../db/schema.js";
import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/app-error.js";
import {
  recordCreateAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { isServiceProductType } from "../../../shared/products/product-type-service.js";
import { applySaleReturnDocumentItemStockIn } from "../sale-stock.js";
import { nextSaleReturnNumber } from "./sequences.js";
import type {
  CreateFullReturnInput,
  CreatePartialReturnInput,
} from "./schema.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type SaleReturnKind = "PARCIAL" | "TOTAL";
type SaleReturnSituation = "SEM_DEVOLUCAO" | "PARCIAL" | "TOTAL";

const roundMoney = (value: number, scale: number) => {
  const factor = 10 ** scale;
  return Math.round(value * factor) / factor;
};

export class SalesReturnsService {
  private saleScope(enterpriseId: string, saleId: string) {
    return and(eq(sales.id, saleId), eq(sales.enterprisesId, enterpriseId));
  }

  private returnScope(enterpriseId: string, saleId: string, returnId: string) {
    return and(
      eq(salesReturns.id, returnId),
      eq(salesReturns.saleId, saleId),
      eq(salesReturns.enterprisesId, enterpriseId),
    );
  }

  private async getSaleRow(
    runner: Tx | typeof db,
    enterpriseId: string,
    saleId: string,
  ) {
    const sale = (
      await runner
        .select()
        .from(sales)
        .where(this.saleScope(enterpriseId, saleId))
        .limit(1)
    )[0];
    if (!sale) {
      throw new NotFoundError("Venda nao encontrada", "SALE_NOT_FOUND");
    }
    return sale;
  }

  private assertSaleForReturn(sale: typeof sales.$inferSelect) {
    if (sale.type !== "VENDA") {
      throw new ValidationError(
        [{ path: "params.saleId", message: "Devolucao apenas para VENDA" }],
        "Tipo invalido",
      );
    }
    if (sale.status !== "FINALIZADA") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Devolucao exige pedido FINALIZADO",
          },
        ],
        "Pedido nao finalizado",
      );
    }
  }

  private async getSaleForReturn(
    tx: Tx,
    enterpriseId: string,
    saleId: string,
  ) {
    const sale = await this.getSaleRow(tx, enterpriseId, saleId);
    this.assertSaleForReturn(sale);
    return sale;
  }

  private async getReturnableQuantity(
    tx: Tx,
    saleItemId: string,
    saleId: string,
  ) {
    const item = (
      await tx
        .select()
        .from(salesItems)
        .where(
          and(eq(salesItems.id, saleItemId), eq(salesItems.salesId, saleId)),
        )
        .limit(1)
    )[0];
    if (!item) {
      throw new NotFoundError(
        "Item da venda nao encontrado",
        "SALE_ITEM_NOT_FOUND",
      );
    }

    const pendingSum = (
      await tx
        .select({
          total: sql<string>`coalesce(sum(${salesReturnItems.quantity}), 0)`,
        })
        .from(salesReturnItems)
        .innerJoin(
          salesReturns,
          eq(salesReturnItems.salesReturnId, salesReturns.id),
        )
        .where(
          and(
            eq(salesReturnItems.saleItemId, saleItemId),
            eq(salesReturns.saleId, saleId),
            eq(salesReturns.status, "ABERTA"),
          ),
        )
    )[0];

    const sold = Number(item.quantity);
    const returned = Number(item.quantityReturned ?? 0);
    const pending = Number(pendingSum?.total ?? 0);
    return { item, returnable: sold - returned - pending };
  }

  private computeReturnItemValues(
    saleItem: typeof salesItems.$inferSelect,
    returnQuantity: number,
  ) {
    const soldQty = Number(saleItem.quantity);
    const lineTotal = Number(saleItem.valueTotal);
    const valueTotal =
      soldQty > 0
        ? roundMoney((lineTotal / soldQty) * returnQuantity, 4)
        : 0;
    return {
      valueUnit: saleItem.valueUnit,
      valueTotal: valueTotal.toFixed(4),
    };
  }

  private async syncSaleReturnSituation(tx: Tx, saleId: string) {
    const items = await tx
      .select({
        quantity: salesItems.quantity,
        quantityReturned: salesItems.quantityReturned,
      })
      .from(salesItems)
      .where(eq(salesItems.salesId, saleId));

    let situation: SaleReturnSituation = "SEM_DEVOLUCAO";

    if (items.length > 0) {
      const anyReturned = items.some(
        (i) => Number(i.quantityReturned ?? 0) > 0,
      );
      const allFullyReturned = items.every(
        (i) => Number(i.quantityReturned ?? 0) >= Number(i.quantity),
      );

      if (allFullyReturned && anyReturned) {
        situation = "TOTAL";
      } else if (anyReturned) {
        situation = "PARCIAL";
      }
    }

    await tx
      .update(sales)
      .set({ returnSituation: situation, updatedAt: new Date() })
      .where(eq(sales.id, saleId));
  }

  private async createReturnDocument(
    tx: Tx,
    params: {
      enterpriseId: string;
      saleId: string;
      userId: string;
      kind: SaleReturnKind;
      notes?: string | null;
    },
  ) {
    const returnNumber = await nextSaleReturnNumber(params.enterpriseId, tx);
    const [returnRow] = await tx
      .insert(salesReturns)
      .values({
        returnNumber,
        saleId: params.saleId,
        enterprisesId: params.enterpriseId,
        userId: params.userId,
        kind: params.kind,
        status: "ABERTA",
        valueTotal: "0",
        notes: params.notes?.trim() ?? null,
      })
      .returning();
    if (!returnRow) throw new Error("Falha ao criar devolucao");
    return returnRow;
  }

  private async insertReturnItem(
    tx: Tx,
    params: {
      enterpriseId: string;
      saleId: string;
      salesReturnId: string;
      saleItemId: string;
      quantity: number;
    },
  ) {
    const { item, returnable } = await this.getReturnableQuantity(
      tx,
      params.saleItemId,
      params.saleId,
    );
    if (params.quantity > returnable) {
      throw new ValidationError(
        [
          {
            path: "body.quantity",
            message: `Quantidade devolvivel maxima: ${returnable}`,
          },
        ],
        "Quantidade invalida",
      );
    }
    if (
      !item.stockLocationId &&
      !(await isServiceProductType(item.productTypeId))
    ) {
      throw new ValidationError(
        [{ path: "body.saleItemId", message: "Item sem locacao de estoque" }],
        "Locacao obrigatoria",
      );
    }

    const { valueUnit, valueTotal } = this.computeReturnItemValues(
      item,
      params.quantity,
    );

    await tx.insert(salesReturnItems).values({
      salesReturnId: params.salesReturnId,
      saleItemId: params.saleItemId,
      quantity: params.quantity.toString(),
      valueUnit,
      valueTotal,
    });
  }

  private async finalizeReturnDocument(
    tx: Tx,
    params: {
      enterpriseId: string;
      saleId: string;
      salesReturnId: string;
      userId: string;
      returnNumber: number;
      saleOrderNumber: number;
      notes?: string | null;
    },
  ) {
    const lines = await tx
      .select({
        returnItem: salesReturnItems,
        saleItem: salesItems,
      })
      .from(salesReturnItems)
      .innerJoin(salesItems, eq(salesReturnItems.saleItemId, salesItems.id))
      .where(eq(salesReturnItems.salesReturnId, params.salesReturnId));

    if (lines.length === 0) {
      throw new ValidationError(
        [{ path: "body.items", message: "Devolucao sem itens" }],
        "Itens obrigatorios",
      );
    }

    for (const line of lines) {
      await applySaleReturnDocumentItemStockIn(tx, {
        enterpriseId: params.enterpriseId,
        userId: params.userId,
        salesReturnId: params.salesReturnId,
        returnNumber: params.returnNumber,
        saleOrderNumber: params.saleOrderNumber,
        returnItem: {
          id: line.returnItem.id,
          quantity: line.returnItem.quantity,
          saleItem: line.saleItem,
        },
      });

      const returnedAfter =
        Number(line.saleItem.quantityReturned) +
        Number(line.returnItem.quantity);
      await tx
        .update(salesItems)
        .set({
          quantityReturned: returnedAfter.toString(),
          updatedAt: new Date(),
        })
        .where(eq(salesItems.id, line.saleItem.id));
    }

    const documentValueTotal = roundMoney(
      lines.reduce(
        (sum, line) => sum + Number(line.returnItem.valueTotal),
        0,
      ),
      2,
    );

    await tx
      .update(salesReturns)
      .set({
        status: "FINALIZADA",
        valueTotal: documentValueTotal.toFixed(2),
        ...(params.notes !== undefined ? { notes: params.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(salesReturns.id, params.salesReturnId));

    await this.syncSaleReturnSituation(tx, params.saleId);
  }

  public async list(enterpriseId: string, saleId: string) {
    await this.getSaleRow(db, enterpriseId, saleId);
    const where = and(
      eq(salesReturns.saleId, saleId),
      eq(salesReturns.enterprisesId, enterpriseId),
    );
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(salesReturns)
        .where(where)
        .orderBy(desc(salesReturns.createdAt), asc(salesReturns.id))
        .limit(50),
      db.select({ c: count() }).from(salesReturns).where(where),
    ]);
    return { items, total: Number(totalRows[0]?.c ?? 0) };
  }

  public async getById(
    enterpriseId: string,
    saleId: string,
    salesReturnId: string,
  ) {
    const row = (
      await db
        .select()
        .from(salesReturns)
        .where(this.returnScope(enterpriseId, saleId, salesReturnId))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Devolucao nao encontrada",
        "SALE_RETURN_NOT_FOUND",
      );
    }
    const items = await db
      .select({
        id: salesReturnItems.id,
        salesReturnId: salesReturnItems.salesReturnId,
        saleItemId: salesReturnItems.saleItemId,
        quantity: salesReturnItems.quantity,
        valueUnit: salesReturnItems.valueUnit,
        valueTotal: salesReturnItems.valueTotal,
        createdAt: salesReturnItems.createdAt,
        updatedAt: salesReturnItems.updatedAt,
        saleItem: salesItems,
      })
      .from(salesReturnItems)
      .innerJoin(salesItems, eq(salesReturnItems.saleItemId, salesItems.id))
      .where(eq(salesReturnItems.salesReturnId, salesReturnId));
    return { ...row, items };
  }

  public async createPartialReturn(
    enterpriseId: string,
    saleId: string,
    userId: string,
    input: CreatePartialReturnInput,
    audit: EntityAuditContext,
  ) {
    let returnHeader!: typeof salesReturns.$inferSelect;
    const salesReturnId = await db.transaction(async (tx) => {
      const sale = await this.getSaleForReturn(tx, enterpriseId, saleId);
      const returnRow = await this.createReturnDocument(tx, {
        enterpriseId,
        saleId,
        userId,
        kind: "PARCIAL",
        notes: input.notes,
      });

      for (const line of input.items) {
        await this.insertReturnItem(tx, {
          enterpriseId,
          saleId,
          salesReturnId: returnRow.id,
          saleItemId: line.saleItemId,
          quantity: line.quantity,
        });
      }

      await this.finalizeReturnDocument(tx, {
        enterpriseId,
        saleId,
        salesReturnId: returnRow.id,
        userId,
        returnNumber: returnRow.returnNumber,
        saleOrderNumber: sale.orderNumber,
        notes: input.notes?.trim() ?? null,
      });

      returnHeader = (
        await tx
          .select()
          .from(salesReturns)
          .where(eq(salesReturns.id, returnRow.id))
          .limit(1)
      )[0]!;
      return returnRow.id;
    });

    await recordCreateAudit({
      entityType: EntityTypes.SALES_RETURNS,
      entityId: salesReturnId,
      after: toAuditRecord(returnHeader),
      ctx: { ...audit, enterpriseId },
    });

    return this.getById(enterpriseId, saleId, salesReturnId);
  }

  public async createFullReturn(
    enterpriseId: string,
    saleId: string,
    userId: string,
    input: CreateFullReturnInput,
    audit: EntityAuditContext,
  ) {
    let returnHeader!: typeof salesReturns.$inferSelect;
    const salesReturnId = await db.transaction(async (tx) => {
      const sale = await this.getSaleForReturn(tx, enterpriseId, saleId);
      const saleItemRows = await tx
        .select()
        .from(salesItems)
        .where(eq(salesItems.salesId, saleId));

      const linesToReturn: { saleItemId: string; quantity: number }[] = [];
      for (const item of saleItemRows) {
        const { returnable } = await this.getReturnableQuantity(
          tx,
          item.id,
          saleId,
        );
        if (returnable > 0) {
          linesToReturn.push({ saleItemId: item.id, quantity: returnable });
        }
      }

      if (linesToReturn.length === 0) {
        throw new ValidationError(
          [{ path: "params.saleId", message: "Nada a devolver" }],
          "Sem saldo devolvivel",
        );
      }

      const returnRow = await this.createReturnDocument(tx, {
        enterpriseId,
        saleId,
        userId,
        kind: "TOTAL",
        notes: input.notes,
      });

      for (const line of linesToReturn) {
        await this.insertReturnItem(tx, {
          enterpriseId,
          saleId,
          salesReturnId: returnRow.id,
          saleItemId: line.saleItemId,
          quantity: line.quantity,
        });
      }

      await this.finalizeReturnDocument(tx, {
        enterpriseId,
        saleId,
        salesReturnId: returnRow.id,
        userId,
        returnNumber: returnRow.returnNumber,
        saleOrderNumber: sale.orderNumber,
        notes: input.notes?.trim() ?? null,
      });

      returnHeader = (
        await tx
          .select()
          .from(salesReturns)
          .where(eq(salesReturns.id, returnRow.id))
          .limit(1)
      )[0]!;
      return returnRow.id;
    });

    await recordCreateAudit({
      entityType: EntityTypes.SALES_RETURNS,
      entityId: salesReturnId,
      after: toAuditRecord(returnHeader),
      ctx: { ...audit, enterpriseId },
    });

    return this.getById(enterpriseId, saleId, salesReturnId);
  }
}

export const salesReturnsService = new SalesReturnsService();
