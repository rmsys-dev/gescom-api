import { z } from "zod";
import {
  emptyQuerySchema,
  personNameSchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";

const groupStatusSchema = z.enum(["ATIVO", "INATIVO"], {
  message: "Campo 'status' deve ser ATIVO ou INATIVO",
});

export const createEnterpriseGroupSchema = z
  .object({
    name: personNameSchema("name"),
  })
  .strict();

export const patchEnterpriseGroupSchema = z
  .object({
    name: personNameSchema("name").optional(),
    status: groupStatusSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const enterpriseGroupParamsSchema = z
  .object({
    groupId: uuidSchema("groupId"),
  })
  .strict();

export const setEnterpriseGroupSchema = z
  .object({
    groupId: uuidSchema("groupId").nullable(),
  })
  .strict();

export const listEnterpriseGroupsQuerySchema = emptyQuerySchema;

export type CreateEnterpriseGroupInput = z.infer<typeof createEnterpriseGroupSchema>;
export type PatchEnterpriseGroupInput = z.infer<typeof patchEnterpriseGroupSchema>;
export type SetEnterpriseGroupInput = z.infer<typeof setEnterpriseGroupSchema>;
