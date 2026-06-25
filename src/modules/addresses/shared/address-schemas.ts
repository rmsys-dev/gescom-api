import { z } from "zod";
import { uuidSchema } from "../../../shared/validation/common-schemas.js";

export const taxRateSchema = z
  .union([z.string(), z.number()])
  .transform((val) => {
    const n = typeof val === "number" ? val : Number(String(val).trim().replace(",", "."));
    return n;
  })
  .pipe(
    z
      .number()
      .min(0, "Aliquota deve ser >= 0")
      .max(100, "Aliquota deve ser <= 100")
      .refine(
        (n) => Math.round(n * 100) === n * 100,
        "Aliquota deve ter no maximo 4 casas decimais",
      ),
  )
  .transform((n) => n.toFixed(2));

export const uuidIdSchema = (fieldName: string) =>
  uuidSchema(fieldName);

export const twoLetterCodeSchema = (label: string) =>
  z
    .string()
    .trim()
    .length(2, `${label} deve conter exatamente 2 caracteres`)
    .transform((v) => v.toUpperCase());

export const countryCodeSchema = z
  .string()
  .trim()
  .min(1, "Codigo do pais e obrigatorio")
  .max(4, "Codigo do pais deve ter no maximo 4 caracteres")
  .transform((v) => v.toUpperCase());

export const cepNumberSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(
    z
      .string()
      .length(8, "CEP deve conter exatamente 8 digitos")
      .regex(/^\d{8}$/, "CEP deve conter apenas digitos"),
  );
