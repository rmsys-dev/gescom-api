const DEFAULT_BRAZIL_COUNTRY_CODE = "55";

const E164_REGEX = /^\+[1-9]\d{9,14}$/;
const BRAZIL_E164_REGEX = /^\+55\d{10,11}$/;

export const stripNonDigits = (value: string): string =>
  value.replace(/\D/g, "");

export const isValidCpf = (digits: string): boolean => {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index);
  }

  let remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }
  if (remainder !== Number(digits[9])) {
    return false;
  }

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }

  return remainder === Number(digits[10]);
};

export const isValidCnpj = (digits: string): boolean => {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) {
    return false;
  }

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calculateDigit = (base: string, weights: number[]): number => {
    const sum = base
      .split("")
      .reduce(
        (accumulator, digit, index) =>
          accumulator + Number(digit) * weights[index]!,
        0,
      );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateDigit(digits.slice(0, 12), firstWeights);
  if (firstDigit !== Number(digits[12])) {
    return false;
  }

  const secondDigit = calculateDigit(digits.slice(0, 13), secondWeights);
  return secondDigit === Number(digits[13]);
};

export const isValidCpfCnpj = (digits: string): boolean => {
  if (digits.length === 11) {
    return isValidCpf(digits);
  }

  if (digits.length === 14) {
    return isValidCnpj(digits);
  }

  return false;
};

export const normalizeCpfCnpj = (value: string): string =>
  stripNonDigits(value);

/** @deprecated Prefira `normalizeCpfCnpj`. */
export const normalizeCpf = normalizeCpfCnpj;

export const normalizeEmail = (value: string): string =>
  value.trim().toLowerCase();

export const normalizePhone = (
  value: string,
  defaultCountryCode = DEFAULT_BRAZIL_COUNTRY_CODE,
): string => {
  const trimmed = value.trim();
  const digits = stripNonDigits(trimmed);

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.startsWith(defaultCountryCode) && digits.length >= 12) {
    return `+${digits}`;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `+${defaultCountryCode}${digits}`;
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  return `+${digits}`;
};

export const isValidPhoneE164 = (value: string): boolean => {
  if (!E164_REGEX.test(value)) {
    return false;
  }

  if (value.startsWith("+55")) {
    return BRAZIL_E164_REGEX.test(value);
  }

  return true;
};

export const isValidCalendarDateIso = (isoDate: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(`${isoDate}T00:00:00.000Z`);

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
};

/** Converte `YYYY-MM-DD` para `Date` em UTC (meia-noite). */
export const parseIsoDateOnly = (isoDate: string): Date =>
  new Date(`${isoDate}T00:00:00.000Z`);

/** Serializa `Date` date-only para `YYYY-MM-DD` em UTC. */
export const formatIsoDateOnly = (date: Date): string =>
  date.toISOString().slice(0, 10);

export const normalizeTrimmedText = (value: string): string => value.trim();

export const normalizeUppercaseCode = (value: string): string =>
  value.trim().toUpperCase();
