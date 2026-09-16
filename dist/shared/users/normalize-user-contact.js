import { normalizeCpfCnpj, normalizeEmail, normalizePhone, } from "../validation/data-normalizers.js";
function toNullableNormalized(value, normalize) {
    if (value == null || value === "") {
        return null;
    }
    return normalize(value);
}
export function normalizeUserRegistration(value) {
    return toNullableNormalized(value, normalizeCpfCnpj);
}
export function normalizeUserEmail(value) {
    return toNullableNormalized(value, normalizeEmail);
}
export function normalizeUserPhone(value) {
    return toNullableNormalized(value, normalizePhone);
}
export function resolveUserContactField(bodyValue, existing, normalize) {
    if (bodyValue === undefined) {
        return existing;
    }
    return normalize(bodyValue);
}
export function normalizeUserContactInput(input) {
    return {
        userRegistration: normalizeUserRegistration(input.userRegistration),
        userEmail: normalizeUserEmail(input.userEmail),
        userPhone: normalizeUserPhone(input.userPhone),
    };
}
