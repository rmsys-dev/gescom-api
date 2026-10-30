import {
  normalizeCpfCnpj,
  normalizeEmail,
  normalizePhone,
} from "../validation/data-normalizers.js";

function toNullableNormalized(
  value: string | null | undefined,
  normalize: (v: string) => string,
): string | null {
  if (value == null || value === "") {
    return null;
  }
  return normalize(value);
}

export function normalizeUserRegistration(
  value: string | null | undefined,
): string | null {
  return toNullableNormalized(value, normalizeCpfCnpj);
}

export function normalizeUserEmail(
  value: string | null | undefined,
): string | null {
  return toNullableNormalized(value, normalizeEmail);
}

export function normalizeUserPhone(
  value: string | null | undefined,
): string | null {
  return toNullableNormalized(value, normalizePhone);
}

export function resolveUserContactField(
  bodyValue: string | null | undefined,
  existing: string | null,
  normalize: (value: string | null | undefined) => string | null,
): string | null {
  if (bodyValue === undefined) {
    return existing;
  }
  return normalize(bodyValue);
}

export function normalizeUserContactInput(input: {
  userRegistration?: string;
  userEmail?: string;
  userPhone?: string;
}): {
  userRegistration: string | null;
  userEmail: string | null;
  userPhone: string | null;
} {
  return {
    userRegistration: normalizeUserRegistration(input.userRegistration),
    userEmail: normalizeUserEmail(input.userEmail),
    userPhone: normalizeUserPhone(input.userPhone),
  };
}
