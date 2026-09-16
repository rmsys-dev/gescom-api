import { ConflictError } from "../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../shared/db/postgres-errors.js";
export const POST_SALES_STATUS_TO_APPLY = [
    "INATIVO",
    "BLOQUEADO",
    "FUNCIONARIO",
];
export const CREDIT_SALE_ALLOWED_MEMBER_STATUSES = [
    "ATIVO",
    "ESPECIAL",
    "FUNCIONARIO",
];
export const SELLER_INELIGIBLE_MEMBER_CLASSES = ["CLIENTE", "FORNECEDOR"];
export const dec = (v) => v !== undefined && v !== null ? v.toString() : null;
export const decNum = (v) => v !== undefined && v !== null && v !== "" ? Number(v) : 0;
export const formatQuantity = (value) => value.toFixed(4);
export const moneyCents = (value) => Math.round(value * 100);
export const roundMoney = (value) => Math.round(value * 100) / 100;
/** Formata percentual 0–100 para numeric(6,2). */
export const decPercentage = (v) => v !== undefined && v !== null ? roundMoney(v).toFixed(2) : null;
export const hasStoredPercentage = (value) => value !== null && value !== undefined && value !== "";
export const computeFinancialFromPercentage = (subTotal, percentage) => roundMoney((subTotal * percentage) / 100);
export const computePercentageFromFinancial = (subTotal, value) => subTotal > 0 ? roundMoney((value / subTotal) * 100) : 0;
/** Chave YYYY-MM-DD (UTC) para comparar vencimentos sem repetir o mesmo dia. */
export const toUtcDateKey = (date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
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
];
export const normalizeSaleMemberOverrides = (input) => {
    if (!input) {
        return {};
    }
    const result = {};
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
export const mergeSaleMemberSnapshot = (base, overrides) => {
    if (!overrides) {
        return { ...base };
    }
    const result = { ...base };
    for (const key of SALE_MEMBER_SNAPSHOT_KEYS) {
        if (overrides[key] !== undefined) {
            result[key] = overrides[key];
        }
    }
    return result;
};
export const formatSaleMemberAddressLine = (street, number) => {
    const parts = [street.trim(), number.trim()].filter((part) => part.length > 0);
    return parts.join(", ");
};
const getPostgresConstraintName = (err) => {
    let current = err;
    for (let depth = 0; depth < 4 && current != null; depth++) {
        if (typeof current === "object" &&
            "constraint_name" in current &&
            typeof current.constraint_name ===
                "string") {
            return current.constraint_name;
        }
        if (typeof current === "object" &&
            "constraint" in current &&
            typeof current.constraint === "string") {
            return current.constraint;
        }
        current =
            typeof current === "object" && current !== null && "cause" in current
                ? current.cause
                : undefined;
    }
    return undefined;
};
export const mapSaleUniqueViolation = (err) => {
    if (!isPostgresUniqueViolation(err))
        return null;
    const constraint = getPostgresConstraintName(err);
    if (constraint === "sales_payments_sales_id_payment_type_id_unique") {
        return new ConflictError("Tipo de pagamento duplicado na mesma venda", "SALE_PAYMENT_TYPE_DUPLICATE");
    }
    if (constraint === "sales_dues_sales_payment_id_due_date_unique") {
        return new ConflictError("Data de vencimento duplicada para o mesmo pagamento", "SALE_DUE_DATE_DUPLICATE");
    }
    return new ConflictError("Venda em conflito (numero do pedido)", "SALE_CONFLICT");
};
export const buildSaleServiceFieldValues = (input) => {
    const patch = {};
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
    }
    else if (input.type === "ORDEM DE SERVICO") {
        patch.modelService = "VEICULO";
    }
    return patch;
};
