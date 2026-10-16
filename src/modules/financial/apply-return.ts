import { and, eq } from "drizzle-orm";
import {
  financialInstallments,
  financialTitleOrigins,
  financialTitles,
  memberCredits,
  salesItems,
} from "../../db/schema.js";
import { BadRequestError, ValidationError } from "../../shared/errors/app-error.js";
import { ensureReceivableFromSale } from "./from-sale.js";
import { fromCents, todayDateOnly, toCents } from "./money.js";
import {
  nextTitleNumber,
  reduceOpenBalance,
  type DbTx,
} from "./ledger.js";

export type ReturnResolution = "CREDITO" | "DEVOLUCAO_DINHEIRO";

const lineCents = (
  item: { quantity: string; valueLiquidItemsHeader: string | null; valueTotal: string },
  quantity: number,
): number => {
  const qty = Number(item.quantity);
  if (!qty) return 0;
  const header = toCents(item.valueLiquidItemsHeader);
  const base = header > 0 ? header : toCents(item.valueTotal);
  return Math.round((base * quantity) / qty);
};

/** Abate a devolução no título vivo. Pedido sem título ganha um antes do abatimento. */
export const applySaleReturnToReceivable = async (
  tx: DbTx,
  args: {
    enterpriseId: string;
    saleId: string;
    userId: string;
    returnOrder: number;
    lines: Array<{ saleItemId: string; quantity: number }>;
    resolution?: ReturnResolution;
  },
): Promise<void> => {
  if (args.lines.length === 0) return;

  await ensureReceivableFromSale(tx, {
    enterpriseId: args.enterpriseId,
    saleId: args.saleId,
  });

  const origin = (
    await tx
      .select()
      .from(financialTitleOrigins)
      .where(
        and(
          eq(financialTitleOrigins.salesId, args.saleId),
          eq(financialTitleOrigins.live, true),
        ),
      )
      .limit(1)
  )[0];
  if (!origin) return;

  const title = (
    await tx
      .select()
      .from(financialTitles)
      .where(
        and(
          eq(financialTitles.id, origin.titleId),
          eq(financialTitles.enterpriseId, args.enterpriseId),
        ),
      )
      .limit(1)
  )[0];
  if (!title || title.status === "CANCELADO" || title.status === "CONSOLIDADO") return;

  let amount = 0;
  for (const line of args.lines) {
    const item = (
      await tx
        .select({
          quantity: salesItems.quantity,
          valueLiquidItemsHeader: salesItems.valueLiquidItemsHeader,
          valueTotal: salesItems.valueTotal,
        })
        .from(salesItems)
        .where(eq(salesItems.id, line.saleItemId))
        .limit(1)
    )[0];
    if (!item) continue;
    amount += lineCents(item, line.quantity);
  }
  const remaining =
    toCents(origin.contributedAmount) - toCents(origin.returnedAmount);
  if (amount > remaining + 1) {
    throw new BadRequestError(
      "Devolucao maior que o saldo deste pedido no titulo",
      "RETURN_EXCEEDS_ORIGIN",
    );
  }
  amount = Math.min(amount, Math.max(remaining, 0));
  if (amount <= 0) return;

  const abated = await reduceOpenBalance(tx, {
    enterpriseId: args.enterpriseId,
    titleId: title.id,
    amountCents: amount,
    order: "furthest",
    kind: "ABATIMENTO_DEVOLUCAO",
    settledAt: todayDateOnly(),
    userId: args.userId,
    salesId: args.saleId,
    returnOrder: args.returnOrder,
    note: "Abatimento de devolucao",
  });
  const excess = amount - abated;
  if (excess > 0 && !args.resolution) {
    throw new ValidationError(
      [
        {
          path: "body.financialResolution",
          message: "Valor ja recebido. Escolha CREDITO ou DEVOLUCAO_DINHEIRO",
        },
      ],
      "Resolucao financeira obrigatoria",
    );
  }

  await tx
    .update(financialTitleOrigins)
    .set({ returnedAmount: fromCents(toCents(origin.returnedAmount) + amount) })
    .where(eq(financialTitleOrigins.id, origin.id));

  if (excess <= 0 || !args.resolution) return;

  if (args.resolution === "CREDITO") {
    await tx.insert(memberCredits).values({
      enterpriseId: args.enterpriseId,
      memberId: title.memberId,
      origin: "DEVOLUCAO",
      status: "ABERTO",
      originalAmount: fromCents(excess),
      openAmount: fromCents(excess),
      salesId: args.saleId,
      returnOrder: args.returnOrder,
      description: "Credito de devolucao",
    });
    return;
  }

  const number = await nextTitleNumber(tx, args.enterpriseId, "PAGAR");
  const [payable] = await tx
    .insert(financialTitles)
    .values({
      enterpriseId: args.enterpriseId,
      direction: "PAGAR",
      source: "DEVOLUCAO",
      kind: "AVULSO",
      status: "ABERTO",
      number,
      memberId: title.memberId,
      issueDate: todayDateOnly(),
      description: "Devolucao de dinheiro ao cliente",
      originalAmount: fromCents(excess),
      openAmount: fromCents(excess),
    })
    .returning();
  if (!payable) throw new Error("Falha ao criar titulo de devolucao");
  await tx.insert(financialInstallments).values({
    titleId: payable.id,
    number: 1,
    dueDate: todayDateOnly(),
    originalAmount: fromCents(excess),
    openAmount: fromCents(excess),
    status: "ABERTA",
    scheduleSource: "PEDIDO",
  });
};
