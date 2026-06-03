import bcrypt from "bcrypt";
import { env } from "../../config/env.js";
import {
  normalizeCpf,
  normalizeCpfCnpj,
  normalizeEmail,
} from "../../shared/validation/data-normalizers.js";

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export { normalizeEmail, normalizeCpfCnpj, normalizeCpf };

export type AuthLoginType = "EMAIL" | "CPF/CNPJ";

export type DbLoginType = "EMAIL" | "CPF";

export const toDbLoginType = (loginType: AuthLoginType): DbLoginType =>
  loginType === "EMAIL" ? "EMAIL" : "CPF";

export const normalizeLogin = (
  loginType: AuthLoginType,
  login: string,
): string =>
  loginType === "EMAIL" ? normalizeEmail(login) : normalizeCpfCnpj(login);

export const isEmail = (value: string): boolean =>
  EMAIL_REGEX.test(value.trim());
