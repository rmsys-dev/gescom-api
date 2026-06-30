import { z } from "zod";
import { enterpriseParamsSchema } from "../enterprises/schema.js";
import {
  createPaginationQuerySchema,
  cpfCnpjSchema,
  emailSchema,
  personNameSchema,
  phoneSchema,
  uuidSchema,
} from "../../shared/validation/common-schemas.js";

const registrationSchema = cpfCnpjSchema("userRegistration");

//Parâmetros de rota para coleção `.../enterprises/:enterpriseId/users` (inclui `enterpriseId` do segmento pai).
export const usersEnterpriseParamsSchema = enterpriseParamsSchema;

//Parâmetros de rota para coleção `.../enterprises/:enterpriseId/users/:userId` (inclui `enterpriseId` do segmento pai).
export const userEnterpriseAndIdParamsSchema = enterpriseParamsSchema
  .extend({
    userId: uuidSchema("userId"),
  })
  .strict();

//Parâmetros de rota para coleção `.../users/:userId` (inclui `enterpriseId` do segmento pai).
export const userParamsSchema = z
  .object({
    userId: uuidSchema("userId"),
  })
  .strict();

//Corpo de requisição para criação de usuário
export const createUserBodySchema = z
  .object({
    userName: personNameSchema("userName"),
    userRegistration: registrationSchema.optional(),
    userEmail: emailSchema("userEmail").optional(),
    userPhone: phoneSchema("userPhone").optional(),
  })
  .strict();

//Parâmetros de query para listagem de usuários
export const listUsersQuerySchema = createPaginationQuerySchema(100)
  .extend({
    registration: registrationSchema.optional(),
    email: emailSchema("email").optional(),
    phone: phoneSchema("phone").optional(),
  })
  .strict();

//Corpo de requisição para atualização parcial de usuário
const patchUserFieldsSchema = z
  .object({
    userName: personNameSchema("userName").optional(),
    userRegistration: registrationSchema.optional().nullable(),
    userEmail: emailSchema("userEmail").optional().nullable(),
    userPhone: phoneSchema("userPhone").optional().nullable(),
  })
  .strict();

export const patchUserBodySchema = patchUserFieldsSchema.refine(
  (b) =>
    b.userName !== undefined ||
    b.userRegistration !== undefined ||
    b.userEmail !== undefined ||
    b.userPhone !== undefined,
  "Informe ao menos um campo para alteracao",
);

export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UserParams = z.infer<typeof userParamsSchema>;
export type UsersEnterpriseParams = z.infer<typeof usersEnterpriseParamsSchema>;
export type UserEnterpriseAndIdParams = z.infer<
  typeof userEnterpriseAndIdParamsSchema
>;
export type PatchUserBody = z.infer<typeof patchUserBodySchema>;
