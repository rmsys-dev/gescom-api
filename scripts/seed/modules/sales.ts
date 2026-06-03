import { and, eq } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import {
  paymentTypes,
  prices,
  sales,
  salesBudgetConversions,
  salesDues,
  salesItems,
  salesPayments,
  salesReturnItems,
  salesReturns,
  users,
} from "../../../src/db/schema.js";
import { computeItemValueTotal } from "../../../src/modules/sales/schema.js";
import { syncEnterpriseSequenceFloor } from "../../../src/shared/sequences/enterprise-sequence.js";
import { SEED_VOLUMES } from "../lib/constants.js";
import { resolveBootstrapContext } from "../lib/context.js";
import { listMemberIdsForEnterprise } from "./members.js";
import type { ProductCatalogRefs } from "./product-catalog.js";
import { resolveStockLocationForProduct } from "./stock.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retorna um inteiro aleatório entre min e max (inclusive). */
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Retorna um elemento aleatório de um array. */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * Gera uma data retroativa a partir de hoje subtraindo `daysBack` dias.
 * O horário é randomizado para simular horários reais de operação.
 */
function daysAgo(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(randInt(7, 19), randInt(0, 59), randInt(0, 59), 0);
  return d;
}

/**
 * Distribui `total` documentos ao longo de 13 meses de forma decrescente
 * (meses mais recentes têm mais vendas, simulando crescimento de negócio).
 * Retorna um array com a quantidade por mês (índice 0 = mês mais antigo).
 */
function buildMonthlyDistribution(total: number, months: number): number[] {
  // Pesos crescentes: mês mais recente tem peso maior
  const weights = Array.from({ length: months }, (_, i) => i + 1);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const dist = weights.map((w) => Math.round((w / totalWeight) * total));
  // Ajusta arredondamento
  const diff = total - dist.reduce((s, v) => s + v, 0);
  dist[dist.length - 1]! += diff;
  return dist;
}

// ---------------------------------------------------------------------------
// Tipos de pagamento
// ---------------------------------------------------------------------------

const PAYMENT_TYPE_SEEDS = [
  "Dinheiro",
  "Cartao Credito",
  "Cartao Debito",
  "PIX",
  "Boleto",
] as const;

/** Pesos de uso de cada forma de pagamento (reflete mercado BR). */
const PAYMENT_TYPE_WEIGHTS: Record<string, number> = {
  PIX: 40,
  "Cartao Credito": 25,
  "Cartao Debito": 15,
  Dinheiro: 12,
  Boleto: 8,
};

async function ensurePaymentTypes(): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  for (const description of PAYMENT_TYPE_SEEDS) {
    const existing = (
      await db
        .select({ id: paymentTypes.id })
        .from(paymentTypes)
        .where(
          and(
            eq(paymentTypes.description, description),
            eq(paymentTypes.status, "ATIVO"),
          ),
        )
        .limit(1)
    )[0];

    if (existing) {
      map.set(description, existing.id);
      continue;
    }

    const [row] = await db
      .insert(paymentTypes)
      .values({ description, status: "ATIVO" })
      .returning();
    map.set(description, row!.id);
    console.log(`  Tipo pagamento criado: ${description}`);
  }

  return map;
}

/**
 * Seleciona um tipo de pagamento de acordo com os pesos definidos.
 */
function weightedPaymentType(paymentTypeMap: Map<string, string>): string {
  const entries = [...paymentTypeMap.entries()];
  const totalWeight = entries.reduce(
    (s, [name]) => s + (PAYMENT_TYPE_WEIGHTS[name] ?? 5),
    0,
  );
  let rand = Math.random() * totalWeight;
  for (const [name, id] of entries) {
    rand -= PAYMENT_TYPE_WEIGHTS[name] ?? 5;
    if (rand <= 0) return id;
  }
  return entries[0]![1];
}

// ---------------------------------------------------------------------------
// Seed principal
// ---------------------------------------------------------------------------

export async function seedSales(catalog: ProductCatalogRefs): Promise<void> {
  const ctx = await resolveBootstrapContext();
  const total = SEED_VOLUMES.sales;
  console.log(`Seed vendas (${String(total)} documentos)...`);

  const paymentTypeMap = await ensurePaymentTypes();
  const members = await listMemberIdsForEnterprise(ctx.enterpriseId);

  if (members.length === 0) {
    throw new Error("Nenhum membro disponivel para registrar vendas seed.");
  }

  // Vendedores: todos os membros não-CLIENTE (em produção seriam COLABORADOR/GERENTE).
  // Para seed usamos até 5 membros distintos como vendedores para variar bySeller.
  const sellerPool = members.slice(0, Math.min(5, members.length));
  // Clientes: membros restantes (ou todos se poucos)
  const customerPool = members.slice(Math.min(3, members.length - 1));

  // ---------------------------------------------------------------------------
  // Distribuição de datas: 13 meses retroativos
  // ---------------------------------------------------------------------------
  const MONTHS = 13;
  const monthlyDist = buildMonthlyDistribution(total, MONTHS);

  /**
   * Gera uma data dentro do mês relativo a `monthsAgo` meses atrás.
   * monthsAgo=0 → mês atual; monthsAgo=12 → 12 meses atrás.
   */
  function dateInMonth(monthsAgo: number): Date {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based

    const targetMonth = month - monthsAgo;
    const d = new Date(year, targetMonth, 1);
    const daysInMonth = new Date(year, targetMonth + 1, 0).getDate();
    // Para o mês atual, limite até hoje
    const maxDay =
      monthsAgo === 0 ? Math.min(now.getDate(), daysInMonth) : daysInMonth;
    d.setDate(randInt(1, maxDay));
    d.setHours(randInt(7, 19), randInt(0, 59), randInt(0, 59), 0);
    return d;
  }

  // ---------------------------------------------------------------------------
  // Pré-busca de preços para evitar N+1 no loop
  // ---------------------------------------------------------------------------
  const priceCache = new Map<string, number>();
  for (const peId of catalog.productsEnterprisesIds) {
    const row = (
      await db
        .select({ price: prices.price })
        .from(prices)
        .where(eq(prices.productsEnterprisesId, peId))
        .limit(1)
    )[0];
    priceCache.set(peId, Number(row?.price ?? "10"));
  }

  // ---------------------------------------------------------------------------
  // Geração dos documentos
  // ---------------------------------------------------------------------------
  let orderNumber = 0;
  let returnNumber = 0;
  let budgetConversionCount = 0;

  // IDs de vendas FINALIZADAS para eventuais devoluções e conversões
  const finalizedSaleIds: Array<{
    saleId: string;
    itemId: string;
    valueUnit: number;
    quantity: number;
  }> = [];
  // IDs de orçamentos FECHADOS candidatos a conversão
  const closedBudgetIds: Array<{ budgetSaleId: string; memberId: string }> = [];

  for (let monthIdx = 0; monthIdx < MONTHS; monthIdx++) {
    const monthsAgo = MONTHS - 1 - monthIdx; // 12 → 0
    const countForMonth = monthlyDist[monthIdx] ?? 0;

    for (let j = 0; j < countForMonth; j++) {
      orderNumber++;

      // Verifica se já existe (idempotência)
      const existingSale = (
        await db
          .select({ id: sales.id })
          .from(sales)
          .where(
            and(
              eq(sales.enterprisesId, ctx.enterpriseId),
              eq(sales.orderNumber, orderNumber),
            ),
          )
          .limit(1)
      )[0];

      if (existingSale) {
        continue;
      }

      // -----------------------------------------------------------------------
      // Perfil do documento
      // -----------------------------------------------------------------------
      const saleDate = dateInMonth(monthsAgo);

      // Probabilidades: 65% VENDA, 20% ORCAMENTO, 5% cancelada (dentro de VENDA), 10% VENDA ABERTA
      const typeRoll = Math.random();
      const type: "VENDA" | "ORCAMENTO" = typeRoll < 0.8 ? "VENDA" : "ORCAMENTO";

      let status: "ABERTA" | "FINALIZADA" | "CANCELADA";
      let budgetSituation: "ABERTO" | "PARCIAL" | "FECHADO" = "ABERTO";
      let completedDate: Date | null = null;

      if (type === "VENDA") {
        const statusRoll = Math.random();
        if (statusRoll < 0.72) {
          status = "FINALIZADA";
          completedDate = saleDate; // mesma data de criação
        } else if (statusRoll < 0.85) {
          status = "ABERTA";
        } else {
          status = "CANCELADA";
        }
      } else {
        // ORCAMENTO
        const situRoll = Math.random();
        if (situRoll < 0.45) {
          budgetSituation = "ABERTO";
          status = "ABERTA";
        } else if (situRoll < 0.65) {
          budgetSituation = "PARCIAL";
          status = "ABERTA";
        } else {
          budgetSituation = "FECHADO";
          status = "ABERTA";
        }
      }

      // -----------------------------------------------------------------------
      // Itens da venda (1-4 produtos distintos)
      // -----------------------------------------------------------------------
      const numItems = randInt(1, Math.min(4, catalog.productsEnterprisesIds.length));
      const selectedPeIds = new Set<string>();
      while (selectedPeIds.size < numItems) {
        selectedPeIds.add(pick(catalog.productsEnterprisesIds));
      }

      let subTotal = 0;
      let totalDiscountItems = 0;

      type ItemDraft = {
        peId: string;
        quantity: number;
        valueUnit: number;
        valueDiscount: number;
        valueTotal: number;
      };

      const itemDrafts: ItemDraft[] = [];

      for (const peId of selectedPeIds) {
        const valueUnit = priceCache.get(peId) ?? 10;
        const quantity = randInt(1, 6);
        // Desconto: 30% dos itens têm desconto de R$1-10
        const valueDiscount = Math.random() < 0.3 ? randInt(1, 10) : 0;
        const valueTotal = computeItemValueTotal(quantity, valueUnit, valueDiscount, 0);

        subTotal += quantity * valueUnit;
        totalDiscountItems += valueDiscount;
        itemDrafts.push({ peId, quantity, valueUnit, valueDiscount, valueTotal });
      }

      // Desconto financeiro adicional (10% das vendas > R$100)
      const valueDiscountFinancial =
        subTotal > 100 && Math.random() < 0.1 ? randInt(5, 20) : 0;

      const valueLiquid = Math.max(
        0,
        subTotal - totalDiscountItems - valueDiscountFinancial,
      );

      // -----------------------------------------------------------------------
      // Vendedor e cliente
      // -----------------------------------------------------------------------
      const sellerMember = pick(sellerPool);
      const clientMember = pick(customerPool);
      const clientUser = (
        await db
          .select({ userName: users.userName })
          .from(users)
          .where(eq(users.id, clientMember.userId))
          .limit(1)
      )[0];

      // -----------------------------------------------------------------------
      // Inserção na transação
      // -----------------------------------------------------------------------
      const insertedItem = await db.transaction(async (tx) => {
        const [sale] = await tx
          .insert(sales)
          .values({
            orderNumber,
            userId: clientMember.userId,
            userLegalName: clientUser?.userName ?? clientMember.userName,
            memberId: sellerMember.memberId,
            type,
            subTotal: subTotal.toFixed(2),
            discountValuetems: totalDiscountItems > 0
              ? totalDiscountItems.toFixed(2)
              : null,
            valueDiscountFinancial: valueDiscountFinancial > 0
              ? valueDiscountFinancial.toFixed(2)
              : null,
            valueLiquid: valueLiquid.toFixed(2),
            valuePie: type === "VENDA" && status === "FINALIZADA"
              ? valueLiquid.toFixed(2)
              : "0",
            valueService: "0",
            status,
            returnSituation: "SEM_DEVOLUCAO",
            budgetClosureSituation: type === "ORCAMENTO" ? budgetSituation : "FECHADO",
            completedionDate: completedDate,
            enterprisesId: ctx.enterpriseId,
            createdAt: saleDate,
          })
          .returning();

        const saleId = sale!.id;
        let firstItemId: string | null = null;
        let firstValueUnit = 0;
        let firstQuantity = 0;

        for (const draft of itemDrafts) {
          const stockRef =
            type === "VENDA" ? await resolveStockLocationForProduct(draft.peId) : null;

          const [item] = await tx
            .insert(salesItems)
            .values({
              quantity: draft.quantity.toFixed(4),
              valueUnit: draft.valueUnit.toFixed(4),
              valueDiscount: draft.valueDiscount.toFixed(4),
              valueAcresce: "0.0000",
              valueTotal: draft.valueTotal.toFixed(4),
              salesId: saleId,
              productsEnterprisesId: draft.peId,
              unitid: catalog.measurementUnitId,
              productTypeId: catalog.productTypeId,
              stockSectorId: stockRef?.stockSectorId ?? null,
              stockLocationId: stockRef?.stockLocationId ?? null,
              stockBatchId: stockRef?.stockBatchId ?? null,
            })
            .returning();

          if (!firstItemId) {
            firstItemId = item!.id;
            firstValueUnit = draft.valueUnit;
            firstQuantity = draft.quantity;
          }
        }

        // -------------------------------------------------------------------
        // Pagamentos e parcelas (só para VENDA FINALIZADA)
        // -------------------------------------------------------------------
        if (type === "VENDA" && status === "FINALIZADA") {
          const paymentTypeId = weightedPaymentType(paymentTypeMap);

          const [payment] = await tx
            .insert(salesPayments)
            .values({
              valueTotal: valueLiquid.toFixed(2),
              paymentTypeId,
              salesId: saleId,
            })
            .returning();

          // Parcelamento: 1-3 parcelas mensais a partir da data da venda.
          // O vencimento é calculado a partir da data da venda, garantindo
          // diversidade de aging (vendas antigas → parcelas vencidas; recentes → a vencer).
          const installments = randInt(1, 3);
          const installmentValue = valueLiquid / installments;

          for (let p = 0; p < installments; p++) {
            const dueDate = new Date(saleDate);
            // Cada parcela vence 30 dias após a anterior (a partir de 30 dias da venda)
            dueDate.setDate(dueDate.getDate() + 30 * (p + 1));

            await tx.insert(salesDues).values({
              valueInstallment: installmentValue.toFixed(2),
              dueDate,
              salesPaymentId: payment!.id,
              salesId: saleId,
            });
          }
        }

        return { saleId, firstItemId, firstValueUnit, firstQuantity };
      });

      // -----------------------------------------------------------------------
      // Coleta de IDs para devoluções e conversões (feito fora da tx principal)
      // -----------------------------------------------------------------------
      if (
        type === "VENDA" &&
        status === "FINALIZADA" &&
        insertedItem.firstItemId
      ) {
        finalizedSaleIds.push({
          saleId: insertedItem.saleId,
          itemId: insertedItem.firstItemId,
          valueUnit: insertedItem.firstValueUnit,
          quantity: insertedItem.firstQuantity,
        });
      }

      if (type === "ORCAMENTO" && budgetSituation === "FECHADO") {
        closedBudgetIds.push({
          budgetSaleId: insertedItem.saleId,
          memberId: sellerMember.memberId,
        });
      }

      if (orderNumber % 50 === 0) {
        console.log(`  Vendas seed: ${String(orderNumber)}/${String(total)}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Devoluções (salesReturns + salesReturnItems)
  // Gera devoluções para ~8% das vendas finalizadas (máx. 20)
  // ---------------------------------------------------------------------------
  const returnCandidates = finalizedSaleIds
    .filter(() => Math.random() < 0.08)
    .slice(0, 20);

  for (const candidate of returnCandidates) {
    returnNumber++;

    const existingReturn = (
      await db
        .select({ id: salesReturns.id })
        .from(salesReturns)
        .where(
          and(
            eq(salesReturns.enterprisesId, ctx.enterpriseId),
            eq(salesReturns.returnNumber, returnNumber),
          ),
        )
        .limit(1)
    )[0];

    if (existingReturn) continue;

    const returnQty = Math.min(1, candidate.quantity);
    const returnValue = returnQty * candidate.valueUnit;
    const kind: "PARCIAL" | "TOTAL" =
      returnQty < candidate.quantity ? "PARCIAL" : "TOTAL";
    const returnDate = daysAgo(randInt(1, 60));

    await db.transaction(async (tx) => {
      const [ret] = await tx
        .insert(salesReturns)
        .values({
          returnNumber,
          saleId: candidate.saleId,
          enterprisesId: ctx.enterpriseId,
          userId: ctx.adminUserId,
          status: "FINALIZADA",
          kind,
          valueTotal: returnValue.toFixed(2),
          notes: "Devolucao seed",
          createdAt: returnDate,
        })
        .returning();

      await tx.insert(salesReturnItems).values({
        salesReturnId: ret!.id,
        saleItemId: candidate.itemId,
        quantity: returnQty.toFixed(4),
        valueUnit: candidate.valueUnit.toFixed(4),
        valueTotal: returnValue.toFixed(4),
      });

      // Atualiza returnSituation na venda original
      await tx
        .update(sales)
        .set({ returnSituation: kind })
        .where(eq(sales.id, candidate.saleId));
    });
  }

  if (returnCandidates.length > 0) {
    console.log(`  Devolucoes seed: ${String(returnCandidates.length)} criadas.`);
  }

  // ---------------------------------------------------------------------------
  // Conversões de orçamento → venda (salesBudgetConversions)
  // Para ~40% dos orçamentos FECHADOS, gera uma venda correspondente
  // ---------------------------------------------------------------------------
  const conversionCandidates = closedBudgetIds
    .filter(() => Math.random() < 0.4)
    .slice(0, 30);

  for (const candidate of conversionCandidates) {
    orderNumber++;
    budgetConversionCount++;

    const existingSale = (
      await db
        .select({ id: sales.id })
        .from(sales)
        .where(
          and(
            eq(sales.enterprisesId, ctx.enterpriseId),
            eq(sales.orderNumber, orderNumber),
          ),
        )
        .limit(1)
    )[0];

    if (existingSale) continue;

    // Busca dados do orçamento original
    const budgetRow = (
      await db
        .select({
          userId: sales.userId,
          userLegalName: sales.userLegalName,
          valueLiquid: sales.valueLiquid,
          subTotal: sales.subTotal,
          createdAt: sales.createdAt,
        })
        .from(sales)
        .where(eq(sales.id, candidate.budgetSaleId))
        .limit(1)
    )[0];

    if (!budgetRow) continue;

    const convDate = daysAgo(randInt(1, 30));
    const paymentTypeId = weightedPaymentType(paymentTypeMap);
    const valueLiquid = Number(budgetRow.valueLiquid ?? 0);
    const subTotalVal = Number(budgetRow.subTotal ?? valueLiquid);

    const peId = pick(catalog.productsEnterprisesIds);
    const valueUnit = priceCache.get(peId) ?? 10;
    const quantity = randInt(1, 3);
    const valueTotal = computeItemValueTotal(quantity, valueUnit, 0, 0);

    await db.transaction(async (tx) => {
      const [convertedSale] = await tx
        .insert(sales)
        .values({
          orderNumber,
          userId: budgetRow.userId,
          userLegalName: budgetRow.userLegalName,
          memberId: candidate.memberId,
          type: "VENDA",
          subTotal: subTotalVal.toFixed(2),
          valueLiquid: valueLiquid.toFixed(2),
          valuePie: valueLiquid.toFixed(2),
          valueService: "0",
          status: "FINALIZADA",
          returnSituation: "SEM_DEVOLUCAO",
          budgetClosureSituation: "FECHADO",
          sourceBudgetSaleId: candidate.budgetSaleId,
          completedionDate: convDate,
          enterprisesId: ctx.enterpriseId,
          createdAt: convDate,
        })
        .returning();

      const saleId = convertedSale!.id;
      const stockRef = await resolveStockLocationForProduct(peId);

      const [newItem] = await tx
        .insert(salesItems)
        .values({
          quantity: quantity.toFixed(4),
          valueUnit: valueUnit.toFixed(4),
          valueDiscount: "0.0000",
          valueAcresce: "0.0000",
          valueTotal: valueTotal.toFixed(4),
          salesId: saleId,
          productsEnterprisesId: peId,
          unitid: catalog.measurementUnitId,
          productTypeId: catalog.productTypeId,
          stockSectorId: stockRef.stockSectorId,
          stockLocationId: stockRef.stockLocationId,
          stockBatchId: stockRef.stockBatchId ?? null,
        })
        .returning();

      const [payment] = await tx
        .insert(salesPayments)
        .values({
          valueTotal: valueLiquid.toFixed(2),
          paymentTypeId,
          salesId: saleId,
        })
        .returning();

      const dueDate = new Date(convDate);
      dueDate.setDate(dueDate.getDate() + 30);

      await tx.insert(salesDues).values({
        valueInstallment: valueLiquid.toFixed(2),
        dueDate,
        salesPaymentId: payment!.id,
        salesId: saleId,
      });

      // Registra conversão
      const adminUser = (
        await db
          .select({ userName: users.userName })
          .from(users)
          .where(eq(users.id, ctx.adminUserId))
          .limit(1)
      )[0];

      await tx.insert(salesBudgetConversions).values({
        enterprisesId: ctx.enterpriseId,
        budgetSaleId: candidate.budgetSaleId,
        generatedSaleId: saleId,
        closureKind: "TOTAL",
        userId: ctx.adminUserId,
        userLegalName: adminUser?.userName ?? "Admin",
        createdAt: convDate,
      });

      // Marca o orçamento como fechado
      await tx
        .update(sales)
        .set({ budgetClosureSituation: "FECHADO" })
        .where(eq(sales.id, candidate.budgetSaleId));

      // Atualiza quantityConverted no item do orçamento (se existir)
      if (newItem) {
        const budgetItem = (
          await db
            .select({ id: salesItems.id })
            .from(salesItems)
            .where(eq(salesItems.salesId, candidate.budgetSaleId))
            .limit(1)
        )[0];

        if (budgetItem) {
          await tx
            .update(salesItems)
            .set({ quantityConverted: quantity.toFixed(4) })
            .where(eq(salesItems.id, budgetItem.id));
        }
      }
    });
  }

  if (conversionCandidates.length > 0) {
    console.log(
      `  Conversoes orcamento->venda seed: ${String(budgetConversionCount)} criadas.`,
    );
  }

  // ---------------------------------------------------------------------------
  // Sincroniza sequência de pedidos
  // ---------------------------------------------------------------------------
  await db.transaction(async (tx) => {
    await syncEnterpriseSequenceFloor(
      ctx.enterpriseId,
      "PEDIDO_VENDA",
      orderNumber,
      tx,
    );
  });

  console.log(
    `Seed vendas concluido (${String(orderNumber)} documentos, ${String(returnCandidates.length)} devolucoes, ${String(budgetConversionCount)} conversoes).`,
  );
}
