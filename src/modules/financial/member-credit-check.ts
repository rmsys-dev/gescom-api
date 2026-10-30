import { AppError } from "../../shared/errors/app-error.js";
import { fromCents, toCents } from "./money.js";

export type MemberCreditType = "MENSAL" | "GERAL";

export type MemberCreditCheck =
  | { applies: false }
  | {
      applies: true;
      creditType: MemberCreditType;
      creditLimit: string;
      debtorBalance: string;
      saleTotal: string;
      exposure: string;
      allowed: boolean;
    };

/** Primeiro dia do mês de `day` (`YYYY-MM-DD`). */
export const monthStartDateOnly = (day: string): string => `${day.slice(0, 7)}-01`;

/** Último dia do mês de `day` (`YYYY-MM-DD`). */
export const monthEndDateOnly = (day: string): string => {
  const [yearRaw, monthRaw] = day.slice(0, 10).split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const end = new Date(Date.UTC(year, month, 0));
  const y = end.getUTCFullYear();
  const m = String(end.getUTCMonth() + 1).padStart(2, "0");
  const d = String(end.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const dateOnlyKey = (value: Date | string): string => {
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
};

/** Parcela que vence no mesmo mês da venda. Mês anterior e mês seguinte ficam de fora. */
export const dueDateInSaleMonth = (dueDate: Date | string, saleDate: string): boolean =>
  dateOnlyKey(dueDate).slice(0, 7) === saleDate.slice(0, 7);

export const buildMemberCreditCheck = (input: {
  creditLimit: string | number | null | undefined;
  creditType: MemberCreditType | null | undefined;
  debtorBalanceCents: number;
  saleTotal: string | number | null | undefined;
}): MemberCreditCheck => {
  const limitCents = toCents(input.creditLimit);
  if (limitCents <= 0) return { applies: false };

  const creditType: MemberCreditType =
    input.creditType === "MENSAL" ? "MENSAL" : "GERAL";
  const saleCents = toCents(input.saleTotal);
  const exposureCents = input.debtorBalanceCents + saleCents;

  return {
    applies: true,
    creditType,
    creditLimit: fromCents(limitCents),
    debtorBalance: fromCents(input.debtorBalanceCents),
    saleTotal: fromCents(saleCents),
    exposure: fromCents(exposureCents),
    allowed: exposureCents <= limitCents,
  };
};

const moneyPt = (value: string) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const rejectIfCreditExceeded = (check: MemberCreditCheck): void => {
  if (!check.applies || check.allowed) return;

  const tipo = check.creditType === "MENSAL" ? "mensal" : "geral";
  throw new AppError({
    statusCode: 422,
    code: "CREDIT_LIMIT_EXCEEDED",
    message:
      `Limite de crédito ${tipo} excedido. ` +
      `Limite: ${moneyPt(check.creditLimit)}. ` +
      `Débito atual: ${moneyPt(check.debtorBalance)}. ` +
      `Valor da venda: ${moneyPt(check.saleTotal)}. ` +
      `Total: ${moneyPt(check.exposure)}.`,
    details: [
      { path: "tipoCredito", message: check.creditType === "MENSAL" ? "Mensal" : "Geral" },
      { path: "limite", message: check.creditLimit },
      { path: "debitoAtual", message: check.debtorBalance },
      { path: "valorVenda", message: check.saleTotal },
      { path: "total", message: check.exposure },
    ],
  });
};
