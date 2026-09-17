import { z } from "zod";
import {
  isValidCalendarDateIso,
  isValidCpfCnpj,
  isValidPhoneE164,
  normalizeCpfCnpj,
  normalizeEmail,
  normalizePhone,
  normalizeTrimmedText,
} from "./data-normalizers.js";

export const emptyBodySchema = z.object({}).strict();
export const emptyQuerySchema = z.object({}).strict();

export const uuidSchema = (fieldName: string) =>
  z.string().uuid(`Campo '${fieldName}' deve ser um UUID valido`);

export const emailSchema = (fieldName = "email") =>
  z
    .string()
    .trim()
    .transform((value) => normalizeEmail(value))
    .pipe(
      z
        .string()
        .min(5, `Campo '${fieldName}' deve ter ao menos 5 caracteres`)
        .max(255, `Campo '${fieldName}' deve ter no maximo 255 caracteres`)
        .email(`Campo '${fieldName}' deve ser um e-mail valido`),
    );

export const phoneSchema = (fieldName = "telefone") =>
  z
    .string()
    .trim()
    .transform((value) => normalizePhone(value))
    .pipe(
      z
        .string()
        .min(12, `Campo '${fieldName}' deve estar no formato E.164 valido`)
        .max(16, `Campo '${fieldName}' deve ter no maximo 16 caracteres`)
        .refine(
          (value) => isValidPhoneE164(value),
          `Campo '${fieldName}' deve estar no formato E.164 valido (ex.: +5511999999999)`,
        ),
    );

export const cpfCnpjSchema = (fieldName: string) =>
  z
    .string()
    .trim()
    .transform((value) => normalizeCpfCnpj(value))
    .pipe(
      z
        .string()
        .refine(
          (value) => value.length === 11 || value.length === 14,
          `Campo '${fieldName}' deve conter 11 digitos (CPF) ou 14 digitos (CNPJ)`,
        )
        .refine(
          (value) => isValidCpfCnpj(value),
          `Campo '${fieldName}' possui digitos verificadores invalidos`,
        ),
    );

export const dateOnlyIsoSchema = (fieldName = "data") =>
  z
    .string()
    .trim()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      `Campo '${fieldName}' deve estar no formato ISO 8601 (YYYY-MM-DD)`,
    )
    .refine(
      (value) => isValidCalendarDateIso(value),
      `Campo '${fieldName}' nao representa uma data valida`,
    );

export const trimmedTextSchema = (
  fieldName: string,
  minLength: number,
  maxLength: number,
) =>
  z
    .string()
    .trim()
    .transform((value) => normalizeTrimmedText(value))
    .pipe(
      z
        .string()
        .min(
          minLength,
          `Campo '${fieldName}' deve ter ao menos ${minLength} caracteres`,
        )
        .max(
          maxLength,
          `Campo '${fieldName}' deve ter no maximo ${maxLength} caracteres`,
        ),
    );

export const personNameSchema = (fieldName: string) =>
  trimmedTextSchema(fieldName, 2, 255);

export const nonEmptyText255Schema = (fieldName = "texto") =>
  trimmedTextSchema(fieldName, 1, 255);

export const createPaginationQuerySchema = (maxLimit = 100) =>
  z
    .object({
      limit: z.coerce.number().int().min(1).max(maxLimit).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    })
    .strict();

export const optionalTrimmedStringSchema = (
  fieldName: string,
  maxLength: number,
) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z
      .string()
      .max(
        maxLength,
        `Campo '${fieldName}' deve ter no maximo ${maxLength} caracteres`,
      )
      .optional(),
  );
