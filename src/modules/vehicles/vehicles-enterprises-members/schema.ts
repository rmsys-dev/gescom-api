import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

const linkStatusSchema = z.enum(["ATIVO", "INATIVO"]);

export const listVehiclesEnterprisesMembersQuerySchema =
  createPaginationQuerySchema(100).extend({
    vehiclesId: z.string().uuid().optional(),
    enterprisesMembersId: z.string().uuid().optional(),
    status: linkStatusSchema.optional(),
  });

export const createVehiclesEnterprisesMemberSchema = z
  .object({
    vehiclesId: z.string().uuid(),
    enterprisesMembersId: z.string().uuid(),
    status: linkStatusSchema.optional(),
  })
  .strict();

export const patchVehiclesEnterprisesMemberSchema = z
  .object({
    status: linkStatusSchema,
  })
  .strict();

export const vehiclesEnterprisesMemberParamsSchema = z
  .object({
    vehiclesEnterprisesMemberId: z
      .string()
      .uuid("Campo 'vehiclesEnterprisesMemberId' deve ser um UUID valido"),
  })
  .strict();

export type ListVehiclesEnterprisesMembersQuery = z.infer<
  typeof listVehiclesEnterprisesMembersQuerySchema
>;
export type CreateVehiclesEnterprisesMemberInput = z.infer<
  typeof createVehiclesEnterprisesMemberSchema
>;
export type PatchVehiclesEnterprisesMemberInput = z.infer<
  typeof patchVehiclesEnterprisesMemberSchema
>;
