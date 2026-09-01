import { sales } from "../../db/schema.js";
import { ConflictError } from "../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../shared/db/postgres-errors.js";
import type { SaleMemberOverrideInput } from "./schema.js";

export type BudgetStatus = "ABERTA" | "PARCIAL" | "FINALIZADA";
export type SaleConversionClosureKind = "PARCIAL" | "TOTAL";

export const POST_SALES_STATUS_TO_APPLY = [
  "INATIVO",
  "BLOQUEADO",
  "FUNCIONARIO",
] as const;

export const CREDIT_SALE_ALLOWED_MEMBER_STATUSES = [
  "ATIVO",
  "ESPECIAL",
  "FUNCIONARIO",
] as const;

export const SELLER_INELIGIBLE_MEMBER_CLASSES = ["CLIENTE", "FORNECEDOR"] as const;

export const dec = (v: number | undefined | null) =>
  v !== undefined && v !== null ? v.toString() : null;

export const decNum = (v: string | number | null | undefined) =>
  v !== undefined && v !== null && v !== "" ? Number(v) : 0;

export const formatQuantity = (value: number) => value.toFixed(4);

export const moneyCents = (value: number) => Math.round(value * 100);

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Formata percentual 0–100 para numeric(6,2). */
export const decPercentage = (v: number | undefined | null) =>
  v !== undefined && v !== null ? roundMoney(v).toFixed(2) : null;

export const hasStoredPercentage = (value: string | null | undefined) =>
  value !== null && value !== undefined && value !== "";

export const computeFinancialFromPercentage = (subTotal: number, percentage: number) =>
  roundMoney((subTotal * percentage) / 100);

export const computePercentageFromFinancial = (subTotal: number, value: number) =>
  subTotal > 0 ? roundMoney((value / subTotal) * 100) : 0;

/** Chave YYYY-MM-DD (UTC) para comparar vencimentos sem repetir o mesmo dia. */
export const toUtcDateKey = (date: Date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export type SaleMemberSnapshot = {
  memberLegalName: string | null;
  memberAddress: string | null;
  memberCep: string | null;
  memberCity: string | null;
  memberState: string | null;
  registration: string | null;
  memberPhone: string | null;
  memberMobile: string | null;
};

export const SALE_MEMBER_SNAPSHOT_KEYS = [
  "memberLegalName",
  "memberAddress",
  "memberCep",
  "memberCity",
  "memberState",
  "registration",
  "memberPhone",
  "memberMobile",
] as const satisfies readonly (keyof SaleMemberSnapshot)[];

export const normalizeSaleMemberOverrides = (
  input?: SaleMemberOverrideInput,
): Partial<SaleMemberSnapshot> => {
  if (!input) {
    return {};
  }

  const result: Partial<SaleMemberSnapshot> = {};

  if (input.memberLegalName !== undefined) {
    result.memberLegalName = input.memberLegalName.trim();
  }
  if (input.memberAddress !== undefined) {
    result.memberAddress = input.memberAddress.trim();
  }
  if (input.memberCep !== undefined) {
    result.memberCep = input.memberCep.trim();
  }
  if (input.memberCity !== undefined) {
    result.memberCity = input.memberCity.trim();
  }
  if (input.memberState !== undefined) {
    result.memberState = input.memberState.trim();
  }
  if (input.registration !== undefined) {
    result.registration = input.registration.trim();
  }
  if (input.memberPhone !== undefined) {
    result.memberPhone = input.memberPhone.trim();
  }
  if (input.memberMobile !== undefined) {
    result.memberMobile = input.memberMobile.trim();
  }

  return result;
};

export const mergeSaleMemberSnapshot = (
  base: SaleMemberSnapshot,
  overrides?: Partial<SaleMemberSnapshot>,
): SaleMemberSnapshot => {
  if (!overrides) {
    return { ...base };
  }

  const result = { ...base };
  for (const key of SALE_MEMBER_SNAPSHOT_KEYS) {
    if (overrides[key] !== undefined) {
      result[key] = overrides[key]!;
    }
  }
  return result;
};

export const formatSaleMemberAddressLine = (street: string, number: string) => {
  const parts = [street.trim(), number.trim()].filter(
    (part) => part.length > 0,
  );
  return parts.join(", ");
};

const getPostgresConstraintName = (err: unknown): string | undefined => {
  let current: unknown = err;
  for (let depth = 0; depth < 4 && current != null; depth++) {
    if (
      typeof current === "object" &&
      "constraint_name" in current &&
      typeof (current as { constraint_name?: unknown }).constraint_name ===
        "string"
    ) {
      return (current as { constraint_name: string }).constraint_name;
    }
    if (
      typeof current === "object" &&
      "constraint" in current &&
      typeof (current as { constraint?: unknown }).constraint === "string"
    ) {
      return (current as { constraint: string }).constraint;
    }
    current =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause: unknown }).cause
        : undefined;
  }
  return undefined;
};

export const mapSaleUniqueViolation = (err: unknown): ConflictError | null => {
  if (!isPostgresUniqueViolation(err)) return null;
  const constraint = getPostgresConstraintName(err);
  if (constraint === "sales_payments_sales_id_payment_type_id_unique") {
    return new ConflictError(
      "Tipo de pagamento duplicado na mesma venda",
      "SALE_PAYMENT_TYPE_DUPLICATE",
    );
  }
  if (constraint === "sales_dues_sales_payment_id_due_date_unique") {
    return new ConflictError(
      "Data de vencimento duplicada para o mesmo pagamento",
      "SALE_DUE_DATE_DUPLICATE",
    );
  }
  return new ConflictError(
    "Venda em conflito (numero do pedido)",
    "SALE_CONFLICT",
  );
};

export type SaleServiceFieldInput = {
  vehicleMileage?: number;
  observations?: string;
  defect?: string;
  serviceType?: "SERVICO" | "GARANTIA";
  modelService?: "VEICULO";
  type?: string;
};

export const buildSaleServiceFieldValues = (
  input: SaleServiceFieldInput,
): Partial<typeof sales.$inferInsert> => {
  const patch: Partial<typeof sales.$inferInsert> = {};
  if (input.vehicleMileage !== undefined) {
    patch.vehicleMileage = input.vehicleMileage;
  }
  if (input.observations !== undefined) {
    patch.observations = input.observations.trim();
  }
  if (input.defect !== undefined) {
    patch.defect = input.defect.trim();
  }
  if (input.type === "ORDEM DE SERVICO" && input.serviceType !== undefined) {
    patch.serviceType = input.serviceType;
  }
  if (input.modelService !== undefined) {
    patch.modelService = input.modelService;
  } else if (input.type === "ORDEM DE SERVICO") {
    patch.modelService = "VEICULO";
  }
  return patch;
};
