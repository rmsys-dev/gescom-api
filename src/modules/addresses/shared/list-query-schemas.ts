import { z } from "zod";
import { uuidSchema } from "../../../shared/validation/common-schemas.js";

export const uuidQuerySchema = (fieldName: string) => uuidSchema(fieldName);

export const cepNumberQuerySchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .pipe(
    z
      .string()
      .length(8, "CEP deve conter exatamente 8 digitos")
      .regex(/^\d{8}$/, "CEP deve conter apenas digitos"),
  );
