import { and, asc, eq } from "drizzle-orm";
import {
  financialInstallments,
  financialTitleOrigins,
  financialTitles,
  sales,
  salesDues,
} from "../../db/schema.js";
import { AppError, BadRequestError } from "../../shared/errors/app-error.js";
import { asDateOnly, fromCents, todayDateOnly, toCents } from "./money.js";
import { nextTitleNumber, type DbTx } from "./ledger.js";

/** Cria o título a receber quando a venda ou a ordem de serviço finaliza. Idempotente na origem viva. */
export const createReceivableFromSale = async (
  tx: DbTx,
  args: { enterpriseId: string; saleId: string },
): Promise<void> => {
  const sale = (
    await tx
      .select()
      .from(sales)
      .where(and(eq(sales.id, args.saleId), eq(sales.enterprisesId, args.enterpriseId)))
      .limit(1)
  )[0];
  if (!sale || (sale.type !== "VENDA" && sale.type !== "ORDEM DE SERVICO")) return;

  const existing = (
    await tx
      .select({ id: financialTitleOrigins.id })
      .from(financialTitleOrigins)
      .where(
        and(eq(financialTitleOrigins.salesId, sale.id), eq(financialTitleOrigins.live, true)),
      )
      .limit(1)
  )[0];
  if (existing) return;

  const dues = await tx
    .select()
    .from(salesDues)
    .where(eq(salesDues.salesId, sale.id))
    .orderBy(asc(salesDues.dueDate));
  if (dues.length === 0) {
    throw new BadRequestError(
      "Venda finalizada sem parcelas para o contas a receber",
      "SALE_DUES_REQUIRED",
    );
  }

  const total = dues.reduce((sum, due) => sum + toCents(due.valueInstallment), 0);
  const liquid = toCents(sale.valueLiquid);
  if (total !== liquid) {
    throw new BadRequestError(
      "Soma das parcelas difere do valor liquido da venda",
      "SALE_DUES_MISMATCH",
    );
  }

  const number = await nextTitleNumber(tx, args.enterpriseId, "RECEBER");
  const [title] = await tx
    .insert(financialTitles)
    .values({
      enterpriseId: args.enterpriseId,
      direction: "RECEBER",
      source: "VENDA",
      kind: "PEDIDO",
      status: "ABERTO",
      number,
      memberId: sale.memberId,
      issueDate: todayDateOnly(),
      originalAmount: fromCents(total),
      openAmount: fromCents(total),
    })
    .returning();
  if (!title) throw new Error("Falha ao criar titulo da venda");

  await tx.insert(financialInstallments).values(
    dues.map((due, index) => ({
      titleId: title.id,
      number: index + 1,
      dueDate: asDateOnly(due.dueDate),
      originalAmount: due.valueInstallment,
      openAmount: due.valueInstallment,
      status: "ABERTA" as const,
      scheduleSource: "PEDIDO" as const,
    })),
  );
  await tx.insert(financialTitleOrigins).values({
    titleId: title.id,
    salesId: sale.id,
    contributedAmount: fromCents(total),
    returnedAmount: "0.00",
    live: true,
  });
};

/** Garante o título do pedido antes de faturar a nota. Pedido antigo, sem título, entra pelo saldo. */
export const ensureReceivableFromSale = async (
  tx: DbTx,
  args: { enterpriseId: string; saleId: string },
): Promise<void> => {
  try {
    await createReceivableFromSale(tx, args);
  } catch (error) {
    if (!(error instanceof AppError) || error.code !== "SALE_DUES_REQUIRED") throw error;
    await createReceivableFromLiquid(tx, args);
  }
};

const createReceivableFromLiquid = async (
  tx: DbTx,
  args: { enterpriseId: string; saleId: string },
) => {
  const sale = (
    await tx
      .select()
      .from(sales)
      .where(and(eq(sales.id, args.saleId), eq(sales.enterprisesId, args.enterpriseId)))
      .limit(1)
  )[0];
  if (!sale || (sale.type !== "VENDA" && sale.type !== "ORDEM DE SERVICO")) return;

  const existing = (
    await tx
      .select({ id: financialTitleOrigins.id })
      .from(financialTitleOrigins)
      .where(and(eq(financialTitleOrigins.salesId, sale.id), eq(financialTitleOrigins.live, true)))
      .limit(1)
  )[0];
  if (existing) return;

  const total = toCents(sale.valueLiquid);
  if (total <= 0) {
    throw new BadRequestError(
      `Pedido ${sale.orderNumber} sem valor para o contas a receber`,
      "SALE_WITHOUT_RECEIVABLE",
    );
  }
  const amount = fromCents(total);
  const dueDate = todayDateOnly();
  const number = await nextTitleNumber(tx, args.enterpriseId, "RECEBER");
  const [title] = await tx
    .insert(financialTitles)
    .values({
      enterpriseId: args.enterpriseId,
      direction: "RECEBER",
      source: "VENDA",
      kind: "PEDIDO",
      status: "ABERTO",
      number,
      memberId: sale.memberId,
      issueDate: dueDate,
      originalAmount: amount,
      openAmount: amount,
    })
    .returning();
  if (!title) throw new Error("Falha ao criar titulo da venda");
  await tx.insert(financialInstallments).values({
    titleId: title.id,
    number: 1,
    dueDate,
    originalAmount: amount,
    openAmount: amount,
    status: "ABERTA" as const,
    scheduleSource: "PEDIDO" as const,
  });
  await tx.insert(financialTitleOrigins).values({
    titleId: title.id,
    salesId: sale.id,
    contributedAmount: amount,
    returnedAmount: "0.00",
    live: true,
  });
};
