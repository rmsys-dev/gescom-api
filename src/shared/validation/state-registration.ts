import { BadRequestError } from "../errors/app-error.js";

const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
  "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

export type StateRegistrationUf = (typeof UFS)[number];

const PREFIX: Partial<Record<StateRegistrationUf, string[]>> = {
  AC: ["01"],
  AL: ["24"],
  AP: ["03"],
  DF: ["07"],
  GO: ["10", "11", "15"],
  MA: ["12"],
  MS: ["28"],
  PA: ["15"],
  RN: ["20"],
  RR: ["24"],
};

const sumWeights = (value: string, weights: number[]) =>
  weights.reduce((total, weight, index) => total + weight * Number(value[index]), 0);

const digitMod11 = (sum: number) => {
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

const matchesMod11 = (value: string, weights: number[]) => {
  const body = value.slice(0, weights.length);
  return value[weights.length] === String(digitMod11(sumWeights(body, weights)));
};

const twoCheckDigits = (value: string, first: number[], second: number[]) => {
  const firstDigit = digitMod11(sumWeights(value.slice(0, first.length), first));
  if (value[first.length] !== String(firstDigit)) {
    return false;
  }
  const secondDigit = digitMod11(sumWeights(value.slice(0, second.length), second));
  return value[second.length] === String(secondDigit);
};

const bahiaDigit = (base: string, weights: number[], modulo: number) => {
  const rest = sumWeights(base, weights) % modulo;
  if (modulo === 10) {
    return rest === 0 ? 0 : modulo - rest;
  }
  return rest < 2 ? 0 : modulo - rest;
};

const checkBahia = (value: string) => {
  if (value.length !== 8 && value.length !== 9) {
    return false;
  }
  const typeDigit = value[value.length === 8 ? 0 : 1] ?? "";
  const modulo = "0123458".includes(typeDigit) ? 10 : 11;
  const bodyLength = value.length - 2;
  const secondWeights = value.length === 8
    ? [7, 6, 5, 4, 3, 2]
    : [8, 7, 6, 5, 4, 3, 2];
  const firstWeights = value.length === 8
    ? [8, 7, 6, 5, 4, 3, 2]
    : [9, 8, 7, 6, 5, 4, 3, 2];
  const second = bahiaDigit(value.slice(0, bodyLength), secondWeights, modulo);
  const first = bahiaDigit(`${value.slice(0, bodyLength)}${second}`, firstWeights, modulo);
  return value === `${value.slice(0, bodyLength)}${second}${first}`;
};

const checkAmapa = (value: string) => {
  const base = Number(value.slice(0, 8));
  let extra = 0;
  let fallback = 0;
  if (base >= 3000001 && base <= 3017000) {
    extra = 5;
  } else if (base >= 3017001 && base <= 3019022) {
    extra = 9;
    fallback = 1;
  }
  const rest = (sumWeights(value.slice(0, 8), [9, 8, 7, 6, 5, 4, 3, 2]) + extra) % 11;
  let digit = 11 - rest;
  if (digit === 10) {
    digit = 0;
  } else if (digit === 11) {
    digit = fallback;
  }
  return value[8] === String(digit);
};

const checkGoias = (value: string) => {
  const rest = sumWeights(value.slice(0, 8), [9, 8, 7, 6, 5, 4, 3, 2]) % 11;
  const base = Number(value.slice(0, 8));
  const digit = rest === 0
    ? 0
    : rest === 1
      ? base >= 10103105 && base <= 10119997 ? 1 : 0
      : 11 - rest;
  return value[8] === String(digit);
};

const checkMinas = (value: string) => {
  const body = value.slice(0, 11);
  const expanded = `${body.slice(0, 3)}0${body.slice(3)}`;
  const total = [...expanded].reduce((sum, char, index) => {
    const product = Number(char) * (index % 2 === 0 ? 1 : 2);
    return sum + Math.floor(product / 10) + (product % 10);
  }, 0);
  const rest = total % 10;
  const first = rest === 0 ? 0 : 10 - rest;
  if (value[11] !== String(first)) {
    return false;
  }
  const second = digitMod11(
    sumWeights(`${body}${first}`, [3, 2, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]),
  );
  return value[12] === String(second);
};

const checkSaoPaulo = (value: string) => {
  const first = sumWeights(value.slice(0, 8), [1, 3, 4, 5, 6, 7, 8, 10]) % 11 % 10;
  if (value[8] !== String(first)) {
    return false;
  }
  const second = sumWeights(value.slice(0, 11), [3, 2, 10, 9, 8, 7, 6, 5, 4, 3, 2]) % 11 % 10;
  return value[11] === String(second);
};

const checkSaoPauloRural = (value: string) => {
  const digits = value.slice(1);
  if (!value.startsWith("P") || digits.length !== 12) {
    return false;
  }
  const digit = sumWeights(digits.slice(0, 8), [1, 3, 4, 5, 6, 7, 8, 10]) % 11 % 10;
  return digits[8] === String(digit);
};

const checkTocantins = (value: string) => {
  const significant = value.length === 11
    ? `${value.slice(0, 2)}${value.slice(4, 10)}`
    : value.slice(0, 8);
  return value.at(-1) === String(digitMod11(sumWeights(significant, [9, 8, 7, 6, 5, 4, 3, 2])));
};

const multipliedDigit = (value: string, weights: number[]) => {
  const digit = (sumWeights(value.slice(0, weights.length), weights) * 10) % 11;
  return value[weights.length] === String(digit === 10 ? 0 : digit);
};

const checkByUf = (uf: StateRegistrationUf, value: string) => {
  switch (uf) {
    case "AC":
      return value.length === 13 && twoCheckDigits(
        value,
        [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
        [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
      );
    case "AL":
      return value.length === 9 && multipliedDigit(value, [9, 8, 7, 6, 5, 4, 3, 2]);
    case "AM":
      return value.length === 9 && matchesMod11(value, [9, 8, 7, 6, 5, 4, 3, 2]);
    case "AP":
      return value.length === 9 && checkAmapa(value);
    case "BA":
      return checkBahia(value);
    case "CE":
    case "ES":
    case "MA":
    case "PA":
    case "PB":
    case "PI":
    case "SC":
    case "SE":
      return value.length === 9 && matchesMod11(value, [9, 8, 7, 6, 5, 4, 3, 2]);
    case "DF":
      return value.length === 13 && twoCheckDigits(
        value,
        [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
        [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
      );
    case "GO":
      return value.length === 9 && checkGoias(value);
    case "MG":
      return value.length === 13 && checkMinas(value);
    case "MS":
      return value.length === 9 && matchesMod11(value, [9, 8, 7, 6, 5, 4, 3, 2]);
    case "MT":
      return (value.length === 9 || value.length === 11)
        && matchesMod11(value.length === 9 ? `00${value}` : value, [3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    case "PE":
      return value.length === 9 && twoCheckDigits(
        value,
        [8, 7, 6, 5, 4, 3, 2],
        [9, 8, 7, 6, 5, 4, 3, 2],
      );
    case "PR":
      return value.length === 10 && twoCheckDigits(
        value,
        [3, 2, 7, 6, 5, 4, 3, 2],
        [4, 3, 2, 7, 6, 5, 4, 3, 2],
      );
    case "RJ":
      return value.length === 8 && matchesMod11(value, [2, 7, 6, 5, 4, 3, 2]);
    case "RN":
      return (value.length === 9 || value.length === 10)
        && multipliedDigit(
          value,
          value.length === 9
            ? [9, 8, 7, 6, 5, 4, 3, 2]
            : [10, 9, 8, 7, 6, 5, 4, 3, 2],
        );
    case "RO":
      return value.length === 14 && matchesMod11(
        value,
        [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
      );
    case "RR":
      return value.length === 9
        && value[8] === String(sumWeights(value.slice(0, 8), [1, 2, 3, 4, 5, 6, 7, 8]) % 9);
    case "RS":
      return value.length === 10 && matchesMod11(value, [2, 9, 8, 7, 6, 5, 4, 3, 2]);
    case "SP":
      return value.startsWith("P") ? checkSaoPauloRural(value) : value.length === 12 && checkSaoPaulo(value);
    case "TO":
      return (value.length === 9 || value.length === 11) && checkTocantins(value);
    default:
      return false;
  }
};

export const isStateRegistrationUf = (value: string): value is StateRegistrationUf =>
  (UFS as readonly string[]).includes(value);

export const isExemptStateRegistration = (value: string | null | undefined) =>
  (value ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase().startsWith("ISENT");

const normalize = (uf: StateRegistrationUf, value: string) => {
  const compact = value.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  if (uf === "SP" && compact.startsWith("P")) {
    return `P${compact.slice(1).replace(/\D/g, "")}`;
  }
  return compact.replace(/\D/g, "");
};

export type StateRegistrationCheck =
  | { ok: true; normalized: string | null; exempt: boolean }
  | { ok: false; message: string };

export const checkStateRegistration = (
  uf: string,
  value: string | null | undefined,
  options?: { allowExempt?: boolean },
): StateRegistrationCheck => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { ok: true, normalized: null, exempt: false };
  }

  const state = uf.trim().toUpperCase();
  if (!isStateRegistrationUf(state)) {
    return { ok: false, message: "UF inválida para validar a inscrição estadual." };
  }

  if (isExemptStateRegistration(trimmed)) {
    if (options?.allowExempt) {
      return { ok: true, normalized: "ISENTO", exempt: true };
    }
    return {
      ok: false,
      message: "A inscrição estadual não pode ser ISENTO neste cadastro.",
    };
  }

  const normalized = normalize(state, trimmed);
  const prefix = PREFIX[state];
  const prefixOk = !prefix || prefix.some((item) => normalized.startsWith(item));
  if (!prefixOk || /^0+$/.test(normalized) || !checkByUf(state, normalized)) {
    return {
      ok: false,
      message: `Inscrição estadual inválida para ${state}.`,
    };
  }

  return { ok: true, normalized, exempt: false };
};

export const requireStateRegistration = (
  uf: string,
  value: string | null | undefined,
  options?: { allowExempt?: boolean; code?: string },
): string | null => {
  const result = checkStateRegistration(uf, value, options);
  if (!result.ok) {
    throw new BadRequestError(result.message, options?.code ?? "STATE_REGISTRATION_INVALID");
  }
  return result.normalized;
};
