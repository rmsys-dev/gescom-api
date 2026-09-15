import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { sales, salesItems } from "../../../db/schema.js";
import { ValidationError } from "../../../shared/errors/app-error.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import {
  assertSaleItemStockAvailable,
  applySaleItemStockOut,
  validateSaleItemStock,
} from "../sale-stock.js";
import { resolveSaleClosingOrigin } from "../sale-origin.js";
import {
  buildSaleFinancialAdjustmentValues,
  computeBudgetStatus,
  assertSalePaymentsMatchSale,
} from "../sale-financials.js";
import {
  dec,
  decNum,
  formatQuantity,
  mapSaleUniqueViolation,
  mergeSaleMemberSnapshot,
  normalizeSaleMemberOverrides,
  buildSaleServiceFieldValues,
  type SaleConversionClosureKind,
} from "../sale-service-shared.js";
import {
  assertOsEligibleForEstorno,
  buildGeneratedSaleCancelUpdate,
  buildGeneratedSaleItemUnlinkUpdate,
  buildGeneratedSaleUnlinkUpdate,
  buildOsEstornoItemUpdate,
  buildOsEstornoWorkOrderUpdate,
} from "../os-estorno.js";
import { nextSaleOrderNumber } from "../sequences.js";
import type {
  ConvertBudgetToOsInput,
  ConvertBudgetToSaleInput,
  ConvertOsToSaleInput,
  convertOsItemInputSchema,
} from "../schema.js";
import type { z } from "zod";
import { SalesServiceCore, type SaleAuthContext } from "./sales-service-core.js";

type ConvertOsItemLine = z.infer<typeof convertOsItemInputSchema>;

export class SalesServiceConversions extends SalesServiceCore {
  public async convertBudgetToSale(
    enterpriseId: string,
    budgetSaleId: string,
    auth: SaleAuthContext | null,
    input: ConvertBudgetToSaleInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    if (!auth?.userId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }

    const operator = await this.resolveSeller(auth.userId);
    const status = input.status;

    const seenBudgetItemIds = new Set<string>();
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      if (seenBudgetItemIds.has(item.budgetItemId)) {
        throw new ValidationError(
          [
            {
              path: `body.items.${i}.budgetItemId`,
              message: "Item do orcamento duplicado na conversao",
            },
          ],
          "Itens invalidos",
        );
      }
      seenBudgetItemIds.add(item.budgetItemId);
    }

    try {
      let budgetBefore!: typeof sales.$inferSelect;
      const generatedSaleId = await db.transaction(async (tx) => {
        budgetBefore = await this.getSaleRow(tx, enterpriseId, budgetSaleId);
        const budget = budgetBefore;
        this.assertBudgetOpenForConversion(budget);

        const budgetItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, budgetSaleId));

        if (await this.documentHasServiceItem(budgetItems)) {
          throw new ValidationError(
            [
              {
                path: "params.saleId",
                message:
                  "Orcamento com servico deve ser convertido em ordem de servico (convert-to-os)",
              },
            ],
            "Use convert-to-os",
          );
        }

        const budgetItemsById = new Map(
          budgetItems.map((item) => [item.id, item]),
        );

        const conversionLines: {
          budgetItem: typeof salesItems.$inferSelect;
          convertQuantity: number;
          line: (typeof input.items)[number];
          itemIndex: number;
        }[] = [];
        const unclosedRows: {
          budgetItemId: string;
          quantityNotConverted: number;
          justification: string;
        }[] = [];

        for (let i = 0; i < input.items.length; i++) {
          const line = input.items[i];
          const budgetItem = budgetItemsById.get(line.budgetItemId);
          if (!budgetItem) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.budgetItemId`,
                  message: "Item nao pertence ao orcamento",
                },
              ],
              "Item invalido",
            );
          }

          const remaining =
            decNum(budgetItem.quantity) - decNum(budgetItem.quantityConverted);
          if (line.quantity > remaining + 1e-9) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.quantity`,
                  message: `Quantidade excede saldo restante (${remaining})`,
                },
              ],
              "Quantidade invalida",
            );
          }

          if (line.quantity < remaining - 1e-9) {
            const justification = line.unclosedJustification?.trim();
            if (justification) {
              unclosedRows.push({
                budgetItemId: budgetItem.id,
                quantityNotConverted: remaining - line.quantity,
                justification,
              });
            }
          }

          if (line.quantity > 0) {
            conversionLines.push({
              budgetItem,
              convertQuantity: line.quantity,
              line,
              itemIndex: i,
            });
          }
        }

        const memberId = input.memberId ?? budget.memberId;
        if (!memberId) {
          throw new ValidationError(
            [
              {
                path: "params.saleId",
                message: "Orcamento sem cliente vinculado",
              },
            ],
            "Cliente obrigatorio",
          );
        }
        await this.assertClientMember(
          tx,
          enterpriseId,
          memberId,
          status === "FINALIZADA" ? input.payments : undefined,
        );

        const vehiclesEnterprisesMembersId =
          this.resolveVehiclesEnterprisesMembersId(
            input.vehiclesEnterprisesMembersId,
            budget.vehiclesEnterprisesMembersId,
            "body.vehiclesEnterprisesMembersId",
            false,
          );
        if (vehiclesEnterprisesMembersId) {
          await this.assertVehiclesEnterprisesMember(
            tx,
            enterpriseId,
            vehiclesEnterprisesMembersId,
            memberId,
          );
        }

        const orderNumber = await nextSaleOrderNumber(enterpriseId, tx);

        const seller = await this.resolveSaleSeller(
          auth,
          enterpriseId,
          input.sellerId,
          budget.sellerId,
        );

        const closingOrigin =
          status === "FINALIZADA"
            ? resolveSaleClosingOrigin(input.origin, gescomClient)
            : undefined;

        const memberSnapshot = mergeSaleMemberSnapshot(
          await this.buildSaleMemberSnapshot(tx, enterpriseId, memberId),
          normalizeSaleMemberOverrides(input.member),
        );
        if (!memberSnapshot.memberLegalName) {
          throw new ValidationError(
            [
              {
                path: "body.memberId",
                message: "Cliente sem nome legal",
              },
            ],
            "Cliente invalido",
          );
        }

        const [generatedSale] = await tx
          .insert(sales)
          .values({
            orderNumber,
            userId: operator.userId,
            userLegalName: operator.userLegalName,
            sellerId: seller.sellerId,
            sellerLegalName: seller.sellerLegalName,
            memberId,
            type: "VENDA",
            subTotal: "0",
            discountValuetems: dec(input.discountValuetems),
            valueAcresceItems: dec(input.valueAcresceItems),
            ...buildSaleFinancialAdjustmentValues(input),
            ...buildSaleServiceFieldValues({ ...input, type: "VENDA" }),
            valueLiquid: "0",
            status,
            sourceBudgetSaleId: budgetSaleId,
            ...(closingOrigin !== undefined ? { origin: closingOrigin } : {}),
            completedionDate: status === "FINALIZADA" ? new Date() : null,
            vehiclesEnterprisesMembersId,
            enterprisesId: enterpriseId,
          })
          .returning();
        if (!generatedSale)
          throw new Error("Falha ao gerar venda do orcamento");

        await this.upsertSaleMember(tx, generatedSale.id, memberSnapshot);

        const conversionItemRows: {
          budgetItemId: string;
          saleItemId: string;
          quantity: string;
        }[] = [];

        for (let i = 0; i < conversionLines.length; i++) {
          const { budgetItem, convertQuantity, line, itemIndex } =
            conversionLines[i];
          const itemPath = `body.items.${itemIndex}`;
          const itemInput = await this.resolveConversionItemInput(
            tx,
            enterpriseId,
            budgetItem,
            convertQuantity,
            itemPath,
            line,
          );

          await assertSaleItemStockAvailable(
            tx,
            enterpriseId,
            itemInput,
            itemPath,
          );

          const actor = await this.resolveItemActor(
            auth,
            enterpriseId,
            generatedSale,
          );

          await this.assertItemLineDiscountWithinMemberLimitForSeller(
            tx,
            enterpriseId,
            actor.sellerId,
            {
              quantity: itemInput.quantity,
              valueUnit: itemInput.valueUnit,
              valueDiscount: itemInput.valueDiscount,
            },
            `${itemPath}.valueDiscount`,
          );

          const priceSnapshot = this.priceSnapshotFromBudgetItem(budgetItem);

          const [inserted] = await tx
            .insert(salesItems)
            .values({
              ...this.mapItemInputToInsert(
                generatedSale.id,
                itemInput,
                actor,
                this.resolveItemLaunchOrigin(itemInput.origin, gescomClient),
                priceSnapshot,
              ),
              sourceBudgetItemId: budgetItem.id,
              quantityConverted: formatQuantity(convertQuantity),
            })
            .returning();
          if (!inserted)
            throw new Error("Falha ao incluir item na venda gerada");

          await applySaleItemStockOut(tx, {
            enterpriseId,
            userId: auth.userId,
            saleId: generatedSale.id,
            orderNumber: generatedSale.orderNumber,
            item: inserted,
          });

          const nextConverted =
            decNum(budgetItem.quantityConverted) + convertQuantity;
          const [updatedBudgetItem] = await tx
            .update(salesItems)
            .set({
              quantityConverted: formatQuantity(nextConverted),
              updatedAt: new Date(),
            })
            .where(eq(salesItems.id, budgetItem.id))
            .returning({ id: salesItems.id });
          if (!updatedBudgetItem) {
            throw new Error(
              `Falha ao atualizar quantityConverted do item ${budgetItem.id}`,
            );
          }

          budgetItem.quantityConverted = formatQuantity(nextConverted);

          conversionItemRows.push({
            budgetItemId: budgetItem.id,
            saleItemId: inserted.id,
            quantity: formatQuantity(convertQuantity),
          });
        }

        const totals = await this.recalculateSaleTotalsFromItems(
          tx,
          enterpriseId,
          generatedSale.id,
          generatedSale,
        );
        await this.assertSaleDiscountWithinMemberLimitForSeller(
          tx,
          enterpriseId,
          seller.sellerId,
          totals,
        );

        if (status === "FINALIZADA" && input.payments?.length) {
          const updatedSale = await this.getSaleRow(
            tx,
            enterpriseId,
            generatedSale.id,
          );
          if (!updatedSale) throw new Error("Falha ao recalcular venda gerada");
          await this.applyValueLiquidItemsHeader(tx, generatedSale.id);
          this.assertSalePaymentsMatchSale(
            updatedSale.valueLiquid,
            updatedSale.createdAt,
            input.payments,
          );
          await this.handleCreditSaleMemberStatusOnFinalize(
            tx,
            enterpriseId,
            memberId,
            input.payments,
          );
          await this.insertSalePayments(tx, generatedSale.id, input.payments);
          await this.recalculateSaleItemsCommission(
            tx,
            generatedSale.id,
            seller.sellerId,
            enterpriseId,
            input.payments,
          );
        }

        const updatedBudgetItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, budgetSaleId));

        const computedBudgetStatus =
          this.computeBudgetStatus(updatedBudgetItems);
        const closureKind: SaleConversionClosureKind =
          computedBudgetStatus === "FINALIZADA" ? "TOTAL" : "PARCIAL";

        await tx
          .update(sales)
          .set({
            status: computedBudgetStatus,
            completedionDate:
              computedBudgetStatus === "FINALIZADA" ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(sales.id, budgetSaleId));

        await this.insertSaleConversionAudit(tx, {
          enterprisesId: enterpriseId,
          typeConversion: "ORCAMENTO-VENDA",
          budgetSaleId,
          generatedSaleId: generatedSale.id,
          closureKind,
          userId: operator.userId,
          userLegalName: operator.userLegalName,
          items: conversionItemRows.map((row) => ({
            saleItemId: row.saleItemId,
            quantity: row.quantity,
          })),
          unclosedItems: unclosedRows.map((row) => ({
            saleItemId: row.budgetItemId,
            quantityNotConverted: row.quantityNotConverted,
            justification: row.justification,
          })),
        });

        return generatedSale.id;
      });

      const generatedRow = await this.getSaleRow(
        db,
        enterpriseId,
        generatedSaleId,
      );
      await recordCreateAudit({
        entityType: EntityTypes.SALES,
        entityId: generatedSaleId,
        after: toAuditRecord(generatedRow),
        ctx: { ...audit, enterpriseId },
      });
      const budgetAfter = await this.getSaleRow(db, enterpriseId, budgetSaleId);
      await recordEntityAudit({
        entityType: EntityTypes.SALES,
        entityId: budgetSaleId,
        action: "UPDATE",
        before: toAuditRecord(budgetBefore),
        after: toAuditRecord(budgetAfter),
        ctx: { ...audit, enterpriseId },
      });

      return this.getById(enterpriseId, generatedSaleId);
    } catch (err) {
      const conflict = mapSaleUniqueViolation(err);
      if (conflict) throw conflict;
      throw err;
    }
  }

  public async convertBudgetToOs(
    enterpriseId: string,
    budgetSaleId: string,
    auth: SaleAuthContext | null,
    input: ConvertBudgetToOsInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    await this.assertTrabalhaOsEnabled(enterpriseId);
    if (!auth?.userId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }

    const operator = await this.resolveSeller(auth.userId);
    const status = "ABERTA" as const;

    const seenBudgetItemIds = new Set<string>();
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      if (seenBudgetItemIds.has(item.budgetItemId)) {
        throw new ValidationError(
          [
            {
              path: `body.items.${i}.budgetItemId`,
              message: "Item do orcamento duplicado na conversao",
            },
          ],
          "Itens invalidos",
        );
      }
      seenBudgetItemIds.add(item.budgetItemId);
    }

    try {
      let budgetBefore!: typeof sales.$inferSelect;
      const generatedSaleId = await db.transaction(async (tx) => {
        budgetBefore = await this.getSaleRow(tx, enterpriseId, budgetSaleId);
        const budget = budgetBefore;
        this.assertBudgetOpenForConversion(budget);

        const budgetItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, budgetSaleId));

        if (!(await this.documentHasServiceItem(budgetItems))) {
          throw new ValidationError(
            [
              {
                path: "params.saleId",
                message:
                  "Orcamento sem servico deve usar convert-to-sale (venda)",
              },
            ],
            "Use convert-to-sale",
          );
        }

        const budgetItemsById = new Map(
          budgetItems.map((item) => [item.id, item]),
        );

        const conversionLines: {
          budgetItem: typeof salesItems.$inferSelect;
          convertQuantity: number;
          line: (typeof input.items)[number];
          itemIndex: number;
        }[] = [];
        const unclosedRows: {
          budgetItemId: string;
          quantityNotConverted: number;
          justification: string;
        }[] = [];

        for (let i = 0; i < input.items.length; i++) {
          const line = input.items[i];
          const budgetItem = budgetItemsById.get(line.budgetItemId);
          if (!budgetItem) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.budgetItemId`,
                  message: "Item nao pertence ao orcamento",
                },
              ],
              "Item invalido",
            );
          }

          const remaining =
            decNum(budgetItem.quantity) - decNum(budgetItem.quantityConverted);
          if (line.quantity > remaining + 1e-9) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.quantity`,
                  message: `Quantidade excede saldo restante (${remaining})`,
                },
              ],
              "Quantidade invalida",
            );
          }

          if (line.quantity < remaining - 1e-9) {
            const justification = line.unclosedJustification?.trim();
            if (justification) {
              unclosedRows.push({
                budgetItemId: budgetItem.id,
                quantityNotConverted: remaining - line.quantity,
                justification,
              });
            }
          }

          if (line.quantity > 0) {
            conversionLines.push({
              budgetItem,
              convertQuantity: line.quantity,
              line,
              itemIndex: i,
            });
          }
        }

        const memberId = input.memberId ?? budget.memberId;
        if (!memberId) {
          throw new ValidationError(
            [
              {
                path: "params.saleId",
                message: "Orcamento sem cliente vinculado",
              },
            ],
            "Cliente obrigatorio",
          );
        }
        await this.assertClientMember(tx, enterpriseId, memberId);

        const vehiclesEnterprisesMembersId =
          this.resolveVehiclesEnterprisesMembersId(
            input.vehiclesEnterprisesMembersId,
            budget.vehiclesEnterprisesMembersId,
          );
        await this.assertVehiclesEnterprisesMember(
          tx,
          enterpriseId,
          vehiclesEnterprisesMembersId,
          memberId,
        );

        const orderNumber = await nextSaleOrderNumber(enterpriseId, tx);

        const seller = await this.resolveSaleSeller(
          auth,
          enterpriseId,
          input.sellerId,
          budget.sellerId,
        );

        const memberSnapshot = mergeSaleMemberSnapshot(
          await this.buildSaleMemberSnapshot(tx, enterpriseId, memberId),
          normalizeSaleMemberOverrides(input.member),
        );
        if (!memberSnapshot.memberLegalName) {
          throw new ValidationError(
            [
              {
                path: "body.memberId",
                message: "Cliente sem nome legal",
              },
            ],
            "Cliente invalido",
          );
        }

        const serviceFields = buildSaleServiceFieldValues({
          ...input,
          type: "ORDEM DE SERVICO",
          modelService: input.modelService ?? budget.modelService ?? "VEICULO",
          serviceType: input.serviceType ?? budget.serviceType ?? undefined,
          vehicleMileage:
            input.vehicleMileage ?? budget.vehicleMileage ?? undefined,
          observations: input.observations ?? budget.observations ?? undefined,
          defect: input.defect ?? budget.defect ?? undefined,
        });

        const [generatedSale] = await tx
          .insert(sales)
          .values({
            orderNumber,
            userId: operator.userId,
            userLegalName: operator.userLegalName,
            sellerId: seller.sellerId,
            sellerLegalName: seller.sellerLegalName,
            memberId,
            type: "ORDEM DE SERVICO",
            subTotal: "0",
            discountValuetems: dec(input.discountValuetems),
            valueAcresceItems: dec(input.valueAcresceItems),
            ...buildSaleFinancialAdjustmentValues(input),
            ...serviceFields,
            valueLiquid: "0",
            status,
            sourceBudgetSaleId: budgetSaleId,
            vehiclesEnterprisesMembersId,
            enterprisesId: enterpriseId,
          })
          .returning();
        if (!generatedSale) {
          throw new Error("Falha ao gerar ordem de servico do orcamento");
        }

        await this.upsertSaleMember(tx, generatedSale.id, memberSnapshot);

        const conversionItemRows: {
          budgetItemId: string;
          saleItemId: string;
          quantity: string;
        }[] = [];

        for (let i = 0; i < conversionLines.length; i++) {
          const { budgetItem, convertQuantity, line, itemIndex } =
            conversionLines[i];
          const itemPath = `body.items.${itemIndex}`;
          const itemInput = await this.resolveConversionItemInput(
            tx,
            enterpriseId,
            budgetItem,
            convertQuantity,
            itemPath,
            line,
          );

          await assertSaleItemStockAvailable(
            tx,
            enterpriseId,
            itemInput,
            itemPath,
          );

          const actor = await this.resolveItemActor(
            auth,
            enterpriseId,
            generatedSale,
          );

          await this.assertItemLineDiscountWithinMemberLimitForSeller(
            tx,
            enterpriseId,
            actor.sellerId,
            {
              quantity: itemInput.quantity,
              valueUnit: itemInput.valueUnit,
              valueDiscount: itemInput.valueDiscount,
            },
            `${itemPath}.valueDiscount`,
          );

          const priceSnapshot = this.priceSnapshotFromBudgetItem(budgetItem);

          const [inserted] = await tx
            .insert(salesItems)
            .values({
              ...this.mapItemInputToInsert(
                generatedSale.id,
                itemInput,
                actor,
                this.resolveItemLaunchOrigin(itemInput.origin, gescomClient),
                priceSnapshot,
              ),
              sourceBudgetItemId: budgetItem.id,
              quantityConverted: "0",
            })
            .returning();
          if (!inserted) {
            throw new Error("Falha ao incluir item na ordem de servico gerada");
          }

          await applySaleItemStockOut(tx, {
            enterpriseId,
            userId: auth.userId,
            saleId: generatedSale.id,
            orderNumber: generatedSale.orderNumber,
            item: inserted,
          });

          const nextConverted =
            decNum(budgetItem.quantityConverted) + convertQuantity;
          const [updatedBudgetItem] = await tx
            .update(salesItems)
            .set({
              quantityConverted: formatQuantity(nextConverted),
              updatedAt: new Date(),
            })
            .where(eq(salesItems.id, budgetItem.id))
            .returning({ id: salesItems.id });
          if (!updatedBudgetItem) {
            throw new Error(
              `Falha ao atualizar quantityConverted do item ${budgetItem.id}`,
            );
          }

          budgetItem.quantityConverted = formatQuantity(nextConverted);

          conversionItemRows.push({
            budgetItemId: budgetItem.id,
            saleItemId: inserted.id,
            quantity: formatQuantity(convertQuantity),
          });
        }

        const totals = await this.recalculateSaleTotalsFromItems(
          tx,
          enterpriseId,
          generatedSale.id,
          generatedSale,
        );
        await this.assertSaleDiscountWithinMemberLimitForSeller(
          tx,
          enterpriseId,
          seller.sellerId,
          totals,
        );

        const updatedBudgetItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, budgetSaleId));

        const computedBudgetStatus =
          this.computeBudgetStatus(updatedBudgetItems);
        const closureKind: SaleConversionClosureKind =
          computedBudgetStatus === "FINALIZADA" ? "TOTAL" : "PARCIAL";

        await tx
          .update(sales)
          .set({
            status: computedBudgetStatus,
            completedionDate:
              computedBudgetStatus === "FINALIZADA" ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(sales.id, budgetSaleId));

        await this.insertSaleConversionAudit(tx, {
          enterprisesId: enterpriseId,
          typeConversion: "ORCAMENTO-ORDEM_SERVICO",
          budgetSaleId,
          generatedSaleId: generatedSale.id,
          closureKind,
          userId: operator.userId,
          userLegalName: operator.userLegalName,
          items: conversionItemRows.map((row) => ({
            saleItemId: row.saleItemId,
            quantity: row.quantity,
          })),
          unclosedItems: unclosedRows.map((row) => ({
            saleItemId: row.budgetItemId,
            quantityNotConverted: row.quantityNotConverted,
            justification: row.justification,
          })),
        });

        return generatedSale.id;
      });

      const generatedRow = await this.getSaleRow(
        db,
        enterpriseId,
        generatedSaleId,
      );
      await recordCreateAudit({
        entityType: EntityTypes.SALES,
        entityId: generatedSaleId,
        after: toAuditRecord(generatedRow),
        ctx: { ...audit, enterpriseId },
      });
      const budgetAfter = await this.getSaleRow(db, enterpriseId, budgetSaleId);
      await recordEntityAudit({
        entityType: EntityTypes.SALES,
        entityId: budgetSaleId,
        action: "UPDATE",
        before: toAuditRecord(budgetBefore),
        after: toAuditRecord(budgetAfter),
        ctx: { ...audit, enterpriseId },
      });

      return this.getById(enterpriseId, generatedSaleId);
    } catch (err) {
      const conflict = mapSaleUniqueViolation(err);
      if (conflict) throw conflict;
      throw err;
    }
  }

  public async convertOsToSale(
    enterpriseId: string,
    workOrderSaleId: string,
    auth: SaleAuthContext | null,
    input: ConvertOsToSaleInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    await this.assertTrabalhaOsEnabled(enterpriseId);
    if (!auth?.userId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }

    const operator = await this.resolveSeller(auth.userId);
    const status = input.status;

    const seenItemIds = new Set<string>();
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      if (seenItemIds.has(item.workOrderItemId)) {
        throw new ValidationError(
          [
            {
              path: `body.items.${i}.workOrderItemId`,
              message: "Item da ordem de servico duplicado na conversao",
            },
          ],
          "Itens invalidos",
        );
      }
      seenItemIds.add(item.workOrderItemId);
    }

    try {
      let workOrderBefore!: typeof sales.$inferSelect;
      const generatedSaleId = await db.transaction(async (tx) => {
        workOrderBefore = await this.getSaleRow(
          tx,
          enterpriseId,
          workOrderSaleId,
        );
        const workOrder = workOrderBefore;
        this.assertOsOpenForConversion(workOrder);

        const workOrderItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, workOrderSaleId));

        const workOrderItemsById = new Map(
          workOrderItems.map((item) => [item.id, item]),
        );

        const conversionLines: {
          workOrderItem: typeof salesItems.$inferSelect;
          convertQuantity: number;
          line: ConvertOsItemLine;
          itemIndex: number;
        }[] = [];
        const unclosedRows: {
          workOrderItemId: string;
          quantityNotConverted: number;
          justification: string;
        }[] = [];

        for (let i = 0; i < input.items.length; i++) {
          const line = input.items[i];
          const workOrderItem = workOrderItemsById.get(line.workOrderItemId);
          if (!workOrderItem) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.workOrderItemId`,
                  message: "Item nao pertence a ordem de servico",
                },
              ],
              "Item invalido",
            );
          }

          const remaining =
            decNum(workOrderItem.quantity) -
            decNum(workOrderItem.quantityConverted);
          if (line.quantity > remaining + 1e-9) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.quantity`,
                  message: `Quantidade excede saldo restante (${remaining})`,
                },
              ],
              "Quantidade invalida",
            );
          }

          if (line.quantity < remaining - 1e-9) {
            const justification = line.unclosedJustification?.trim();
            if (justification) {
              unclosedRows.push({
                workOrderItemId: workOrderItem.id,
                quantityNotConverted: remaining - line.quantity,
                justification,
              });
            }
          }

          if (line.quantity > 0) {
            conversionLines.push({
              workOrderItem,
              convertQuantity: line.quantity,
              line,
              itemIndex: i,
            });
          }
        }

        const memberId = input.memberId ?? workOrder.memberId;
        if (!memberId) {
          throw new ValidationError(
            [
              {
                path: "params.saleId",
                message: "Ordem de servico sem cliente vinculado",
              },
            ],
            "Cliente obrigatorio",
          );
        }
        await this.assertClientMember(
          tx,
          enterpriseId,
          memberId,
          status === "FINALIZADA" ? input.payments : undefined,
        );

        const vehiclesEnterprisesMembersId =
          this.resolveVehiclesEnterprisesMembersId(
            input.vehiclesEnterprisesMembersId,
            workOrder.vehiclesEnterprisesMembersId,
          );
        await this.assertVehiclesEnterprisesMember(
          tx,
          enterpriseId,
          vehiclesEnterprisesMembersId,
          memberId,
        );

        const orderNumber = await nextSaleOrderNumber(enterpriseId, tx);

        const seller = await this.resolveSaleSeller(
          auth,
          enterpriseId,
          input.sellerId,
          workOrder.sellerId,
        );

        const closingOrigin =
          status === "FINALIZADA"
            ? resolveSaleClosingOrigin(input.origin, gescomClient)
            : undefined;

        const memberSnapshot = mergeSaleMemberSnapshot(
          await this.buildSaleMemberSnapshot(tx, enterpriseId, memberId),
          normalizeSaleMemberOverrides(input.member),
        );
        if (!memberSnapshot.memberLegalName) {
          throw new ValidationError(
            [
              {
                path: "body.memberId",
                message: "Cliente sem nome legal",
              },
            ],
            "Cliente invalido",
          );
        }

        const serviceFields = buildSaleServiceFieldValues({
          ...input,
          type: "VENDA",
          modelService:
            input.modelService ?? workOrder.modelService ?? undefined,
          vehicleMileage:
            input.vehicleMileage ?? workOrder.vehicleMileage ?? undefined,
          observations:
            input.observations ?? workOrder.observations ?? undefined,
          defect: input.defect ?? workOrder.defect ?? undefined,
        });

        const [generatedSale] = await tx
          .insert(sales)
          .values({
            orderNumber,
            userId: operator.userId,
            userLegalName: operator.userLegalName,
            sellerId: seller.sellerId,
            sellerLegalName: seller.sellerLegalName,
            memberId,
            type: "VENDA",
            subTotal: "0",
            discountValuetems: dec(input.discountValuetems),
            valueAcresceItems: dec(input.valueAcresceItems),
            ...buildSaleFinancialAdjustmentValues(input),
            ...serviceFields,
            valueLiquid: "0",
            status,
            sourceBudgetSaleId: workOrder.sourceBudgetSaleId,
            sourceWorkOrderSaleId: workOrderSaleId,
            ...(closingOrigin !== undefined ? { origin: closingOrigin } : {}),
            completedionDate: status === "FINALIZADA" ? new Date() : null,
            vehiclesEnterprisesMembersId,
            enterprisesId: enterpriseId,
          })
          .returning();
        if (!generatedSale) {
          throw new Error("Falha ao gerar venda da ordem de servico");
        }

        await this.upsertSaleMember(tx, generatedSale.id, memberSnapshot);

        const conversionItemRows: {
          saleItemId: string;
          quantity: string;
        }[] = [];

        for (let i = 0; i < conversionLines.length; i++) {
          const { workOrderItem, convertQuantity, line, itemIndex } =
            conversionLines[i];
          const itemPath = `body.items.${itemIndex}`;
          const itemInput = await this.resolveConversionItemInput(
            tx,
            enterpriseId,
            workOrderItem,
            convertQuantity,
            itemPath,
            line,
          );

          // Estoque ja baixado na OS; apenas valida estrutura (sem saldo).
          await validateSaleItemStock(enterpriseId, itemInput, itemPath);

          const actor = await this.resolveItemActor(
            auth,
            enterpriseId,
            generatedSale,
          );

          await this.assertItemLineDiscountWithinMemberLimitForSeller(
            tx,
            enterpriseId,
            actor.sellerId,
            {
              quantity: itemInput.quantity,
              valueUnit: itemInput.valueUnit,
              valueDiscount: itemInput.valueDiscount,
            },
            `${itemPath}.valueDiscount`,
          );

          const priceSnapshot = this.priceSnapshotFromBudgetItem(workOrderItem);

          const [inserted] = await tx
            .insert(salesItems)
            .values({
              ...this.mapItemInputToInsert(
                generatedSale.id,
                itemInput,
                actor,
                this.resolveItemLaunchOrigin(itemInput.origin, gescomClient),
                priceSnapshot,
              ),
              sourceBudgetItemId: workOrderItem.sourceBudgetItemId,
              sourceWorkOrderItemId: workOrderItem.id,
              quantityConverted: formatQuantity(convertQuantity),
            })
            .returning();
          if (!inserted) {
            throw new Error("Falha ao incluir item na venda gerada da OS");
          }

          const nextConverted =
            decNum(workOrderItem.quantityConverted) + convertQuantity;
          const [updatedOsItem] = await tx
            .update(salesItems)
            .set({
              quantityConverted: formatQuantity(nextConverted),
              updatedAt: new Date(),
            })
            .where(eq(salesItems.id, workOrderItem.id))
            .returning({ id: salesItems.id });
          if (!updatedOsItem) {
            throw new Error(
              `Falha ao atualizar quantityConverted do item ${workOrderItem.id}`,
            );
          }

          workOrderItem.quantityConverted = formatQuantity(nextConverted);

          conversionItemRows.push({
            saleItemId: inserted.id,
            quantity: formatQuantity(convertQuantity),
          });
        }

        const totals = await this.recalculateSaleTotalsFromItems(
          tx,
          enterpriseId,
          generatedSale.id,
          generatedSale,
        );
        await this.assertSaleDiscountWithinMemberLimitForSeller(
          tx,
          enterpriseId,
          seller.sellerId,
          totals,
        );

        if (status === "FINALIZADA" && input.payments?.length) {
          const updatedSale = await this.getSaleRow(
            tx,
            enterpriseId,
            generatedSale.id,
          );
          if (!updatedSale) throw new Error("Falha ao recalcular venda gerada");
          await this.applyValueLiquidItemsHeader(tx, generatedSale.id);
          this.assertSalePaymentsMatchSale(
            updatedSale.valueLiquid,
            updatedSale.createdAt,
            input.payments,
          );
          await this.handleCreditSaleMemberStatusOnFinalize(
            tx,
            enterpriseId,
            memberId,
            input.payments,
          );
          await this.insertSalePayments(tx, generatedSale.id, input.payments);
          await this.recalculateSaleItemsCommission(
            tx,
            generatedSale.id,
            seller.sellerId,
            enterpriseId,
            input.payments,
          );
        }

        const updatedOsItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, workOrderSaleId));

        const computedOsStatus = this.computeBudgetStatus(updatedOsItems);

        await tx
          .update(sales)
          .set({
            status: computedOsStatus,
            completedionDate:
              computedOsStatus === "FINALIZADA" ? new Date() : null,
            userClosedServiceId:
              computedOsStatus === "FINALIZADA" ? operator.userId : null,
            updatedAt: new Date(),
          })
          .where(eq(sales.id, workOrderSaleId));

        const closureKind: SaleConversionClosureKind =
          computedOsStatus === "FINALIZADA" ? "TOTAL" : "PARCIAL";

        await this.insertSaleConversionAudit(tx, {
          enterprisesId: enterpriseId,
          typeConversion: "ORDEM_SERVICO-VENDA",
          workOrderSaleId,
          generatedSaleId: generatedSale.id,
          closureKind,
          userId: operator.userId,
          userLegalName: operator.userLegalName,
          items: conversionItemRows,
          unclosedItems: unclosedRows.map((row) => ({
            saleItemId: row.workOrderItemId,
            quantityNotConverted: row.quantityNotConverted,
            justification: row.justification,
          })),
        });

        return generatedSale.id;
      });

      const generatedRow = await this.getSaleRow(
        db,
        enterpriseId,
        generatedSaleId,
      );
      await recordCreateAudit({
        entityType: EntityTypes.SALES,
        entityId: generatedSaleId,
        after: toAuditRecord(generatedRow),
        ctx: { ...audit, enterpriseId },
      });
      const workOrderAfter = await this.getSaleRow(
        db,
        enterpriseId,
        workOrderSaleId,
      );
      await recordEntityAudit({
        entityType: EntityTypes.SALES,
        entityId: workOrderSaleId,
        action: "UPDATE",
        before: toAuditRecord(workOrderBefore),
        after: toAuditRecord(workOrderAfter),
        ctx: { ...audit, enterpriseId },
      });

      return this.getById(enterpriseId, generatedSaleId);
    } catch (err) {
      const conflict = mapSaleUniqueViolation(err);
      if (conflict) throw conflict;
      throw err;
    }
  }

  public async estornoOsToOpen(
    enterpriseId: string,
    workOrderSaleId: string,
    audit: EntityAuditContext,
  ) {
    await this.assertTrabalhaOsEnabled(enterpriseId);

    try {
      let workOrderBefore!: typeof sales.$inferSelect;
      const cancelledBefores: (typeof sales.$inferSelect)[] = [];

      await db.transaction(async (tx) => {
        workOrderBefore = await this.getSaleRow(
          tx,
          enterpriseId,
          workOrderSaleId,
        );

        const generatedSales = await tx
          .select()
          .from(sales)
          .where(
            and(
              eq(sales.enterprisesId, enterpriseId),
              eq(sales.sourceWorkOrderSaleId, workOrderSaleId),
            ),
          );

        assertOsEligibleForEstorno(workOrderBefore, generatedSales);

        const now = new Date();
        const generatedCancel = buildGeneratedSaleCancelUpdate();
        const generatedUnlink = buildGeneratedSaleUnlinkUpdate();
        const generatedIds = generatedSales.map((generated) => generated.id);

        for (const generated of generatedSales) {
          cancelledBefores.push(generated);
          await tx
            .update(sales)
            .set({
              ...(generated.status === "CANCELADA"
                ? generatedUnlink
                : generatedCancel),
              updatedAt: now,
            })
            .where(
              and(
                eq(sales.enterprisesId, enterpriseId),
                eq(sales.id, generated.id),
              ),
            );
        }

        await tx
          .update(salesItems)
          .set({
            ...buildGeneratedSaleItemUnlinkUpdate(),
            updatedAt: now,
          })
          .where(inArray(salesItems.salesId, generatedIds));

        await tx
          .update(salesItems)
          .set({
            ...buildOsEstornoItemUpdate(),
            updatedAt: now,
          })
          .where(eq(salesItems.salesId, workOrderSaleId));

        await tx
          .update(sales)
          .set({
            ...buildOsEstornoWorkOrderUpdate(),
            updatedAt: now,
          })
          .where(this.scope(enterpriseId, workOrderSaleId));
      });

      for (const before of cancelledBefores) {
        await this.recordSaleUpdateAudit(
          enterpriseId,
          before.id,
          before,
          audit,
        );
      }
      await this.recordSaleUpdateAudit(
        enterpriseId,
        workOrderSaleId,
        workOrderBefore,
        audit,
      );

      return this.getById(enterpriseId, workOrderSaleId);
    } catch (err) {
      const conflict = mapSaleUniqueViolation(err);
      if (conflict) throw conflict;
      throw err;
    }
  }
}
