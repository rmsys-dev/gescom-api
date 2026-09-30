import { z } from "zod";
import { uuidSchema } from "../../../shared/validation/common-schemas.js";

export const nfeOperationIdParamsSchema = z
  .object({ operationId: uuidSchema("operationId") })
  .strict();

export const nfeOperationStateIdParamsSchema = z
  .object({ operationStateId: uuidSchema("operationStateId") })
  .strict();

const operationFields = {
  description: z.string().trim().min(1),
  classificationIbsCbsId: uuidSchema("classificationIbsCbsId"),
  presumedCreditId: uuidSchema("presumedCreditId").nullish(),
  status: z.boolean().default(true),
  suframa: z.boolean().default(false),
  priority: z.boolean().default(false),
  onerous: z.boolean().default(false),
  tributada: z.boolean().default(false),
};

export const createNfeOperationSchema = z.object(operationFields).strict();

export const patchNfeOperationSchema = z
  .object({
    description: operationFields.description.optional(),
    classificationIbsCbsId: operationFields.classificationIbsCbsId.optional(),
    presumedCreditId: operationFields.presumedCreditId,
    status: z.boolean().optional(),
    suframa: z.boolean().optional(),
    priority: z.boolean().optional(),
    onerous: z.boolean().optional(),
    tributada: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Deve haver ao menos um campo para atualizar",
  });

const operationStateFields = {
  stateId: uuidSchema("stateId"),
  nfeOperationsId: uuidSchema("nfeOperationsId"),
  cfopEnterprisesId: uuidSchema("cfopEnterprisesId"),
  icmsTaxationId: uuidSchema("icmsTaxationId"),
};

export const createNfeOperationStateSchema = z.object(operationStateFields).strict();

export const patchNfeOperationStateSchema = z
  .object({
    stateId: operationStateFields.stateId.optional(),
    nfeOperationsId: operationStateFields.nfeOperationsId.optional(),
    cfopEnterprisesId: operationStateFields.cfopEnterprisesId.optional(),
    icmsTaxationId: operationStateFields.icmsTaxationId.optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Deve haver ao menos um campo para atualizar",
  });

export type CreateNfeOperationInput = z.infer<typeof createNfeOperationSchema>;
export type PatchNfeOperationInput = z.infer<typeof patchNfeOperationSchema>;
export type CreateNfeOperationStateInput = z.infer<typeof createNfeOperationStateSchema>;
export type PatchNfeOperationStateInput = z.infer<typeof patchNfeOperationStateSchema>;
