import { z } from "zod";
import {
  adressTypeEnum,
  creditTypeEnum,
  genderEnum,
  housingTypeEnum,
  maritalStatusEnum,
  typeUserContactEnum,
} from "../../../db/schema.js";
import { userEnterpriseAndIdParamsSchema } from "../schema.js";
import {
  dateOnlyIsoSchema,
  emailSchema,
  nonEmptyText255Schema,
  personNameSchema,
  phoneSchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";

const genderSchema = z.enum(genderEnum.enumValues);
const adressTypeSchema = z.enum(adressTypeEnum.enumValues);
const typeUserContactSchema = z.enum(typeUserContactEnum.enumValues);
const maritalStatusSchema = z.enum(maritalStatusEnum.enumValues);
const housingTypeSchema = z.enum(housingTypeEnum.enumValues);
const creditTypeSchema = z.enum(creditTypeEnum.enumValues);

export const userDetailsParamsSchema = userEnterpriseAndIdParamsSchema;

export const usersAddressParamsSchema = userEnterpriseAndIdParamsSchema
  .extend({
    addressId: uuidSchema("addressId"),
  })
  .strict();

export const usersContactParamsSchema = userEnterpriseAndIdParamsSchema
  .extend({
    contactId: uuidSchema("contactId"),
  })
  .strict();

// -----------------------------
// Personal info
// -----------------------------

export const personalInfoCreateSchema = z
  .object({
    gender: genderSchema.optional(),
    birthDate: dateOnlyIsoSchema("birthDate").optional(),  
    placeOfBirth: personNameSchema("placeOfBirth").optional(),  
  })
  .strict();

export const personalInfoPatchSchema = personalInfoCreateSchema
  .partial()
  .strict()
  .refine(
    (data) =>
      data.gender !== undefined ||
      data.birthDate !== undefined ||
      data.placeOfBirth !== undefined,
    "Deve haver ao menos um campo para alteração",
  );

export type PersonalInfoCreateInput = z.infer<typeof personalInfoCreateSchema>;
export type PersonalInfoPatchInput = z.infer<typeof personalInfoPatchSchema>;

// -----------------------------
// Address
// -----------------------------

export const usersAddressCreateSchema = z
  .object({
    cepId: uuidSchema("cepId"),
    countryId: uuidSchema("countryId"),
    stateId: uuidSchema("stateId"),
    cityId: uuidSchema("cityId"),
    adressType: adressTypeSchema,
  })
  .strict();

export const usersAddressPatchSchema = z
  .object({
    cepId: uuidSchema("cepId").optional(),
    countryId: uuidSchema("countryId").optional(),
    stateId: uuidSchema("stateId").optional(),
    cityId: uuidSchema("cityId").optional(),
    adressType: adressTypeSchema.optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.cepId !== undefined ||
      data.countryId !== undefined ||
      data.stateId !== undefined ||
      data.cityId !== undefined ||
      data.adressType !== undefined ||
      data.softDelete === true,
    "Deve haver ao menos um campo para alteração",
  );

export type UsersAddressCreateInput = z.infer<typeof usersAddressCreateSchema>;
export type UsersAddressPatchInput = z.infer<typeof usersAddressPatchSchema>;

// -----------------------------
// Contact
// -----------------------------

export const usersContactCreateSchema = z
  .object({
    phone: phoneSchema("phone").optional(),
    email: emailSchema("email").optional(),
    whatsapp: phoneSchema("whatsapp").optional(),
    type: typeUserContactSchema,
  })
  .strict();

export const usersContactPatchSchema = z
  .object({
    phone: phoneSchema("phone").optional(),
    email: emailSchema("email").optional(),
    whatsapp: phoneSchema("whatsapp").optional(),
    type: typeUserContactSchema.optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.phone !== undefined ||
      data.email !== undefined ||
      data.whatsapp !== undefined ||
      data.type !== undefined ||
      data.softDelete === true,
    "Deve haver ao menos um campo para alteração",
  );

export type UsersContactCreateInput = z.infer<typeof usersContactCreateSchema>;
export type UsersContactPatchInput = z.infer<typeof usersContactPatchSchema>;

// -----------------------------
// Relationships
// -----------------------------

export const usersRelationshipsCreateSchema = z
  .object({
    maritalStatus: maritalStatusSchema.optional(),  
    spouseName: personNameSchema("spouseName").optional(),  
    housingType: housingTypeSchema.optional(),  
    rentalPeriod: z.coerce.number().int().min(0).optional(),  
    motherName: personNameSchema("motherName").optional(),  
    fatherName: personNameSchema("fatherName").optional(),
    profession: personNameSchema("profession").optional(), 
    professionDescription: personNameSchema("professionDescription").optional(), 
    professionTime: z.coerce.number().int().min(0).optional(),
    income: z.coerce.number().min(0).optional(),
    linkWithSeller: z.boolean().optional(),
    toWarmUp: z.boolean().optional(),
  })
  .strict();

export const usersRelationshipsPatchSchema = usersRelationshipsCreateSchema
  .partial()
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para alteração",
  );

export type UsersRelationshipsCreateInput = z.infer<
  typeof usersRelationshipsCreateSchema
>;
export type UsersRelationshipsPatchInput = z.infer<
  typeof usersRelationshipsPatchSchema
>;

// -----------------------------
// Tax infos
// -----------------------------

export const usersTaxInfosCreateSchema = z
  .object({
    renegotiation: z.boolean().optional(),
    spc_registration: nonEmptyText255Schema("spc_registration").optional(),
    spc_registry_date: dateOnlyIsoSchema("spc_registry_date").optional(),
    stateRegistration: nonEmptyText255Schema("stateRegistration").optional(),
    municipalRegistration: nonEmptyText255Schema(
      "municipalRegistration",
    ).optional(),
    suframa_registration: nonEmptyText255Schema(
      "suframa_registration",
    ).optional(),
    userLegalName: nonEmptyText255Schema("userLegalName").optional(),
    r3_code: z.coerce.number().int().min(0).optional(),
    sefaz_Date: dateOnlyIsoSchema("sefaz_Date").optional(),
    governmentEntity: nonEmptyText255Schema("governmentEntity").optional(),
    benefitCode: nonEmptyText255Schema("benefitCode").optional(),
  })
  .strict();

export const usersTaxInfosPatchSchema = usersTaxInfosCreateSchema
  .partial()
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para alteração",
  );

export type UsersTaxInfosCreateInput = z.infer<
  typeof usersTaxInfosCreateSchema
>;
export type UsersTaxInfosPatchInput = z.infer<typeof usersTaxInfosPatchSchema>;

// -----------------------------
// Financial info
// -----------------------------

export const usersFinancialInfoCreateSchema = z
  .object({
    ICMSReduction: z.coerce.number().min(0).max(100).optional(),
    discountLimit: z.coerce.number().min(0).max(100).optional(),
    discoutArrangement: nonEmptyText255Schema("discoutArrangement").optional(),
    creditType: creditTypeSchema.optional(),
    requestAmount: z.coerce.number().min(0).optional(),
    budgetPrice: z.coerce.number().min(0).optional(),
    taxRegime: nonEmptyText255Schema("taxRegime").optional(),
    purchaseOrder: z.boolean().optional(),
    prevRate: z.coerce.number().min(0).max(100).optional(),
    ratTax: z.coerce.number().min(0).max(100).optional(),
    reductionRate: z.coerce.number().min(0).max(100).optional(),
    senarTax: z.coerce.number().min(0).max(100).optional(),
    sale_discount: z.coerce.number().min(0).max(100).optional(),
    sendNF: z.boolean().optional(),
  })
  .strict();

export const usersFinancialInfoPatchSchema = usersFinancialInfoCreateSchema
  .partial()
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para alteração",
  );

export type UsersFinancialInfoCreateInput = z.infer<
  typeof usersFinancialInfoCreateSchema
>;
export type UsersFinancialInfoPatchInput = z.infer<
  typeof usersFinancialInfoPatchSchema
>;

// Aliases para perfil vinculado a enterprises_members (members_*)
export const membersContactCreateSchema = usersContactCreateSchema;
export const membersRelationshipsCreateSchema = usersRelationshipsCreateSchema;
export const membersTaxInfosCreateSchema = usersTaxInfosCreateSchema;
export const membersFinancialInfoCreateSchema = usersFinancialInfoCreateSchema;
