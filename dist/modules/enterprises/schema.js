import { z } from "zod";
import { cpfCnpjSchema, createPaginationQuerySchema, emailSchema, personNameSchema, phoneSchema, uuidSchema, } from "../../shared/validation/common-schemas.js";
const registrationSchema = cpfCnpjSchema("registration");
//Esquema de criação de empresa
export const createEnterpriseSchema = z
    .object({
    registration: registrationSchema,
    legalName: personNameSchema("legalName"),
    tradeName: personNameSchema("tradeName"),
    phone: phoneSchema("phone").optional(),
    email: emailSchema("email").optional(),
    whatsapp: phoneSchema("whatsapp").optional(),
})
    .strict();
//Esquema de alteração de empresa
export const patchEnterpriseSchema = createEnterpriseSchema.partial().refine((data) => data.registration !== undefined ||
    data.legalName !== undefined ||
    data.tradeName !== undefined ||
    data.phone !== undefined ||
    data.email !== undefined ||
    data.whatsapp !== undefined, "Informe ao menos um campo para alteracao");
//Esquema de parâmetros de empresa
export const enterpriseParamsSchema = z
    .object({
    enterpriseId: uuidSchema("enterpriseId"),
})
    .strict();
export const listEnterprisesQuerySchema = createPaginationQuerySchema(100);
