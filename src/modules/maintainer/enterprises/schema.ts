import { z } from "zod";
import {
  cpfCnpjSchema,
  emailSchema,
  personNameSchema,
  phoneSchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";

const registrationSchema = cpfCnpjSchema("registration");

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

export const enterpriseParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
  })
  .strict();

export type CreateEnterpriseInput = z.infer<typeof createEnterpriseSchema>;
