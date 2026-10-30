import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  enterprisesMembers,
  financialInstallments,
  financialTitles,
  usersFinancialInfo,
} from "../../db/schema.js";
import { NotFoundError } from "../../shared/errors/app-error.js";
import {
  buildMemberCreditCheck,
  monthEndDateOnly,
  monthStartDateOnly,
  rejectIfCreditExceeded,
  type MemberCreditCheck,
  type MemberCreditType,
} from "./member-credit-check.js";
import type { DbTx } from "./ledger.js";
import { todayDateOnly, toCents } from "./money.js";

type CreditReader = DbTx | typeof db;

const OPEN_TITLE_STATUSES = ["ABERTO", "PARCIAL"] as const;
const OPEN_INSTALLMENT_STATUSES = ["ABERTA", "PARCIAL"] as const;

const readCents = (value: unknown): number =>
  toCents(typeof value === "string" || typeof value === "number" ? value : null);

/** Todo o saldo em aberto do cliente, em qualquer vencimento. */
const sumGeneralOpenReceivables = async (
  tx: CreditReader,
  enterpriseId: string,
  memberId: string,
): Promise<number> => {
  const [row] = await tx
    .select({
      total: sql<string>`coalesce(sum(${financialTitles.openAmount}), 0)`,
    })
    .from(financialTitles)
    .where(
      and(
        eq(financialTitles.enterpriseId, enterpriseId),
        eq(financialTitles.memberId, memberId),
        eq(financialTitles.direction, "RECEBER"),
        inArray(financialTitles.status, [...OPEN_TITLE_STATUSES]),
      ),
    );
  return readCents(row?.total);
};

/** Parcelas em aberto com vencimento no mês da venda. Vencido de outro mês não entra. */
const sumMonthlyOpenReceivables = async (
  tx: CreditReader,
  enterpriseId: string,
  memberId: string,
  saleDate: string,
): Promise<number> => {
  const [row] = await tx
    .select({
      total: sql<string>`coalesce(sum(${financialInstallments.openAmount}), 0)`,
    })
    .from(financialInstallments)
    .innerJoin(
      financialTitles,
      eq(financialInstallments.titleId, financialTitles.id),
    )
    .where(
      and(
        eq(financialTitles.enterpriseId, enterpriseId),
        eq(financialTitles.memberId, memberId),
        eq(financialTitles.direction, "RECEBER"),
        inArray(financialTitles.status, [...OPEN_TITLE_STATUSES]),
        inArray(financialInstallments.status, [...OPEN_INSTALLMENT_STATUSES]),
        gte(financialInstallments.dueDate, monthStartDateOnly(saleDate)),
        lte(financialInstallments.dueDate, monthEndDateOnly(saleDate)),
      ),
    );
  return readCents(row?.total);
};

export const loadMemberCreditCheck = async (
  tx: CreditReader,
  args: {
    enterpriseId: string;
    memberId: string;
    saleTotal: string | number | null | undefined;
    /** Dia da venda (`YYYY-MM-DD`). O crédito mensal usa o mês desta data. */
    saleDate?: string;
  },
): Promise<MemberCreditCheck> => {
  const member = (
    await tx
      .select({ userId: enterprisesMembers.userId })
      .from(enterprisesMembers)
      .where(
        and(
          eq(enterprisesMembers.id, args.memberId),
          eq(enterprisesMembers.enterpriseId, args.enterpriseId),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .limit(1)
  )[0];
  if (!member) {
    throw new NotFoundError(
      "Membro cliente nao encontrado na empresa",
      "SALE_CLIENT_MEMBER_NOT_FOUND",
    );
  }

  const info = (
    await tx
      .select({
        creditType: usersFinancialInfo.creditType,
        creditLimit: usersFinancialInfo.creditLimit,
      })
      .from(usersFinancialInfo)
      .where(
        and(
          eq(usersFinancialInfo.userId, member.userId),
          isNull(usersFinancialInfo.deletedAt),
        ),
      )
      .limit(1)
  )[0];

  const limitCents = toCents(info?.creditLimit);
  if (!info || limitCents <= 0) return { applies: false };

  const creditType: MemberCreditType =
    info.creditType === "MENSAL" ? "MENSAL" : "GERAL";
  const saleDate = args.saleDate ?? todayDateOnly();
  const debtorBalanceCents =
    creditType === "MENSAL"
      ? await sumMonthlyOpenReceivables(
          tx,
          args.enterpriseId,
          args.memberId,
          saleDate,
        )
      : await sumGeneralOpenReceivables(tx, args.enterpriseId, args.memberId);

  return buildMemberCreditCheck({
    creditLimit: info.creditLimit,
    creditType,
    debtorBalanceCents,
    saleTotal: args.saleTotal,
  });
};

export const assertSaleWithinMemberCredit = async (
  tx: CreditReader,
  args: {
    enterpriseId: string;
    memberId: string;
    saleTotal: string | number | null | undefined;
    saleDate?: string;
  },
): Promise<MemberCreditCheck> => {
  const check = await loadMemberCreditCheck(tx, args);
  rejectIfCreditExceeded(check);
  return check;
};
