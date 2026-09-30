import { z } from "zod";
import {
  createPaginationQuerySchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";

const cfop = z
  .string()
  .trim()
  .regex(/^[0-9]{4}$/, "cfop deve ter 4 digitos");

const cst = z
  .string()
  .trim()
  .regex(/^[0-9]{2}$/, "cst deve ter 2 digitos (sem a origem)");

const benefitCodeId = uuidSchema("benefitCodeId");

const reductionPercentage = z.number().min(0).max(100);

const atLeastOneField = (data: Record<string, unknown>) =>
  Object.values(data).some((value) => value !== undefined);

export const benefitCfopIdParamsSchema = z
  .object({ benefitCfopId: uuidSchema("benefitCfopId") })
  .strict();

export const listBenefitsCfopQuerySchema = createPaginationQuerySchema(100)
  .extend({
    cfop: cfop.optional(),
    cst: cst.optional(),
    benefitCodeId: benefitCodeId.optional(),
  })
  .strict();

export const createBenefitCfopSchema = z
  .object({
    cfop,
    cst,
    benefitCodeId,
    reductionPercentage: reductionPercentage.nullable().optional(),
  })
  .strict();

export const patchBenefitCfopSchema = z
  .object({
    cfop: cfop.optional(),
    cst: cst.optional(),
    benefitCodeId: benefitCodeId.optional(),
    reductionPercentage: reductionPercentage.nullable().optional(),
  })
  .strict()
  .refine(atLeastOneField, {
    message: "Deve haver ao menos um campo para atualizar",
  });

export const benefitCustomerTypeIdParamsSchema = z
  .object({ benefitCustomerTypeId: uuidSchema("benefitCustomerTypeId") })
  .strict();

export const listBenefitsCustomerTypeQuerySchema = createPaginationQuerySchema(100)
  .extend({
    typeSupplierCustomerId: uuidSchema("typeSupplierCustomerId").optional(),
    cfop: cfop.optional(),
    cst: cst.optional(),
    benefitCodeId: benefitCodeId.optional(),
  })
  .strict();

export const createBenefitCustomerTypeSchema = z
  .object({
    typeSupplierCustomerId: uuidSchema("typeSupplierCustomerId"),
    cfop,
    cst,
    benefitCodeId,
    reductionPercentage: reductionPercentage.nullable().optional(),
  })
  .strict();

export const patchBenefitCustomerTypeSchema = z
  .object({
    typeSupplierCustomerId: uuidSchema("typeSupplierCustomerId").optional(),
    cfop: cfop.optional(),
    cst: cst.optional(),
    benefitCodeId: benefitCodeId.optional(),
    reductionPercentage: reductionPercentage.nullable().optional(),
  })
  .strict()
  .refine(atLeastOneField, {
    message: "Deve haver ao menos um campo para atualizar",
  });

export const benefitStateProductIdParamsSchema = z
  .object({ benefitStateProductId: uuidSchema("benefitStateProductId") })
  .strict();

export const listBenefitsStateProductQuerySchema = createPaginationQuerySchema(100)
  .extend({
    stateId: uuidSchema("stateId").optional(),
    productsEnterprisesId: uuidSchema("productsEnterprisesId").optional(),
    cfop: cfop.optional(),
    cst: cst.optional(),
    benefitCodeId: benefitCodeId.optional(),
  })
  .strict();

export const createBenefitStateProductSchema = z
  .object({
    stateId: uuidSchema("stateId"),
    productsEnterprisesId: uuidSchema("productsEnterprisesId"),
    cfop,
    cst,
    benefitCodeId,
    reductionPercentage: reductionPercentage.nullable().optional(),
  })
  .strict();

export const patchBenefitStateProductSchema = z
  .object({
    stateId: uuidSchema("stateId").optional(),
    productsEnterprisesId: uuidSchema("productsEnterprisesId").optional(),
    cfop: cfop.optional(),
    cst: cst.optional(),
    benefitCodeId: benefitCodeId.optional(),
    reductionPercentage: reductionPercentage.nullable().optional(),
  })
  .strict()
  .refine(atLeastOneField, {
    message: "Deve haver ao menos um campo para atualizar",
  });

export type ListBenefitsCfopQuery = z.infer<typeof listBenefitsCfopQuerySchema>;
export type CreateBenefitCfopInput = z.infer<typeof createBenefitCfopSchema>;
export type PatchBenefitCfopInput = z.infer<typeof patchBenefitCfopSchema>;
export type ListBenefitsCustomerTypeQuery = z.infer<
  typeof listBenefitsCustomerTypeQuerySchema
>;
export type CreateBenefitCustomerTypeInput = z.infer<
  typeof createBenefitCustomerTypeSchema
>;
export type PatchBenefitCustomerTypeInput = z.infer<
  typeof patchBenefitCustomerTypeSchema
>;
export type ListBenefitsStateProductQuery = z.infer<
  typeof listBenefitsStateProductQuerySchema
>;
export type CreateBenefitStateProductInput = z.infer<
  typeof createBenefitStateProductSchema
>;
export type PatchBenefitStateProductInput = z.infer<
  typeof patchBenefitStateProductSchema
>;
