import { and, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { mechanicSalesItems, sales, salesItems } from "../../../db/schema.js";
import { NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import type { EntityAuditContext } from "../../../shared/audit/entity-audit.js";
import {
  getProductTypeCode,
  isServiceProductType,
} from "../../../shared/products/product-type-service.js";
import {
  applySaleItemStockOut,
  applySaleItemStockReturn,
  assertSaleItemStockAvailable,
  syncSaleItemStockOnUpdate,
  validateSaleItemStock,
} from "../sale-stock.js";
import type { CreateSaleItemInput, PatchSaleItemInput } from "../schema.js";
import { SalesServiceConversions } from "./sales-service-conversions.js";
import type { SaleAuthContext } from "./sales-service-core.js";

export class SalesService extends SalesServiceConversions {
  public async addItem(
    enterpriseId: string,
    saleId: string,
    auth: SaleAuthContext | null,
    input: CreateSaleItemInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    if (!auth?.userId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }

    let beforeRow!: typeof sales.$inferSelect;
    await db.transaction(async (tx) => {
      beforeRow = await this.getSaleRow(tx, enterpriseId, saleId);
      const sale = beforeRow;
      await this.assertSaleTypeAllowed(enterpriseId, sale.type);
      this.assertBudgetEditableForItems(sale);

      if (this.shouldMoveStock(sale)) {
        await this.assertVendaDoesNotAcceptService(
          sale.type,
          input.productTypeId,
          "body.productTypeId",
          { allowService: Boolean(sale.sourceWorkOrderSaleId) },
        );
        await assertSaleItemStockAvailable(tx, enterpriseId, input, "body");
      } else {
        await this.assertVendaDoesNotAcceptService(
          sale.type,
          input.productTypeId,
          "body.productTypeId",
          { allowService: Boolean(sale.sourceWorkOrderSaleId) },
        );
        await validateSaleItemStock(enterpriseId, input, "body");
      }

      await this.assertServiceItemDescription(
        input.productTypeId,
        input.description,
        "body.description",
      );
      await this.assertServiceItemTypeService(
        input.productTypeId,
        input.typeService,
        "body.typeService",
      );

      const actor = await this.resolveItemActor(
        auth,
        enterpriseId,
        sale,
        input.sellerId,
      );

      const { item: pricedItem, priceSnapshot } =
        await this.resolveSaleItemPricing(tx, input);

      await this.assertItemLineDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        actor.sellerId,
        {
          quantity: pricedItem.quantity,
          valueUnit: pricedItem.valueUnit,
          valueDiscount: pricedItem.valueDiscount,
        },
        "body.valueDiscount",
      );

      const [inserted] = await tx
        .insert(salesItems)
        .values(
          this.mapItemInputToInsert(
            saleId,
            pricedItem,
            actor,
            this.resolveItemLaunchOrigin(input.origin, gescomClient),
            priceSnapshot,
          ),
        )
        .returning();
      if (!inserted) throw new Error("Falha ao incluir item na venda");

      await this.insertItemMechanics(
        tx,
        enterpriseId,
        sale.type,
        inserted.id,
        input.mechanics,
        "body.mechanics",
      );

      if (this.shouldMoveStock(sale)) {
        await applySaleItemStockOut(tx, {
          enterpriseId,
          userId: auth.userId,
          saleId,
          orderNumber: sale.orderNumber,
          item: inserted,
        });
      }

      const updatedSale = await this.getSaleRow(tx, enterpriseId, saleId);
      const totals = await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        updatedSale,
      );
      await this.assertSaleDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        updatedSale.sellerId,
        totals,
      );
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }

  public async removeItem(
    enterpriseId: string,
    saleId: string,
    saleItemId: string,
    userId: string | null,
    audit: EntityAuditContext,
  ) {
    let beforeRow!: typeof sales.$inferSelect;
    await db.transaction(async (tx) => {
      beforeRow = await this.getSaleRow(tx, enterpriseId, saleId);
      const sale = beforeRow;
      await this.assertSaleTypeAllowed(enterpriseId, sale.type);
      this.assertBudgetEditableForItems(sale);

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

      this.assertBudgetItemEditable(sale, item);

      if (this.shouldMoveStock(sale)) {
        await applySaleItemStockReturn(tx, {
          enterpriseId,
          userId,
          saleId,
          orderNumber: sale.orderNumber,
          item,
        });
      }

      await tx
        .delete(mechanicSalesItems)
        .where(eq(mechanicSalesItems.salesItemsId, saleItemId));

      await tx
        .delete(salesItems)
        .where(
          and(eq(salesItems.id, saleItemId), eq(salesItems.salesId, saleId)),
        );

      const updatedSale = await this.getSaleRow(tx, enterpriseId, saleId);
      const totals = await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        updatedSale,
      );
      await this.assertSaleDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        updatedSale.sellerId,
        totals,
      );
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }

  public async updateItem(
    enterpriseId: string,
    saleId: string,
    saleItemId: string,
    userId: string | null,
    input: PatchSaleItemInput,
    audit: EntityAuditContext,
  ) {
    let beforeRow!: typeof sales.$inferSelect;
    await db.transaction(async (tx) => {
      beforeRow = await this.getSaleRow(tx, enterpriseId, saleId);
      const sale = beforeRow;
      await this.assertSaleTypeAllowed(enterpriseId, sale.type);
      this.assertBudgetEditableForItems(sale);

      const existing = (
        await tx
          .select()
          .from(salesItems)
          .where(
            and(eq(salesItems.id, saleItemId), eq(salesItems.salesId, saleId)),
          )
          .limit(1)
      )[0];
      if (!existing) {
        throw new NotFoundError(
          "Item da venda nao encontrado",
          "SALE_ITEM_NOT_FOUND",
        );
      }

      const merged = this.mergeSaleItemPatch(existing, input);
      this.assertBudgetItemEditable(sale, existing, merged.quantity);

      await this.assertServiceItemDescription(
        merged.productTypeId,
        input.description,
        "body.description",
      );
      await this.assertServiceItemTypeService(
        merged.productTypeId,
        input.typeService,
        "body.typeService",
      );

      if (sale.type === "VENDA") {
        const existingTypeCode = await getProductTypeCode(
          existing.productTypeId,
        );
        const existingIsService =
          existingTypeCode != null && isServiceProductType(existingTypeCode);
        if (!existingIsService) {
          await this.assertVendaDoesNotAcceptService(
            sale.type,
            merged.productTypeId,
            "body.productTypeId",
            { allowService: Boolean(sale.sourceWorkOrderSaleId) },
          );
        }
      }

      const { item: pricedItem, priceSnapshot } =
        await this.resolveSaleItemPricing(tx, merged);

      await this.assertItemLineDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        existing.sellerId,
        {
          quantity: pricedItem.quantity,
          valueUnit: pricedItem.valueUnit,
          valueDiscount: pricedItem.valueDiscount,
        },
        "body.valueDiscount",
      );

      if (this.shouldMoveStock(sale)) {
        await syncSaleItemStockOnUpdate(tx, {
          enterpriseId,
          userId,
          saleId,
          orderNumber: sale.orderNumber,
          oldItem: existing,
          newItem: pricedItem,
        });
      } else {
        await validateSaleItemStock(enterpriseId, pricedItem, "body");
      }

      await tx
        .update(salesItems)
        .set({
          quantity: pricedItem.quantity.toString(),
          valueUnit: pricedItem.valueUnit.toString(),
          valueDiscount: pricedItem.valueDiscount.toString(),
          valueAcresce: pricedItem.valueAcresce.toString(),
          valueTotal: pricedItem.valueTotal.toString(),
          productsEnterprisesId: pricedItem.productsEnterprisesId,
          unitid: pricedItem.unitId,
          productTypeId: pricedItem.productTypeId,
          sectorId: pricedItem.sectorId ?? null,
          locationsId: pricedItem.locationsId ?? null,
          stockBatchId: pricedItem.stockBatchId ?? null,
          description: pricedItem.description ?? null,
          ...(pricedItem.typeService !== undefined
            ? { typeService: pricedItem.typeService }
            : {}),
          priceSale: priceSnapshot?.priceSale ?? existing.priceSale,
          promotionalPriceId: priceSnapshot?.promotionalPriceId ?? null,
          averageCost: priceSnapshot?.averageCost ?? existing.averageCost,
          actualRealCost:
            priceSnapshot?.actualRealCost ?? existing.actualRealCost,
          priceCost: priceSnapshot?.priceCost ?? existing.priceCost,
          updatedAt: new Date(),
        })
        .where(
          and(eq(salesItems.id, saleItemId), eq(salesItems.salesId, saleId)),
        );

      const updatedSale = await this.getSaleRow(tx, enterpriseId, saleId);
      const totals = await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        updatedSale,
      );
      await this.assertSaleDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        updatedSale.sellerId,
        totals,
      );
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }
}
