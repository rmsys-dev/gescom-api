import { and, asc, desc, eq, gt, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db/index.js";
import {
  bankCollectionAgreements,
  bankRemittanceItems,
  bankRemittances,
  bankReturnItems,
  bankReturns,
  bankSlipEvents,
  bankSlips,
  enterprisesMembers,
  financialInstallments,
  financialSettlements,
  financialTitleOrigins,
  financialTitles,
  memberCredits,
  nfeDuplicates,
  nfeHeaders,
  nfeSales,
  sales,
  users,
} from "../../db/schema.js";
import type { FinancialScheduleSource } from "../../db/enums.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/app-error.js";
import { ensureReceivableFromSale } from "./from-sale.js";
import { getBankCollectionPort } from "./port.js";
import { fromCents, todayDateOnly, toCents, asDateOnly } from "./money.js";
import {
  assertMemberInEnterprise,
  assertPaymentFlag,
  nextTitleNumber,
  openInstallments,
  reduceOpenBalance,
  refreshTitle,
  titleHasAbatement,
  titleHasOpenBaixa,
  type DbTx,
} from "./ledger.js";
import type {
  ApplyCreditInput,
  BillReceivablesInput,
  CreateAgreementInput,
  CreateTitleInput,
  ImportReturnInput,
  IssueBoletoInput,
  IntegralSettlementInput,
  ListOpenInstallmentsQuery,
  ListTitlesQuery,
  PayableFromNfeInput,
  PlanLine,
  SettlementInput,
  SummaryQuery,
  WebhookInput,
} from "./schema.js";

type InstallmentRow = typeof financialInstallments.$inferSelect;
type AgreementRow = typeof bankCollectionAgreements.$inferSelect;

/** Rateio em centavos. A sobra vai para a parcela de maior saldo. */
const allocateCents = (totalCents: number, weights: number[], caps: number[], preference: number[]) => {
  const shares = new Array<number>(weights.length).fill(0);
  if (totalCents <= 0 || weights.length === 0) return shares;
  const sum = weights.reduce((total, weight) => total + weight, 0);
  if (sum <= 0) return shares;
  let used = 0;
  for (let index = 0; index < weights.length; index += 1) {
    const share = Math.min(caps[index] ?? 0, Math.floor((totalCents * weights[index]!) / sum));
    shares[index] = share;
    used += share;
  }
  let left = totalCents - used;
  while (left > 0) {
    let placed = false;
    for (const index of preference) {
      if ((shares[index] ?? 0) >= (caps[index] ?? 0)) continue;
      shares[index] = (shares[index] ?? 0) + 1;
      left -= 1;
      placed = true;
      if (left <= 0) break;
    }
    if (!placed) {
      throw new BadRequestError("O desconto nao fecha nas parcelas", "SETTLEMENT_ALLOCATION");
    }
  }
  return shares;
};

const receiptDiscountExceeds = (discountCents: number, openCents: number, limitPercent: number) => {
  const basis = Math.round(limitPercent * 100);
  return discountCents * 10000 > openCents * basis;
};

const assertReceiptDiscount = async (
  runner: DbTx | typeof db,
  enterpriseId: string,
  userId: string,
  discountCents: number,
  openCents: number,
) => {
  const memberships = await runner
    .select({
      receiptLimitDiscount: enterprisesMembers.receiptLimitDiscount,
      exceedDiscountSale: enterprisesMembers.exceedDiscountSale,
      userName: users.userName,
    })
    .from(enterprisesMembers)
    .innerJoin(users, eq(users.id, enterprisesMembers.userId))
    .where(
      and(
        eq(enterprisesMembers.enterpriseId, enterpriseId),
        eq(enterprisesMembers.userId, userId),
        eq(enterprisesMembers.status, "ATIVO"),
        isNull(enterprisesMembers.deletedAt),
      ),
    );
  if (memberships.some((row) => row.exceedDiscountSale)) return;
  const limit = memberships.reduce((max, row) => {
    const value = Number(row.receiptLimitDiscount ?? 0);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);
  if (receiptDiscountExceeds(discountCents, openCents, limit)) {
    const name = memberships.find((row) => row.userName?.trim())?.userName?.trim() ?? "";
    throw new BadRequestError(
      name ? `${name} o desconto passa do limite. Procure o financeiro.` : "O desconto passa do limite. Procure o financeiro.",
      "SETTLEMENT_DISCOUNT_LIMIT",
    );
  }
};

const loadTitle = async (
  runner: DbTx | typeof db,
  enterpriseId: string,
  titleId: string,
) => {
  const title = (
    await runner
      .select()
      .from(financialTitles)
      .where(
        and(eq(financialTitles.id, titleId), eq(financialTitles.enterpriseId, enterpriseId)),
      )
      .limit(1)
  )[0];
  if (!title) throw new NotFoundError("Titulo nao encontrado", "TITLE_NOT_FOUND");
  return title;
};

const cancelSlipsOfInstallment = async (tx: DbTx, installmentId: string) => {
  const slips = await tx
    .select()
    .from(bankSlips)
    .where(
      and(eq(bankSlips.installmentId, installmentId), ne(bankSlips.status, "CANCELADO")),
    );
  for (const slip of slips) {
    await tx
      .update(bankSlips)
      .set({ status: "CANCELADO", updatedAt: new Date() })
      .where(eq(bankSlips.id, slip.id));
    await tx.insert(bankSlipEvents).values({
      slipId: slip.id,
      kind: "BAIXA",
      summary: {
        pendingBank: slip.status === "REGISTRADO",
        reason: "Plano substituido",
      },
    });
  }
};

const cancelLiveSchedule = async (tx: DbTx, titleId: string) => {
  const rows = await tx
    .select()
    .from(financialInstallments)
    .where(eq(financialInstallments.titleId, titleId));
  for (const row of rows) {
    if (row.status === "CANCELADA") continue;
    await cancelSlipsOfInstallment(tx, row.id);
    await tx
      .update(financialInstallments)
      .set({ status: "CANCELADA", openAmount: "0.00", updatedAt: new Date() })
      .where(eq(financialInstallments.id, row.id));
  }
};

const insertSchedule = async (
  tx: DbTx,
  titleId: string,
  source: FinancialScheduleSource,
  lines: PlanLine[],
) => {
  const inserted = await tx
    .insert(financialInstallments)
    .values(
      lines.map((line, index) => ({
        titleId,
        number: index + 1,
        dueDate: line.dueDate,
        originalAmount: fromCents(toCents(line.amount)),
        openAmount: fromCents(toCents(line.amount)),
        status: "ABERTA" as const,
        scheduleSource: source,
      })),
    )
    .returning();
  return inserted;
};

const assertPlanMatchesOpen = (lines: PlanLine[], installments: InstallmentRow[]) => {
  if (lines.length !== installments.length) {
    throw new BadRequestError(
      "Com abatimento so e possivel trocar o vencimento das parcelas em aberto",
      "DUE_DATE_ONLY",
    );
  }
  installments.forEach((installment, index) => {
    const line = lines[index];
    if (!line || toCents(line.amount) !== toCents(installment.openAmount)) {
      throw new BadRequestError(
        "Com abatimento o valor das parcelas nao muda",
        "DUE_DATE_ONLY",
      );
    }
  });
};

const assertPlanCloses = (lines: PlanLine[], openCents: number) => {
  const sum = lines.reduce((total, line) => total + toCents(line.amount), 0);
  if (sum !== openCents) {
    throw new BadRequestError(
      "Soma do plano novo difere do saldo em aberto",
      "PLAN_TOTAL_MISMATCH",
    );
  }
};

const updateDueDatesOnly = async (
  tx: DbTx,
  installments: InstallmentRow[],
  lines: PlanLine[],
) => {
  for (let index = 0; index < installments.length; index += 1) {
    const installment = installments[index]!;
    const line = lines[index]!;
    await tx
      .update(financialInstallments)
      .set({ dueDate: line.dueDate, updatedAt: new Date() })
      .where(eq(financialInstallments.id, installment.id));
    const slips = await tx
      .select()
      .from(bankSlips)
      .where(
        and(eq(bankSlips.installmentId, installment.id), ne(bankSlips.status, "CANCELADO")),
      );
    for (const slip of slips) {
      await tx
        .update(bankSlips)
        .set({ dueDate: line.dueDate, updatedAt: new Date() })
        .where(eq(bankSlips.id, slip.id));
      await tx.insert(bankSlipEvents).values({
        slipId: slip.id,
        kind: "ALTERACAO_VENCIMENTO",
        summary: { dueDate: line.dueDate, pendingBank: slip.status === "REGISTRADO" },
      });
    }
  }
};

const ensureMissingSlips = async (
  tx: DbTx,
  enterpriseId: string,
  agreement: AgreementRow,
  titleNumber: number,
  installments: InstallmentRow[],
) => {
  const missing: InstallmentRow[] = [];
  for (const installment of installments) {
    const existing = (
      await tx
        .select({ id: bankSlips.id })
        .from(bankSlips)
        .where(
          and(eq(bankSlips.installmentId, installment.id), ne(bankSlips.status, "CANCELADO")),
        )
        .limit(1)
    )[0];
    if (!existing) missing.push(installment);
  }
  if (missing.length > 0) {
    await issueSlips(tx, enterpriseId, agreement, titleNumber, missing);
  }
};

const loadAgreement = async (
  runner: DbTx | typeof db,
  enterpriseId: string,
  agreementId: string,
) => {
  const agreement = (
    await runner
      .select()
      .from(bankCollectionAgreements)
      .where(
        and(
          eq(bankCollectionAgreements.id, agreementId),
          eq(bankCollectionAgreements.enterpriseId, enterpriseId),
        ),
      )
      .limit(1)
  )[0];
  if (!agreement) throw new NotFoundError("Convenio nao encontrado", "AGREEMENT_NOT_FOUND");
  if (!agreement.active) {
    throw new BadRequestError("Convenio inativo", "AGREEMENT_INACTIVE");
  }
  return agreement;
};

const issueSlips = async (
  tx: DbTx,
  enterpriseId: string,
  agreement: AgreementRow,
  titleNumber: number,
  installments: InstallmentRow[],
) => {
  let next = agreement.nextNossoNumero;
  for (const installment of installments) {
    if (installment.status === "CANCELADA" || toCents(installment.openAmount) <= 0) continue;
    const nossoNumero = String(next);
    next += 1;
    const [slip] = await tx
      .insert(bankSlips)
      .values({
        enterpriseId,
        installmentId: installment.id,
        agreementId: agreement.id,
        channel: agreement.channel,
        nossoNumero,
        documentNumber: `${titleNumber}-${installment.number}`,
        amount: installment.openAmount,
        dueDate: installment.dueDate,
        status: "AGUARDANDO_REGISTRO",
      })
      .returning();
    if (!slip) throw new Error("Falha ao emitir boleto");
    await tx.insert(bankSlipEvents).values({
      slipId: slip.id,
      kind: "EMISSAO",
      summary: { channel: agreement.channel },
    });
    const port = getBankCollectionPort(agreement.apiProvider);
    if (agreement.channel === "API" && port) {
      const registration = await port.register({
        nossoNumero,
        amount: installment.openAmount,
        dueDate: installment.dueDate,
        documentNumber: slip.documentNumber,
      });
      await tx
        .update(bankSlips)
        .set({
          status: "REGISTRADO",
          externalId: registration.externalId ?? null,
          barcode: registration.barcode ?? null,
          digitableLine: registration.digitableLine ?? null,
          registeredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bankSlips.id, slip.id));
      await tx.insert(bankSlipEvents).values({
        slipId: slip.id,
        kind: "REGISTRO",
        summary: registration,
      });
    }
  }
  await tx
    .update(bankCollectionAgreements)
    .set({ nextNossoNumero: next, updatedAt: new Date() })
    .where(eq(bankCollectionAgreements.id, agreement.id));
};

const nfePlan = async (tx: DbTx, nfeHeaderId: string): Promise<PlanLine[]> => {
  const rows = await tx
    .select()
    .from(nfeDuplicates)
    .where(eq(nfeDuplicates.nfeHeaderId, nfeHeaderId))
    .orderBy(asc(nfeDuplicates.nDup));
  if (rows.length === 0) {
    throw new BadRequestError(
      "Nota sem duplicatas para definir o vencimento",
      "NFE_DUPLICATES_REQUIRED",
    );
  }
  return rows.map((row) => ({
    dueDate: row.dVenc,
    amount: Number(row.vDup),
  }));
};

export class FinancialService {
  public async list(enterpriseId: string, query: ListTitlesQuery) {
    const filters = [eq(financialTitles.enterpriseId, enterpriseId)];
    if (query.direction) filters.push(eq(financialTitles.direction, query.direction));
    if (query.status) filters.push(eq(financialTitles.status, query.status));
    else if (query.settling) filters.push(inArray(financialTitles.status, ["ABERTO", "PARCIAL"]));
    else if (query.reversing) filters.push(inArray(financialTitles.status, ["PARCIAL", "QUITADO"]));
    if (query.memberId) filters.push(eq(financialTitles.memberId, query.memberId));
    if (query.kind) filters.push(eq(financialTitles.kind, query.kind));
    if (query.saleId) {
      filters.push(sql`exists (
        select 1 from ${financialTitleOrigins}
        where ${financialTitleOrigins.titleId} = ${financialTitles.id}
          and ${financialTitleOrigins.salesId} = ${query.saleId}
          and ${financialTitleOrigins.live} = true
      )`);
    }
    if (query.dueFrom) {
      filters.push(
        sql`exists (
          select 1 from financial_installments fi
          where fi.title_id = ${financialTitles.id}
            and fi.status <> 'CANCELADA'
            and fi.due_date >= ${query.dueFrom}
        )`,
      );
    }
    if (query.dueTo) {
      filters.push(
        sql`exists (
          select 1 from financial_installments fi
          where fi.title_id = ${financialTitles.id}
            and fi.status <> 'CANCELADA'
            and fi.due_date <= ${query.dueTo}
        )`,
      );
    }
    const where = and(...filters);
    const offset = (query.page - 1) * query.limit;
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: financialTitles.id,
          enterpriseId: financialTitles.enterpriseId,
          direction: financialTitles.direction,
          source: financialTitles.source,
          kind: financialTitles.kind,
          status: financialTitles.status,
          number: financialTitles.number,
          memberId: financialTitles.memberId,
          memberName: users.userName,
          issueDate: financialTitles.issueDate,
          description: financialTitles.description,
          originalAmount: financialTitles.originalAmount,
          openAmount: financialTitles.openAmount,
          nfeHeaderId: financialTitles.nfeHeaderId,
          consolidatedIntoId: financialTitles.consolidatedIntoId,
          createdAt: financialTitles.createdAt,
          updatedAt: financialTitles.updatedAt,
        })
        .from(financialTitles)
        .innerJoin(enterprisesMembers, eq(financialTitles.memberId, enterprisesMembers.id))
        .innerJoin(users, eq(enterprisesMembers.userId, users.id))
        .where(where)
        .orderBy(desc(financialTitles.issueDate), desc(financialTitles.number))
        .limit(query.limit)
        .offset(offset),
      db.select({ c: sql<number>`count(*)` }).from(financialTitles).where(where),
    ]);
    return {
      items,
      total: Number(totalRows[0]?.c ?? 0),
      page: query.page,
      limit: query.limit,
    };
  }

  public async listOpenInstallments(enterpriseId: string, query: ListOpenInstallmentsQuery) {
    const filters = [
      eq(financialTitles.enterpriseId, enterpriseId),
      inArray(financialTitles.status, ["ABERTO", "PARCIAL"]),
      ne(financialInstallments.status, "CANCELADA"),
      gt(financialInstallments.openAmount, "0"),
    ];
    if (query.direction) filters.push(eq(financialTitles.direction, query.direction));
    if (query.kind) filters.push(eq(financialTitles.kind, query.kind));
    if (query.memberId) filters.push(eq(financialTitles.memberId, query.memberId));
    if (query.number) filters.push(eq(financialTitles.number, query.number));
    if (query.dueFrom) filters.push(gte(financialInstallments.dueDate, query.dueFrom));
    if (query.dueTo) filters.push(lte(financialInstallments.dueDate, query.dueTo));
    const where = and(...filters);
    const offset = (query.page - 1) * query.limit;
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: financialInstallments.id,
          number: financialInstallments.number,
          dueDate: financialInstallments.dueDate,
          openAmount: financialInstallments.openAmount,
          titleId: financialTitles.id,
          titleNumber: financialTitles.number,
          memberId: financialTitles.memberId,
          memberName: users.userName,
          direction: financialTitles.direction,
          kind: financialTitles.kind,
        })
        .from(financialInstallments)
        .innerJoin(financialTitles, eq(financialInstallments.titleId, financialTitles.id))
        .innerJoin(enterprisesMembers, eq(financialTitles.memberId, enterprisesMembers.id))
        .innerJoin(users, eq(enterprisesMembers.userId, users.id))
        .where(where)
        .orderBy(
          asc(financialInstallments.dueDate),
          asc(financialTitles.number),
          asc(financialInstallments.number),
        )
        .limit(query.limit)
        .offset(offset),
      db
        .select({ c: sql<number>`count(*)` })
        .from(financialInstallments)
        .innerJoin(financialTitles, eq(financialInstallments.titleId, financialTitles.id))
        .innerJoin(enterprisesMembers, eq(financialTitles.memberId, enterprisesMembers.id))
        .innerJoin(users, eq(enterprisesMembers.userId, users.id))
        .where(where),
    ]);
    return {
      items,
      total: Number(totalRows[0]?.c ?? 0),
      page: query.page,
      limit: query.limit,
    };
  }

  public async getById(enterpriseId: string, titleId: string) {
    const title = await loadTitle(db, enterpriseId, titleId);
    const memberName = (
      await db
        .select({ name: users.userName })
        .from(enterprisesMembers)
        .innerJoin(users, eq(users.id, enterprisesMembers.userId))
        .where(eq(enterprisesMembers.id, title.memberId))
        .limit(1)
    )[0]?.name ?? "";
    const [installments, origins, settlements] = await Promise.all([
      db
        .select()
        .from(financialInstallments)
        .where(eq(financialInstallments.titleId, titleId))
        .orderBy(asc(financialInstallments.scheduleSource), asc(financialInstallments.number)),
      db
        .select({
          id: financialTitleOrigins.id,
          titleId: financialTitleOrigins.titleId,
          salesId: financialTitleOrigins.salesId,
          nfeHeaderId: financialTitleOrigins.nfeHeaderId,
          contributedAmount: financialTitleOrigins.contributedAmount,
          returnedAmount: financialTitleOrigins.returnedAmount,
          live: financialTitleOrigins.live,
          createdAt: financialTitleOrigins.createdAt,
          orderNumber: sales.orderNumber,
        })
        .from(financialTitleOrigins)
        .leftJoin(sales, eq(sales.id, financialTitleOrigins.salesId))
        .where(eq(financialTitleOrigins.titleId, titleId)),
      db
        .select()
        .from(financialSettlements)
        .where(eq(financialSettlements.titleId, titleId))
        .orderBy(desc(financialSettlements.createdAt)),
    ]);
    const installmentIds = installments.map((row) => row.id);
    const slips = installmentIds.length
      ? await db
          .select()
          .from(bankSlips)
          .where(inArray(bankSlips.installmentId, installmentIds))
      : [];
    const credits =
      title.direction === "RECEBER"
        ? await db
            .select()
            .from(memberCredits)
            .where(
              and(
                eq(memberCredits.enterpriseId, enterpriseId),
                eq(memberCredits.memberId, title.memberId),
                inArray(memberCredits.status, ["ABERTO", "PARCIAL"]),
              ),
            )
        : [];
    const saleIds = origins.flatMap((row) => (row.salesId ? [row.salesId] : []));
    const linkedNotes = saleIds.length
      ? await db
          .select({ nfeHeaderId: nfeSales.nfeHeaderId })
          .from(nfeSales)
          .where(and(inArray(nfeSales.salesId, saleIds), isNull(nfeSales.deletedAt)))
      : [];
    const noteIds = [
      ...new Set(
        [title.nfeHeaderId, ...origins.map((row) => row.nfeHeaderId), ...linkedNotes.map((row) => row.nfeHeaderId)]
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const invoices = noteIds.length
      ? await db
          .select({
            id: nfeHeaders.id,
            nNf: nfeHeaders.nNf,
            serie: nfeHeaders.serie,
            status: nfeHeaders.status,
            dhEmi: nfeHeaders.dhEmi,
            chave: nfeHeaders.chave,
            vNf: nfeHeaders.vNf,
          })
          .from(nfeHeaders)
          .where(inArray(nfeHeaders.id, noteIds))
      : [];
    return { ...title, memberName, installments, origins, settlements, slips, credits, invoices };
  }

  public async summary(enterpriseId: string, query: SummaryQuery) {
    const today = todayDateOnly();
    const rows = await db
      .select({
        totalOpen: sql<string>`coalesce(sum(${financialInstallments.openAmount}), 0)`,
        overdue: sql<string>`coalesce(sum(case when ${financialInstallments.dueDate} < ${today} then ${financialInstallments.openAmount} else 0 end), 0)`,
        dueToday: sql<string>`coalesce(sum(case when ${financialInstallments.dueDate} = ${today} then ${financialInstallments.openAmount} else 0 end), 0)`,
        upcoming: sql<string>`coalesce(sum(case when ${financialInstallments.dueDate} > ${today} then ${financialInstallments.openAmount} else 0 end), 0)`,
      })
      .from(financialInstallments)
      .innerJoin(financialTitles, eq(financialInstallments.titleId, financialTitles.id))
      .where(
        and(
          eq(financialTitles.enterpriseId, enterpriseId),
          eq(financialTitles.direction, query.direction),
          inArray(financialTitles.status, ["ABERTO", "PARCIAL"]),
          ne(financialInstallments.status, "CANCELADA"),
        ),
      );
    const row = rows[0];
    const settled =
      query.dateFrom && query.dateTo
        ? await this.settledInPeriod(enterpriseId, query.direction, query.dateFrom, query.dateTo)
        : 0;
    return {
      direction: query.direction,
      totalOpen: Number(row?.totalOpen ?? 0),
      overdue: Number(row?.overdue ?? 0),
      dueToday: Number(row?.dueToday ?? 0),
      upcoming: Number(row?.upcoming ?? 0),
      settled,
    };
  }

  /** Dinheiro que entrou ou saiu no período: baixa menos o valor pago das baixas estornadas nesse intervalo. */
  private async settledInPeriod(
    enterpriseId: string,
    direction: "RECEBER" | "PAGAR",
    dateFrom: string,
    dateTo: string,
  ) {
    const original = alias(financialSettlements, "originalSettlement");
    const rows = await db
      .select({
        settled: sql<string>`coalesce(sum(case
          when ${financialSettlements.kind} = 'BAIXA' then ${financialSettlements.amount}
          when ${financialSettlements.kind} = 'ESTORNO' then -coalesce(${original.amount}, 0)
          else 0
        end), 0)`,
      })
      .from(financialSettlements)
      .innerJoin(financialTitles, eq(financialSettlements.titleId, financialTitles.id))
      .leftJoin(original, eq(financialSettlements.reversesSettlementId, original.id))
      .where(
        and(
          eq(financialTitles.enterpriseId, enterpriseId),
          eq(financialTitles.direction, direction),
          gte(financialSettlements.settledAt, dateFrom),
          lte(financialSettlements.settledAt, dateTo),
          inArray(financialSettlements.kind, ["BAIXA", "ESTORNO"]),
        ),
      );
    return Number(rows[0]?.settled ?? 0);
  }

  public async createManual(enterpriseId: string, input: CreateTitleInput) {
    const total = input.installments.reduce((sum, line) => sum + toCents(line.amount), 0);
    const titleId = await db.transaction(async (tx) => {
      await assertMemberInEnterprise(tx, enterpriseId, input.memberId);
      const number = await nextTitleNumber(tx, enterpriseId, input.direction);
      const [title] = await tx
        .insert(financialTitles)
        .values({
          enterpriseId,
          direction: input.direction,
          source: "MANUAL",
          kind: "AVULSO",
          status: "ABERTO",
          number,
          memberId: input.memberId,
          issueDate: input.issueDate,
          description: input.description ?? null,
          originalAmount: fromCents(total),
          openAmount: fromCents(total),
        })
        .returning();
      if (!title) throw new Error("Falha ao criar titulo");
      await insertSchedule(tx, title.id, "PEDIDO", input.installments);
      return title.id;
    });
    return this.getById(enterpriseId, titleId);
  }

  public async bill(enterpriseId: string, input: BillReceivablesInput) {
    const saleIds = [...new Set(input.saleIds)];
    const titleId = await db.transaction(async (tx) => {
      const saleRows = await tx
        .select()
        .from(sales)
        .where(and(eq(sales.enterprisesId, enterpriseId), inArray(sales.id, saleIds)));
      if (saleRows.length !== saleIds.length) {
        throw new NotFoundError(
          "Pedido nao encontrado nesta empresa",
          "SALE_NOT_FOUND",
        );
      }
      if (
        saleRows.some(
          (sale) => sale.type !== "VENDA" && sale.type !== "ORDEM DE SERVICO",
        )
      ) {
        throw new BadRequestError(
          "Faturamento apenas de venda ou ordem de servico",
          "SALE_TYPE_INVALID",
        );
      }
      const memberId = saleRows[0]?.memberId;
      if (saleRows.some((sale) => sale.memberId !== memberId)) {
        throw new BadRequestError(
          "Pedidos de clientes diferentes nao faturam juntos",
          "SALE_MEMBER_MISMATCH",
        );
      }

      let plan: PlanLine[];
      if (input.kind === "NFE") {
        const header = (
          await tx
            .select()
            .from(nfeHeaders)
            .where(
              and(
                eq(nfeHeaders.id, input.nfeHeaderId!),
                eq(nfeHeaders.enterpriseId, enterpriseId),
              ),
            )
            .limit(1)
        )[0];
        if (!header) throw new NotFoundError("Nota nao encontrada", "NFE_NOT_FOUND");
        const links = await tx
          .select({ salesId: nfeSales.salesId })
          .from(nfeSales)
          .where(and(eq(nfeSales.nfeHeaderId, header.id), isNull(nfeSales.deletedAt)));
        const linked = new Set(links.map((link) => link.salesId));
        if (saleIds.some((id) => !linked.has(id)) || linked.size !== saleIds.length) {
          throw new BadRequestError(
            "A nota precisa estar ligada exatamente a estes pedidos",
            "NFE_SALES_MISMATCH",
          );
        }
        plan = await nfePlan(tx, header.id);
      } else {
        plan = input.installments!;
      }

      for (const saleId of saleIds) {
        await ensureReceivableFromSale(tx, { enterpriseId, saleId });
      }
      const origins = await tx
        .select()
        .from(financialTitleOrigins)
        .where(
          and(
            inArray(financialTitleOrigins.salesId, saleIds),
            eq(financialTitleOrigins.live, true),
          ),
        );
      if (origins.length !== saleIds.length) {
        const covered = new Set(origins.map((origin) => origin.salesId));
        const missing = saleRows
          .filter((sale) => !covered.has(sale.id))
          .map((sale) => sale.orderNumber)
          .join(", ");
        throw new BadRequestError(
          missing
            ? `Pedido ${missing} sem titulo em aberto no contas a receber`
            : "Pedido sem titulo em aberto no contas a receber",
          "TITLE_ORIGIN_MISSING",
        );
      }
      const titles = await tx
        .select()
        .from(financialTitles)
        .where(
          inArray(
            financialTitles.id,
            origins.map((origin) => origin.titleId),
          ),
        );
      if (titles.some((title) => title.kind !== "PEDIDO")) {
        throw new ConflictError("Pedido ja faturado", "TITLE_ALREADY_BILLED");
      }
      for (const title of titles) {
        if (await titleHasOpenBaixa(tx, title.id)) {
          throw new BadRequestError(
            "Titulo com baixa nao troca o plano",
            "TITLE_HAS_SETTLEMENT",
          );
        }
      }
      const abatement = [];
      for (const title of titles) {
        if (await titleHasAbatement(tx, title.id)) abatement.push(title.id);
      }
      if (titles.length > 1 && abatement.length > 0) {
        throw new BadRequestError(
          "Titulo com abatimento fatura sozinho e so troca o vencimento",
          "ABATEMENT_NO_MERGE",
        );
      }
      const datesOnly = abatement.length > 0;
      if (!datesOnly && saleRows.some((sale) => sale.status !== "FINALIZADA")) {
        throw new BadRequestError(
          "Faturamento de valor exige pedido finalizado",
          "SALE_NOT_FINAL",
        );
      }

      const agreement =
        input.kind === "BOLETO"
          ? await loadAgreement(tx, enterpriseId, input.agreementId!)
          : null;

      if (titles.length === 1) {
        const title = titles[0]!;
        const open = await openInstallments(tx, title.id, "earliest");
        if (datesOnly) {
          const ordered = [...open].sort((a, b) => a.number - b.number);
          assertPlanMatchesOpen(plan, ordered);
          await updateDueDatesOnly(tx, ordered, plan);
          if (agreement) {
            await ensureMissingSlips(tx, enterpriseId, agreement, title.number, ordered);
          }
        } else {
          assertPlanCloses(plan, toCents(title.openAmount));
          await cancelLiveSchedule(tx, title.id);
          const created = await insertSchedule(
            tx,
            title.id,
            input.kind === "NFE" ? "NFE" : "BOLETO",
            plan,
          );
          if (agreement) await issueSlips(tx, enterpriseId, agreement, title.number, created);
        }
        await tx
          .update(financialTitles)
          .set({
            kind: input.kind === "NFE" ? "NFE" : "BOLETO",
            nfeHeaderId: input.kind === "NFE" ? input.nfeHeaderId! : title.nfeHeaderId,
            updatedAt: new Date(),
          })
          .where(eq(financialTitles.id, title.id));
        if (!datesOnly) await refreshTitle(tx, title.id);
        return title.id;
      }

      const openTotal = titles.reduce((sum, title) => sum + toCents(title.openAmount), 0);
      assertPlanCloses(plan, openTotal);
      const number = await nextTitleNumber(tx, enterpriseId, "RECEBER");
      const [createdTitle] = await tx
        .insert(financialTitles)
        .values({
          enterpriseId,
          direction: "RECEBER",
          source: "VENDA",
          kind: input.kind === "NFE" ? "NFE" : "BOLETO",
          status: "ABERTO",
          number,
          memberId: memberId!,
          issueDate: todayDateOnly(),
          originalAmount: fromCents(openTotal),
          openAmount: fromCents(openTotal),
          nfeHeaderId: input.kind === "NFE" ? input.nfeHeaderId! : null,
        })
        .returning();
      if (!createdTitle) throw new Error("Falha ao consolidar titulos");

      for (const title of titles) {
        await cancelLiveSchedule(tx, title.id);
        await tx
          .update(financialTitles)
          .set({
            status: "CONSOLIDADO",
            openAmount: "0.00",
            consolidatedIntoId: createdTitle.id,
            updatedAt: new Date(),
          })
          .where(eq(financialTitles.id, title.id));
        await tx
          .update(financialTitleOrigins)
          .set({ live: false })
          .where(eq(financialTitleOrigins.titleId, title.id));
      }
      await tx.insert(financialTitleOrigins).values(
        origins.map((origin) => ({
          titleId: createdTitle.id,
          salesId: origin.salesId,
          nfeHeaderId: input.kind === "NFE" ? input.nfeHeaderId! : origin.nfeHeaderId,
          contributedAmount: origin.contributedAmount,
          returnedAmount: origin.returnedAmount,
          live: true,
        })),
      );
      const created = await insertSchedule(
        tx,
        createdTitle.id,
        input.kind === "NFE" ? "NFE" : "BOLETO",
        plan,
      );
      if (agreement) {
        await issueSlips(tx, enterpriseId, agreement, createdTitle.number, created);
      }
      await refreshTitle(tx, createdTitle.id);
      return createdTitle.id;
    });
    return this.getById(enterpriseId, titleId);
  }

  public async issueBoleto(
    enterpriseId: string,
    titleId: string,
    input: IssueBoletoInput,
  ) {
    await db.transaction(async (tx) => {
      const title = await loadTitle(tx, enterpriseId, titleId);
      if (title.direction !== "RECEBER") {
        throw new BadRequestError("Boleto apenas no contas a receber", "TITLE_DIRECTION");
      }
      if (title.kind !== "PEDIDO" && title.kind !== "NFE") {
        throw new ConflictError(
          "Boleto so em titulo de pedido ou de nota",
          "TITLE_KIND_INVALID",
        );
      }
      if (title.status === "CONSOLIDADO" || title.status === "CANCELADO" || title.status === "QUITADO") {
        throw new BadRequestError("Titulo nao aceita boleto", "TITLE_STATUS_INVALID");
      }
      if (await titleHasOpenBaixa(tx, title.id)) {
        throw new BadRequestError("Titulo com baixa nao troca o plano", "TITLE_HAS_SETTLEMENT");
      }
      const agreement = await loadAgreement(tx, enterpriseId, input.agreementId);
      const datesOnly = await titleHasAbatement(tx, title.id);
      const open = await openInstallments(tx, title.id, "earliest");
      if (datesOnly) {
        const ordered = [...open].sort((a, b) => a.number - b.number);
        assertPlanMatchesOpen(input.installments, ordered);
        await updateDueDatesOnly(tx, ordered, input.installments);
        await ensureMissingSlips(tx, enterpriseId, agreement, title.number, ordered);
      } else {
        assertPlanCloses(input.installments, toCents(title.openAmount));
        await cancelLiveSchedule(tx, title.id);
        const created = await insertSchedule(tx, title.id, "BOLETO", input.installments);
        await issueSlips(tx, enterpriseId, agreement, title.number, created);
        await refreshTitle(tx, title.id);
      }
      await tx
        .update(financialTitles)
        .set({ kind: "BOLETO", updatedAt: new Date() })
        .where(eq(financialTitles.id, title.id));
    });
    return this.getById(enterpriseId, titleId);
  }

  public async settle(
    enterpriseId: string,
    installmentId: string,
    userId: string,
    input: SettlementInput,
    allowedDirections: Array<"RECEBER" | "PAGAR">,
  ) {
    return db.transaction(async (tx) => {
      const installment = (
        await tx
          .select()
          .from(financialInstallments)
          .where(eq(financialInstallments.id, installmentId))
          .limit(1)
      )[0];
      if (!installment) {
        throw new NotFoundError("Parcela nao encontrada", "INSTALLMENT_NOT_FOUND");
      }
      const title = await loadTitle(tx, enterpriseId, installment.titleId);
      if (!allowedDirections.includes(title.direction)) {
        throw new ForbiddenError("Permissao negada para baixar este titulo", "PERMISSION_DENIED");
      }
      if (title.status === "CONSOLIDADO" || title.status === "CANCELADO" || title.status === "QUITADO") {
        throw new BadRequestError("Titulo nao aceita baixa", "TITLE_STATUS_INVALID");
      }
      if (installment.status === "CANCELADA") {
        throw new BadRequestError("Parcela cancelada", "INSTALLMENT_CANCELLED");
      }
      const paid = toCents(input.amount);
      const discount = toCents(input.discount);
      const increase = toCents(input.increase);
      const abatement = paid + discount - increase;
      const open = toCents(installment.openAmount);
      if (abatement <= 0) {
        throw new BadRequestError("O abatimento precisa ser maior que zero", "SETTLEMENT_ABATEMENT");
      }
      if (input.mode === "INTEGRAL" && abatement !== open) {
        throw new BadRequestError("A conta nao fecha o saldo da parcela", "SETTLEMENT_MISMATCH");
      }
      if (input.mode === "INTEGRAL") {
        await assertReceiptDiscount(tx, enterpriseId, userId, discount, open);
      }
      if (input.mode === "PARCIAL" && abatement >= open) {
        throw new BadRequestError(
          "Baixa parcial nao pode quitar nem ultrapassar o saldo",
          "SETTLEMENT_EXCEEDS",
        );
      }
      await assertPaymentFlag(tx, enterpriseId, input.paymentTypesMethodsFlagsId);
      await tx
        .update(financialInstallments)
        .set({ openAmount: fromCents(open - abatement), updatedAt: new Date() })
        .where(eq(financialInstallments.id, installment.id));
      const [settlement] = await tx
        .insert(financialSettlements)
        .values({
          enterpriseId,
          titleId: title.id,
          installmentId: installment.id,
          kind: "BAIXA",
          amount: fromCents(paid),
          discount: fromCents(discount),
          increase: fromCents(increase),
          settledAt: input.settledAt,
          paymentTypesMethodsFlagsId: input.paymentTypesMethodsFlagsId,
          note: input.note ?? null,
          userId,
        })
        .returning();
      await refreshTitle(tx, title.id);
      return settlement;
    });
  }

  public async settleIntegral(
    enterpriseId: string,
    userId: string,
    input: IntegralSettlementInput,
    allowedDirections: Array<"RECEBER" | "PAGAR">,
  ) {
    const ids = input.installmentIds;
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestError("Parcela repetida na baixa", "SETTLEMENT_DUPLICATE");
    }
    return db.transaction(async (tx) => {
      const installments = await tx
        .select()
        .from(financialInstallments)
        .where(inArray(financialInstallments.id, ids))
        .for("update");
      if (installments.length !== ids.length) {
        throw new NotFoundError("Parcela nao encontrada", "INSTALLMENT_NOT_FOUND");
      }
      const titleIds = [...new Set(installments.map((row) => row.titleId))];
      const titles = await tx
        .select()
        .from(financialTitles)
        .where(and(inArray(financialTitles.id, titleIds), eq(financialTitles.enterpriseId, enterpriseId)))
        .for("update");
      if (titles.length !== titleIds.length) {
        throw new NotFoundError("Parcela nao encontrada", "INSTALLMENT_NOT_FOUND");
      }
      const titleOf = new Map(titles.map((title) => [title.id, title]));
      const lines = installments.map((installment) => {
        const title = titleOf.get(installment.titleId)!;
        if (!allowedDirections.includes(title.direction)) {
          throw new ForbiddenError("Permissao negada para baixar este titulo", "PERMISSION_DENIED");
        }
        if (title.status === "CONSOLIDADO" || title.status === "CANCELADO" || title.status === "QUITADO") {
          throw new BadRequestError("Titulo nao aceita baixa", "TITLE_STATUS_INVALID");
        }
        if (installment.status === "CANCELADA") {
          throw new BadRequestError("Parcela cancelada", "INSTALLMENT_CANCELLED");
        }
        const open = toCents(installment.openAmount);
        if (open <= 0) {
          throw new BadRequestError("Parcela sem saldo", "SETTLEMENT_ABATEMENT");
        }
        return { installment, title, open };
      });
      const openCents = lines.reduce((sum, line) => sum + line.open, 0);
      const discountCents = toCents(input.discount);
      const increaseCents = toCents(input.increase);
      if (discountCents > openCents) {
        throw new BadRequestError("O desconto passa do saldo marcado", "SETTLEMENT_DISCOUNT");
      }
      await assertReceiptDiscount(tx, enterpriseId, userId, discountCents, openCents);
      const weights = lines.map((line) => line.open);
      const preference = lines
        .map((line, index) => ({
          index,
          open: line.open,
          due: String(line.installment.dueDate),
          titleNumber: line.title.number,
          number: line.installment.number,
          id: line.installment.id,
        }))
        .sort(
          (a, b) =>
            b.open - a.open ||
            a.due.localeCompare(b.due) ||
            a.titleNumber - b.titleNumber ||
            a.number - b.number ||
            a.id.localeCompare(b.id),
        )
        .map((line) => line.index);
      const discounts = allocateCents(discountCents, weights, weights, preference);
      const increases = allocateCents(
        increaseCents,
        weights,
        weights.map(() => Number.MAX_SAFE_INTEGER),
        preference,
      );
      await assertPaymentFlag(tx, enterpriseId, input.paymentTypesMethodsFlagsId);
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index]!;
        const discount = discounts[index] ?? 0;
        const increase = increases[index] ?? 0;
        const paid = line.open - discount + increase;
        if (paid < 0) {
          throw new BadRequestError("O desconto passa do saldo marcado", "SETTLEMENT_DISCOUNT");
        }
        await tx
          .update(financialInstallments)
          .set({ openAmount: "0.00", updatedAt: new Date() })
          .where(eq(financialInstallments.id, line.installment.id));
        await tx.insert(financialSettlements).values({
          enterpriseId,
          titleId: line.title.id,
          installmentId: line.installment.id,
          kind: "BAIXA",
          amount: fromCents(paid),
          discount: fromCents(discount),
          increase: fromCents(increase),
          settledAt: input.settledAt,
          paymentTypesMethodsFlagsId: input.paymentTypesMethodsFlagsId,
          note: input.note ?? null,
          userId,
        });
      }
      for (const titleId of titleIds) await refreshTitle(tx, titleId);
      return { count: lines.length };
    });
  }

  public async reverse(
    enterpriseId: string,
    settlementId: string,
    userId: string,
    allowedDirections: Array<"RECEBER" | "PAGAR">,
  ) {
    return db.transaction(async (tx) => {
      const settlement = (
        await tx
          .select()
          .from(financialSettlements)
          .where(
            and(
              eq(financialSettlements.id, settlementId),
              eq(financialSettlements.enterpriseId, enterpriseId),
            ),
          )
          .limit(1)
      )[0];
      if (!settlement) {
        throw new NotFoundError("Baixa nao encontrada", "SETTLEMENT_NOT_FOUND");
      }
      if (settlement.kind !== "BAIXA") {
        throw new BadRequestError("So baixa pode ser estornada", "SETTLEMENT_KIND");
      }
      const already = (
        await tx
          .select({ id: financialSettlements.id })
          .from(financialSettlements)
          .where(eq(financialSettlements.reversesSettlementId, settlement.id))
          .limit(1)
      )[0];
      if (already) throw new ConflictError("Baixa ja estornada", "SETTLEMENT_REVERSED");

      const installment = (
        await tx
          .select()
          .from(financialInstallments)
          .where(eq(financialInstallments.id, settlement.installmentId))
          .limit(1)
      )[0];
      if (!installment || installment.status === "CANCELADA") {
        throw new BadRequestError("Parcela nao pode ser reaberta", "INSTALLMENT_CANCELLED");
      }
      const title = await loadTitle(tx, enterpriseId, settlement.titleId);
      if (!allowedDirections.includes(title.direction)) {
        throw new ForbiddenError("Permissao negada para estornar este titulo", "PERMISSION_DENIED");
      }
      const restored =
        toCents(settlement.amount) + toCents(settlement.discount) - toCents(settlement.increase);
      const nextOpen = toCents(installment.openAmount) + restored;
      if (nextOpen > toCents(installment.originalAmount)) {
        throw new ConflictError("Estorno ultrapassa o valor da parcela", "REVERSAL_EXCEEDS");
      }
      await tx
        .update(financialInstallments)
        .set({ openAmount: fromCents(nextOpen), updatedAt: new Date() })
        .where(eq(financialInstallments.id, installment.id));
      const [reversal] = await tx
        .insert(financialSettlements)
        .values({
          enterpriseId,
          titleId: settlement.titleId,
          installmentId: installment.id,
          kind: "ESTORNO",
          amount: fromCents(restored),
          discount: "0.00",
          increase: "0.00",
          settledAt: todayDateOnly(),
          reversesSettlementId: settlement.id,
          userId,
          note: "Estorno de baixa",
        })
        .returning();
      await refreshTitle(tx, settlement.titleId);
      return reversal;
    });
  }

  public async applyCredit(
    enterpriseId: string,
    titleId: string,
    userId: string,
    input: ApplyCreditInput,
  ) {
    await db.transaction(async (tx) => {
      const title = await loadTitle(tx, enterpriseId, titleId);
      if (title.direction !== "RECEBER") {
        throw new BadRequestError("Credito apenas no contas a receber", "TITLE_DIRECTION");
      }
      const credit = (
        await tx
          .select()
          .from(memberCredits)
          .where(
            and(
              eq(memberCredits.id, input.creditId),
              eq(memberCredits.enterpriseId, enterpriseId),
              eq(memberCredits.memberId, title.memberId),
            ),
          )
          .limit(1)
      )[0];
      if (!credit) throw new NotFoundError("Credito nao encontrado", "CREDIT_NOT_FOUND");
      const amount = toCents(input.amount);
      if (amount > toCents(credit.openAmount)) {
        throw new BadRequestError("Valor maior que o credito", "CREDIT_EXCEEDS");
      }
      const applied = await reduceOpenBalance(tx, {
        enterpriseId,
        titleId: title.id,
        amountCents: amount,
        order: "earliest",
        kind: "ABATIMENTO_CREDITO",
        settledAt: todayDateOnly(),
        userId,
        memberCreditId: credit.id,
        note: "Abatimento de credito",
      });
      if (applied !== amount) {
        throw new BadRequestError(
          "Credito maior que o saldo do titulo",
          "CREDIT_EXCEEDS_TITLE",
        );
      }
      const open = toCents(credit.openAmount) - applied;
      await tx
        .update(memberCredits)
        .set({
          openAmount: fromCents(open),
          status: open <= 0 ? "UTILIZADO" : "PARCIAL",
          updatedAt: new Date(),
        })
        .where(eq(memberCredits.id, credit.id));
    });
    return this.getById(enterpriseId, titleId);
  }

  public async createPayableFromNfe(enterpriseId: string, input: PayableFromNfeInput) {
    const titleId = await db.transaction(async (tx) => {
      const header = (
        await tx
          .select()
          .from(nfeHeaders)
          .where(
            and(eq(nfeHeaders.id, input.nfeHeaderId), eq(nfeHeaders.enterpriseId, enterpriseId)),
          )
          .limit(1)
      )[0];
      if (!header) throw new NotFoundError("Nota nao encontrada", "NFE_NOT_FOUND");
      if (header.issuanceType !== "TERCEIRO" || header.moviments !== "ENTRADA") {
        throw new BadRequestError(
          "Contas a pagar nasce de nota de entrada de terceiro",
          "NFE_NOT_INBOUND",
        );
      }
      const linked = (
        await tx
          .select({ id: financialTitleOrigins.id })
          .from(financialTitleOrigins)
          .innerJoin(financialTitles, eq(financialTitleOrigins.titleId, financialTitles.id))
          .where(
            and(
              eq(financialTitleOrigins.nfeHeaderId, header.id),
              eq(financialTitles.direction, "PAGAR"),
              ne(financialTitles.status, "CANCELADO"),
            ),
          )
          .limit(1)
      )[0];
      if (linked) throw new ConflictError("Nota ja lancada no contas a pagar", "NFE_ALREADY_PAYABLE");

      const memberId = input.memberId ?? header.emitMemberId;
      if (!memberId) {
        throw new BadRequestError("Informe o fornecedor da nota", "SUPPLIER_REQUIRED");
      }
      await assertMemberInEnterprise(tx, enterpriseId, memberId);
      if (!header.emitMemberId) {
        await tx
          .update(nfeHeaders)
          .set({ emitMemberId: memberId })
          .where(eq(nfeHeaders.id, header.id));
      }

      const duplicates = await tx
        .select()
        .from(nfeDuplicates)
        .where(eq(nfeDuplicates.nfeHeaderId, header.id))
        .orderBy(asc(nfeDuplicates.nDup));
      const lines: PlanLine[] = duplicates.length
        ? duplicates.map((row) => ({ dueDate: row.dVenc, amount: Number(row.vDup) }))
        : [
            {
              dueDate: header.entryDate ? asDateOnly(header.entryDate) : asDateOnly(header.dhEmi),
              amount: Number(header.vLiq ?? header.vNf ?? 0),
            },
          ];
      if (lines.some((line) => toCents(line.amount) <= 0)) {
        throw new BadRequestError("Nota sem valor para o contas a pagar", "NFE_AMOUNT_REQUIRED");
      }
      const total = lines.reduce((sum, line) => sum + toCents(line.amount), 0);
      const number = await nextTitleNumber(tx, enterpriseId, "PAGAR");
      const [title] = await tx
        .insert(financialTitles)
        .values({
          enterpriseId,
          direction: "PAGAR",
          source: "COMPRA",
          kind: "COMPRA",
          status: "ABERTO",
          number,
          memberId,
          issueDate: header.entryDate ? asDateOnly(header.entryDate) : todayDateOnly(),
          originalAmount: fromCents(total),
          openAmount: fromCents(total),
          nfeHeaderId: header.id,
        })
        .returning();
      if (!title) throw new Error("Falha ao criar titulo a pagar");
      await insertSchedule(tx, title.id, "NFE", lines);
      await tx.insert(financialTitleOrigins).values({
        titleId: title.id,
        nfeHeaderId: header.id,
        contributedAmount: fromCents(total),
        returnedAmount: "0.00",
        live: true,
      });
      return title.id;
    });
    return this.getById(enterpriseId, titleId);
  }

  public async listAgreements(enterpriseId: string) {
    return db
      .select()
      .from(bankCollectionAgreements)
      .where(eq(bankCollectionAgreements.enterpriseId, enterpriseId))
      .orderBy(asc(bankCollectionAgreements.bankCode));
  }

  public async createAgreement(enterpriseId: string, input: CreateAgreementInput) {
    const [row] = await db
      .insert(bankCollectionAgreements)
      .values({
        enterpriseId,
        bankCode: input.bankCode,
        branch: input.branch,
        branchDigit: input.branchDigit ?? null,
        account: input.account,
        accountDigit: input.accountDigit ?? null,
        wallet: input.wallet,
        agreementCode: input.agreementCode,
        walletVariation: input.walletVariation ?? null,
        beneficiaryDocument: input.beneficiaryDocument,
        beneficiaryName: input.beneficiaryName,
        channel: input.channel,
        cnabLayout: input.channel === "CNAB" ? input.cnabLayout! : null,
        apiProvider: input.apiProvider ?? null,
        credentialRef: input.credentialRef ?? null,
      })
      .returning();
    return row;
  }

  public async createRemittance(enterpriseId: string, agreementId: string) {
    return db.transaction(async (tx) => {
      const agreement = await loadAgreement(tx, enterpriseId, agreementId);
      if (agreement.channel !== "CNAB" || !agreement.cnabLayout) {
        throw new BadRequestError("Convenio nao e de remessa", "AGREEMENT_NOT_CNAB");
      }
      const port = getBankCollectionPort(agreement.apiProvider);
      if (!port) {
        throw new BadRequestError(
          "Adaptador deste banco ainda nao esta configurado",
          "BANK_ADAPTER_MISSING",
        );
      }
      const slips = await tx
        .select()
        .from(bankSlips)
        .where(
          and(
            eq(bankSlips.agreementId, agreement.id),
            eq(bankSlips.status, "AGUARDANDO_REGISTRO"),
          ),
        );
      if (slips.length === 0) {
        throw new BadRequestError("Nao ha boleto aguardando remessa", "REMITTANCE_EMPTY");
      }
      const sequence = agreement.remittanceSequence + 1;
      const content = await port.buildRemittance(
        slips.map((slip) => ({
          nossoNumero: slip.nossoNumero,
          amount: slip.amount,
          dueDate: slip.dueDate,
          documentNumber: slip.documentNumber,
          movement: "REGISTRO" as const,
        })),
      );
      const [remittance] = await tx
        .insert(bankRemittances)
        .values({
          enterpriseId,
          agreementId: agreement.id,
          layout: agreement.cnabLayout,
          sequence,
          fileName: `REM${String(sequence).padStart(6, "0")}.txt`,
          status: "GERADA",
          content,
        })
        .returning();
      if (!remittance) throw new Error("Falha ao gerar remessa");
      await tx.insert(bankRemittanceItems).values(
        slips.map((slip) => ({
          remittanceId: remittance.id,
          slipId: slip.id,
          movement: "REGISTRO" as const,
        })),
      );
      await tx
        .update(bankCollectionAgreements)
        .set({ remittanceSequence: sequence, updatedAt: new Date() })
        .where(eq(bankCollectionAgreements.id, agreement.id));
      return remittance;
    });
  }

  public async getRemittanceFile(enterpriseId: string, remittanceId: string) {
    const row = (
      await db
        .select()
        .from(bankRemittances)
        .where(
          and(
            eq(bankRemittances.id, remittanceId),
            eq(bankRemittances.enterpriseId, enterpriseId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) throw new NotFoundError("Remessa nao encontrada", "REMITTANCE_NOT_FOUND");
    return row;
  }

  public async importReturn(
    enterpriseId: string,
    agreementId: string,
    input: ImportReturnInput,
  ) {
    const agreement = await loadAgreement(db, enterpriseId, agreementId);
    if (agreement.channel !== "CNAB" || !agreement.cnabLayout) {
      throw new BadRequestError("Convenio nao e de remessa", "AGREEMENT_NOT_CNAB");
    }
    const port = getBankCollectionPort(agreement.apiProvider);
    if (!port) {
      throw new BadRequestError(
        "Adaptador deste banco ainda nao esta configurado",
        "BANK_ADAPTER_MISSING",
      );
    }
    const parsed = await port.parseReturn(input.content);
    return db.transaction(async (tx) => {
      const [file] = await tx
        .insert(bankReturns)
        .values({
          enterpriseId,
          agreementId: agreement.id,
          fileName: input.fileName,
          layout: agreement.cnabLayout!,
          content: input.content,
        })
        .returning();
      if (!file) throw new Error("Falha ao importar retorno");
      for (const item of parsed) {
        const slip = (
          await tx
            .select()
            .from(bankSlips)
            .where(
              and(
                eq(bankSlips.agreementId, agreement.id),
                eq(bankSlips.nossoNumero, item.nossoNumero),
              ),
            )
            .limit(1)
        )[0];
        await tx.insert(bankReturnItems).values({
          returnId: file.id,
          slipId: slip?.id ?? null,
          occurrenceCode: item.occurrenceCode,
          occurrence: item.occurrence,
          paidAmount: item.paidAmount ?? null,
          paidAt: item.paidAt ?? null,
          creditDate: item.creditDate ?? null,
          nossoNumero: item.nossoNumero,
        });
        if (!slip) continue;
        if (item.occurrence === "REGISTRO_CONFIRMADO") {
          await tx
            .update(bankSlips)
            .set({ status: "REGISTRADO", registeredAt: new Date(), updatedAt: new Date() })
            .where(eq(bankSlips.id, slip.id));
        }
        if (item.occurrence === "REGISTRO_REJEITADO") {
          await tx
            .update(bankSlips)
            .set({ status: "REJEITADO", updatedAt: new Date() })
            .where(eq(bankSlips.id, slip.id));
        }
        if (item.occurrence === "LIQUIDACAO" && item.paidAmount && item.paidAt) {
          await this.settleFromBank(tx, enterpriseId, slip.installmentId, {
            amount: item.paidAmount,
            settledAt: item.paidAt,
            slipId: slip.id,
          });
        }
        await tx.insert(bankSlipEvents).values({
          slipId: slip.id,
          kind: "RETORNO",
          summary: item,
        });
      }
      return file;
    });
  }

  public async handleWebhook(provider: string, input: WebhookInput) {
    const port = getBankCollectionPort(provider);
    if (!port) {
      throw new BadRequestError(
        "Adaptador deste banco ainda nao esta configurado",
        "BANK_ADAPTER_MISSING",
      );
    }
    const slip = (
      await db
        .select({
          id: bankSlips.id,
          enterpriseId: bankSlips.enterpriseId,
          installmentId: bankSlips.installmentId,
        })
        .from(bankSlips)
        .innerJoin(
          bankCollectionAgreements,
          eq(bankSlips.agreementId, bankCollectionAgreements.id),
        )
        .where(
          and(
            eq(bankSlips.nossoNumero, input.nossoNumero),
            eq(bankCollectionAgreements.apiProvider, provider),
          ),
        )
        .limit(1)
    )[0];
    if (!slip) throw new NotFoundError("Boleto nao encontrado", "SLIP_NOT_FOUND");
    await db.insert(bankSlipEvents).values({
      slipId: slip.id,
      kind: "WEBHOOK",
      summary: input,
    });
    await db.transaction(async (tx) => {
      await this.settleFromBank(tx, slip.enterpriseId, slip.installmentId, {
        amount: fromCents(toCents(input.paidAmount)),
        settledAt: input.paidAt,
        slipId: slip.id,
      });
    });
    return { slipId: slip.id };
  }

  private async settleFromBank(
    tx: DbTx,
    enterpriseId: string,
    installmentId: string,
    args: { amount: string; settledAt: string; slipId: string },
  ) {
    const already = (
      await tx
        .select({ id: financialSettlements.id })
        .from(financialSettlements)
        .where(
          and(
            eq(financialSettlements.installmentId, installmentId),
            eq(financialSettlements.kind, "BAIXA"),
            eq(financialSettlements.settledAt, args.settledAt),
            eq(financialSettlements.amount, args.amount),
          ),
        )
        .limit(1)
    )[0];
    if (already) return;
    const installment = (
      await tx
        .select()
        .from(financialInstallments)
        .where(eq(financialInstallments.id, installmentId))
        .limit(1)
    )[0];
    if (!installment || installment.status === "CANCELADA") return;
    const amount = Math.min(toCents(args.amount), toCents(installment.openAmount));
    if (amount <= 0) return;
    await tx
      .update(financialInstallments)
      .set({
        openAmount: fromCents(toCents(installment.openAmount) - amount),
        updatedAt: new Date(),
      })
      .where(eq(financialInstallments.id, installment.id));
    await tx.insert(financialSettlements).values({
      enterpriseId,
      titleId: installment.titleId,
      installmentId: installment.id,
      kind: "BAIXA",
      amount: fromCents(amount),
      settledAt: args.settledAt,
      note: "Liquidacao bancaria",
    });
    await tx
      .update(bankSlips)
      .set({ status: "LIQUIDADO", updatedAt: new Date() })
      .where(eq(bankSlips.id, args.slipId));
    await tx.insert(bankSlipEvents).values({
      slipId: args.slipId,
      kind: "LIQUIDACAO",
      summary: { amount: fromCents(amount), settledAt: args.settledAt },
    });
    await refreshTitle(tx, installment.titleId);
  }
}

export const financialService = new FinancialService();
