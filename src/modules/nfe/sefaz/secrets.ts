import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../../../config/env.js";
import { InternalServerError } from "../../../shared/errors/app-error.js";

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const secretsKey = (): Buffer =>
  createHash("sha256").update(env.NFE_SECRETS_KEY, "utf8").digest();

export const encryptSecret = (plain: string): string => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", secretsKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
};

export const decryptSecret = (payload: string): string => {
  const parts = payload.split(".");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new InternalServerError(
      "Segredo fiscal armazenado em formato invalido",
      "NFE_SECRET_INVALID",
    );
  }
  try {
    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const encrypted = Buffer.from(parts[2], "base64");
    if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
      throw new Error("invalid iv/tag");
    }
    const decipher = createDecipheriv("aes-256-gcm", secretsKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (error instanceof InternalServerError) {
      throw error;
    }
    throw new InternalServerError(
      "Nao foi possivel abrir o segredo fiscal armazenado",
      "NFE_SECRET_INVALID",
    );
  }
};
