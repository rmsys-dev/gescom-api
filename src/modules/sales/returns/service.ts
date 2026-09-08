import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  productTypes,
  sales,
  salesItems,
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
import {
  isServiceProductType,
  isServiceProductTypeById,
} from "../../../shared/products/product-type-service.js";
import { applySaleReturnDocumentItemStockIn } from "../sale-stock.js";
import { nextSaleReturnOrder } from "./sequences.js";
import type {
  CreateFullReturnInput,
  CreatePartialReturnInput,
} from "./schema.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type SaleReturnSituation = "SEM_DEVOLUCAO" | "PARCIAL" | "TOTAL";
type SaleReturnRow = typeof salesReturns.$inferSelect;

export class SalesReturnsService {
  private saleScope(enterpriseId: string, saleId: string) {
    return and(eq(sales.id, saleId), eq(sales.enterprisesId, enterpriseId));
  }

  private returnScope(enterpriseId: string, saleId: string, returnId: string) {
    return and(
      eq(salesReturns.id, returnId),
      eq(salesReturns.salesId, saleId),
      eq(sales.id, saleId),
      eq(sales.enterprisesId, enterpriseId),
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
    // FINALIZADA = sem devolucao previa; PARCIAL = ainda ha saldo devolvivel
    if (sale.status !== "FINALIZADA" && sale.status !== "PARCIAL") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Devolucao exige pedido FINALIZADO ou PARCIAL",
          },
        ],
        "Pedido nao elegivel para devolucao",
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

    if (await isServiceProductTypeById(item.productTypeId)) {
      return { item, returnable: 0 };
    }

    const sold = Number(item.quantity);
    const returned = Number(item.quantityReturned ?? 0);
    return { item, returnable: sold - returned };
  }

  private async syncSaleReturnSituation(tx: Tx, saleId: string) {
    const items = await tx
      .select({
        quantity: salesItems.quantity,
        quantityReturned: salesItems.quantityReturned,
        typeCode: productTypes.type,
      })
      .from(salesItems)
      .innerJoin(productTypes, eq(salesItems.productTypeId, productTypes.id))
      .where(eq(salesItems.salesId, saleId));

    const returnableItems = items.filter(
      (i) => !isServiceProductType(i.typeCode),
    );

    let situation: SaleReturnSituation = "SEM_DEVOLUCAO";

    if (returnableItems.length > 0) {
      const anyReturned = returnableItems.some(
        (i) => Number(i.quantityReturned ?? 0) > 0,
      );
      const allFullyReturned = returnableItems.every(
        (i) => Number(i.quantityReturned ?? 0) >= Number(i.quantity),
      );

      if (allFullyReturned && anyReturned) {
        situation = "TOTAL";
      } else if (anyReturned) {
        situation = "PARCIAL";
      }
    }

    // Devolucao parcial → status PARCIAL; total → CANCELADA; sem devolucao → FINALIZADA
    const status =
      situation === "TOTAL"
        ? ("CANCELADA" as const)
        : situation === "PARCIAL"
          ? ("PARCIAL" as const)
          : ("FINALIZADA" as const);

    await tx
      .update(sales)
      .set({
        returnSituation: situation,
        status,
        updatedAt: new Date(),
      })
      .where(eq(sales.id, saleId));
  }

  private async createReturnLine(
    tx: Tx,
    params: {
      enterpriseId: string;
      saleId: string;
      saleOrderNumber: number;
      userId: string;
      saleItemId: string;
      quantity: number;
    },
  ): Promise<SaleReturnRow> {
    const { item, returnable } = await this.getReturnableQuantity(
      tx,
      params.saleItemId,
      params.saleId,
    );
    if (await isServiceProductTypeById(item.productTypeId)) {
      throw new ValidationError(
        [
          {
            path: "body.saleItemId",
            message: "Devolucao somente para pecas",
          },
        ],
        "Item de servico nao devolve",
      );
    }
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
    if (!item.locationsId) {
      throw new ValidationError(
        [{ path: "body.saleItemId", message: "Item sem locacao de estoque" }],
        "Locacao obrigatoria",
      );
    }

    const returnOrder = await nextSaleReturnOrder(params.saleId, tx);
    const [returnRow] = await tx
      .insert(salesReturns)
      .values({
        returnOrder,
        salesId: params.saleId,
        saleItemId: params.saleItemId,
        quantity: params.quantity.toString(),
        userId: params.userId,
      })
      .returning();
    if (!returnRow) throw new Error("Falha ao criar devolucao");

    await applySaleReturnDocumentItemStockIn(tx, {
      enterpriseId: params.enterpriseId,
      userId: params.userId,
      salesReturnId: returnRow.id,
      returnOrder: returnRow.returnOrder,
      saleOrderNumber: params.saleOrderNumber,
      returnItem: {
        quantity: returnRow.quantity,
        saleItem: item,
      },
    });

    const returnedAfter = Number(item.quantityReturned) + params.quantity;
    await tx
      .update(salesItems)
      .set({
        quantityReturned: returnedAfter.toString(),
        updatedAt: new Date(),
      })
      .where(eq(salesItems.id, item.id));

    return returnRow;
  }

  public async list(enterpriseId: string, saleId: string) {
    await this.getSaleRow(db, enterpriseId, saleId);
    const where = eq(salesReturns.salesId, saleId);
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
        .select({
          return: salesReturns,
          saleItem: salesItems,
        })
        .from(salesReturns)
        .innerJoin(sales, eq(salesReturns.salesId, sales.id))
        .innerJoin(salesItems, eq(salesReturns.saleItemId, salesItems.id))
        .where(this.returnScope(enterpriseId, saleId, salesReturnId))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Devolucao nao encontrada",
        "SALE_RETURN_NOT_FOUND",
      );
    }
    return { ...row.return, saleItem: row.saleItem };
  }

  public async createPartialReturn(
    enterpriseId: string,
    saleId: string,
    userId: string,
    input: CreatePartialReturnInput,
    audit: EntityAuditContext,
  ) {
    const createdRows = await db.transaction(async (tx) => {
      const sale = await this.getSaleForReturn(tx, enterpriseId, saleId);
      const rows: SaleReturnRow[] = [];

      for (const line of input.items) {
        const returnRow = await this.createReturnLine(tx, {
          enterpriseId,
          saleId,
          saleOrderNumber: sale.orderNumber,
          userId,
          saleItemId: line.saleItemId,
          quantity: line.quantity,
        });
        rows.push(returnRow);
      }

      await this.syncSaleReturnSituation(tx, saleId);
      return rows;
    });

    for (const row of createdRows) {
      await recordCreateAudit({
        entityType: EntityTypes.SALES_RETURNS,
        entityId: row.id,
        after: toAuditRecord(row),
        ctx: { ...audit, enterpriseId },
      });
    }

    return { items: createdRows };
  }

  public async createFullReturn(
    enterpriseId: string,
    saleId: string,
    userId: string,
    _input: CreateFullReturnInput,
    audit: EntityAuditContext,
  ) {
    const createdRows = await db.transaction(async (tx) => {
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

      const rows: SaleReturnRow[] = [];
      for (const line of linesToReturn) {
        const returnRow = await this.createReturnLine(tx, {
          enterpriseId,
          saleId,
          saleOrderNumber: sale.orderNumber,
          userId,
          saleItemId: line.saleItemId,
          quantity: line.quantity,
        });
        rows.push(returnRow);
      }

      await this.syncSaleReturnSituation(tx, saleId);
      return rows;
    });

    for (const row of createdRows) {
      await recordCreateAudit({
        entityType: EntityTypes.SALES_RETURNS,
        entityId: row.id,
        after: toAuditRecord(row),
        ctx: { ...audit, enterpriseId },
      });
    }

    return { items: createdRows };
  }
}

export const salesReturnsService = new SalesReturnsService();
