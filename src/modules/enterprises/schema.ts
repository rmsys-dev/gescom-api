import { z } from "zod";
import { regimeTributarioEnum } from "../../db/enums.js";
import {
  cpfCnpjSchema,
  createPaginationQuerySchema,
  emailSchema,
  personNameSchema,
  phoneSchema,
  uuidSchema,
} from "../../shared/validation/common-schemas.js";

const registrationSchema = cpfCnpjSchema("registration");

const optionalFiscalText = (
  fieldName: string,
  maxLength: number,
  normalize?: (value: string) => string,
) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return value;
      }
      if (typeof value !== "string") {
        return value;
      }
      const trimmed = value.trim();
      if (trimmed === "") {
        return null;
      }
      return normalize ? normalize(trimmed) : trimmed;
    },
    z
      .string()
      .min(1, `Campo '${fieldName}' deve ter ao menos 1 caractere`)
      .max(
        maxLength,
        `Campo '${fieldName}' deve ter no maximo ${maxLength} caracteres`,
      )
      .nullable()
      .optional(),
  );

export const enterpriseFiscalFields = {
  stateRegistration: optionalFiscalText("stateRegistration", 14, (value) =>
    value.replace(/[^0-9A-Za-z]/g, "").toUpperCase(),
  ),
  municipalRegistration: optionalFiscalText("municipalRegistration", 15),
  suframaRegistration: optionalFiscalText("suframaRegistration", 9, (value) =>
    value.replace(/\D/g, ""),
  ),
  crt: z.enum(regimeTributarioEnum.enumValues).nullable().optional(),
};

//Esquema de criação de empresa
export const createEnterpriseSchema = z
  .object({
    registration: registrationSchema,
    legalName: personNameSchema("legalName"),
    tradeName: personNameSchema("tradeName"),
    phone: phoneSchema("phone").optional(),
    email: emailSchema("email").optional(),
    whatsapp: phoneSchema("whatsapp").optional(),
    ...enterpriseFiscalFields,
  })
  .strict();

//Esquema de alteração de empresa
export const patchEnterpriseSchema = createEnterpriseSchema.partial().refine(
  (data) =>
    data.registration !== undefined ||
    data.legalName !== undefined ||
    data.tradeName !== undefined ||
    data.phone !== undefined ||
    data.email !== undefined ||
    data.whatsapp !== undefined ||
    data.stateRegistration !== undefined ||
    data.municipalRegistration !== undefined ||
    data.suframaRegistration !== undefined ||
    data.crt !== undefined,
  "Informe ao menos um campo para alteracao",
);

//Esquema de parâmetros de empresa
export const enterpriseParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
  })
  .strict();

//Tipo de entrada de criação de empresa
export type CreateEnterpriseInput = z.infer<typeof createEnterpriseSchema>;

//Tipo de entrada de alteração de empresa
export type PatchEnterpriseInput = z.infer<typeof patchEnterpriseSchema>;

//Tipo de parâmetros de empresa
export type EnterpriseParams = z.infer<typeof enterpriseParamsSchema>;

export const listEnterprisesQuerySchema = createPaginationQuerySchema(100);

export type ListEnterprisesQuery = z.infer<typeof listEnterprisesQuerySchema>;
