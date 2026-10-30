import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  enterprisesMembers,
  financialInstallments,
  financialSettlements,
  financialTitles,
  paymentTypesMethodsFlags,
} from "../../db/schema.js";
import type { FinancialSettlementKind } from "../../db/enums.js";
import { BadRequestError, NotFoundError } from "../../shared/errors/app-error.js";
import { fromCents, toCents } from "./money.js";

export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type TitleRow = typeof financialTitles.$inferSelect;
type InstallmentRow = typeof financialInstallments.$inferSelect;

export const assertMemberInEnterprise = async (
  tx: DbTx,
  enterpriseId: string,
  memberId: string,
) => {
  const row = (
    await tx
      .select({ id: enterprisesMembers.id })
      .from(enterprisesMembers)
      .where(
        and(
          eq(enterprisesMembers.id, memberId),
          eq(enterprisesMembers.enterpriseId, enterpriseId),
        ),
      )
      .limit(1)
  )[0];
  if (!row) {
    throw new NotFoundError("Membro nao encontrado nesta empresa", "MEMBER_NOT_FOUND");
  }
};

export const nextTitleNumber = async (
  tx: DbTx,
  enterpriseId: string,
  direction: "RECEBER" | "PAGAR",
): Promise<number> => {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${enterpriseId} || ':' || ${direction}, 0))`,
  );
  const rows = await tx
    .select({
      value: sql<number>`coalesce(max(${financialTitles.number}), 0)`,
    })
    .from(financialTitles)
    .where(
      and(
        eq(financialTitles.enterpriseId, enterpriseId),
        eq(financialTitles.direction, direction),
      ),
    );
  return Number(rows[0]?.value ?? 0) + 1;
};

export const refreshTitle = async (tx: DbTx, titleId: string): Promise<TitleRow> => {
  const title = (
    await tx.select().from(financialTitles).where(eq(financialTitles.id, titleId)).limit(1)
  )[0];
  if (!title) throw new NotFoundError("Titulo nao encontrado", "TITLE_NOT_FOUND");
  if (title.status === "CONSOLIDADO" || title.status === "CANCELADO") return title;

  const installments = await tx
    .select()
    .from(financialInstallments)
    .where(eq(financialInstallments.titleId, titleId));

  let open = 0;
  for (const installment of installments) {
    if (installment.status === "CANCELADA") continue;
    const openCents = toCents(installment.openAmount);
    const originalCents = toCents(installment.originalAmount);
    const status =
      openCents <= 0
        ? "QUITADA"
        : openCents < originalCents
          ? "PARCIAL"
          : "ABERTA";
    if (status !== installment.status) {
      await tx
        .update(financialInstallments)
        .set({ status, updatedAt: new Date() })
        .where(eq(financialInstallments.id, installment.id));
    }
    open += openCents;
  }

  const original = toCents(title.originalAmount);
  const status = open <= 0 ? "QUITADO" : open < original ? "PARCIAL" : "ABERTO";
  const [updated] = await tx
    .update(financialTitles)
    .set({
      openAmount: fromCents(open),
      status,
      updatedAt: new Date(),
    })
    .where(eq(financialTitles.id, titleId))
    .returning();
  if (!updated) throw new NotFoundError("Titulo nao encontrado", "TITLE_NOT_FOUND");
  return updated;
};

export const titleHasOpenBaixa = async (tx: DbTx, titleId: string): Promise<boolean> => {
  const rows = await tx
    .select({ id: financialSettlements.id })
    .from(financialSettlements)
    .where(
      and(
        eq(financialSettlements.titleId, titleId),
        eq(financialSettlements.kind, "BAIXA"),
        sql`not exists (
          select 1 from financial_settlements estorno
          where estorno.reverses_settlement_id = ${financialSettlements.id}
            and estorno.kind = 'ESTORNO'
        )`,
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
};

export const titleHasAbatement = async (tx: DbTx, titleId: string): Promise<boolean> => {
  const rows = await tx
    .select({ id: financialSettlements.id })
    .from(financialSettlements)
    .where(
      and(
        eq(financialSettlements.titleId, titleId),
        sql`${financialSettlements.kind} in ('ABATIMENTO_DEVOLUCAO', 'ABATIMENTO_CREDITO')`,
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
};

export const openInstallments = async (
  tx: DbTx,
  titleId: string,
  order: "earliest" | "furthest",
): Promise<InstallmentRow[]> => {
  const rows = await tx
    .select()
    .from(financialInstallments)
    .where(eq(financialInstallments.titleId, titleId))
    .orderBy(
      order === "earliest"
        ? asc(financialInstallments.dueDate)
        : desc(financialInstallments.dueDate),
      order === "earliest"
        ? asc(financialInstallments.number)
        : desc(financialInstallments.number),
    );
  return rows.filter(
    (row) => row.status !== "CANCELADA" && toCents(row.openAmount) > 0,
  );
};

export const reduceOpenBalance = async (
  tx: DbTx,
  args: {
    enterpriseId: string;
    titleId: string;
    amountCents: number;
    order: "earliest" | "furthest";
    kind: Extract<FinancialSettlementKind, "ABATIMENTO_DEVOLUCAO" | "ABATIMENTO_CREDITO">;
    settledAt: string;
    userId?: string | null;
    salesId?: string | null;
    returnOrder?: number | null;
    memberCreditId?: string | null;
    note?: string | null;
  },
): Promise<number> => {
  let left = args.amountCents;
  let applied = 0;
  const installments = await openInstallments(tx, args.titleId, args.order);
  for (const installment of installments) {
    if (left <= 0) break;
    const open = toCents(installment.openAmount);
    const take = Math.min(open, left);
    if (take <= 0) continue;
    await tx
      .update(financialInstallments)
      .set({
        openAmount: fromCents(open - take),
        updatedAt: new Date(),
      })
      .where(eq(financialInstallments.id, installment.id));
    await tx.insert(financialSettlements).values({
      enterpriseId: args.enterpriseId,
      titleId: args.titleId,
      installmentId: installment.id,
      kind: args.kind,
      amount: fromCents(take),
      settledAt: args.settledAt,
      userId: args.userId ?? null,
      salesId: args.salesId ?? null,
      returnOrder: args.returnOrder ?? null,
      memberCreditId: args.memberCreditId ?? null,
      note: args.note ?? null,
    });
    left -= take;
    applied += take;
  }
  await refreshTitle(tx, args.titleId);
  return applied;
};

export const assertPaymentFlag = async (
  tx: DbTx,
  enterpriseId: string,
  flagId: string,
) => {
  const row = (
    await tx
      .select({ id: paymentTypesMethodsFlags.id })
      .from(paymentTypesMethodsFlags)
      .where(
        and(
          eq(paymentTypesMethodsFlags.id, flagId),
          eq(paymentTypesMethodsFlags.enterprisesId, enterpriseId),
          eq(paymentTypesMethodsFlags.status, "ATIVO"),
        ),
      )
      .limit(1)
  )[0];
  if (!row) {
    throw new BadRequestError(
      "Forma de pagamento nao encontrada nesta empresa",
      "PAYMENT_FLAG_NOT_FOUND",
    );
  }
};
