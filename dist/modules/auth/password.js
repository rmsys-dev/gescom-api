import bcrypt from "bcrypt";
import { env } from "../../config/env.js";
import { normalizeCpf, normalizeCpfCnpj, normalizeEmail, } from "../../shared/validation/data-normalizers.js";
export const hashPassword = async (password) => {
    return bcrypt.hash(password, env.BCRYPT_ROUNDS);
};
export const verifyPassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export { normalizeEmail, normalizeCpfCnpj, normalizeCpf };
export const toDbLoginType = (loginType) => loginType === "EMAIL" ? "EMAIL" : "CPF";
export const normalizeLogin = (loginType, login) => loginType === "EMAIL" ? normalizeEmail(login) : normalizeCpfCnpj(login);
export const isEmail = (value) => EMAIL_REGEX.test(value.trim());
