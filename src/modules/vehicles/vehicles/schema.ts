import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

const fuelTypeSchema = z.enum(["GASOLINA", "ALCOOL", "DIESEL", "ELETRICO"]);
const ownerTypeSchema = z.enum(["PROPRIETARIO", "LOCATARIO", "OUTROS"]);
const vehicleTypeSchema = z.enum([
  "TRUCK",
  "TOCO",
  "CAVALO MECANICO",
  "VAN",
  "UTILITARIO",
  "OUTROS",
]);
const bodyTypeSchema = z.enum([
  "NAO_APLICAVEL",
  "ABERTA",
  "FECHADA/BAU",
  "GRANELERA",
  "PORTA CONTAINER",
  "SIDER",
]);
const axleTypeSchema = z.enum([
  "VEICULO 2 EIXOS",
  "VEICULO 3 EIXOS",
  "VEICULO 4 EIXOS",
  "VEICULO 5 EIXOS",
  "VEICULO 6 EIXOS",
  "VEICULO 7 EIXOS",
  "VEICULO 8 EIXOS",
  "VEICULO 9 EIXOS",
  "VEICULO 10 EIXOS",
  "VEICULO ACIMA 10 EIXOS",
]);

const plateSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .transform((v) => v.toUpperCase());

const textField = z.string().trim().min(1).max(255);
const textNullable = textField.nullable().optional();
const decimalOpt = z.number().min(0).optional();
const decimalNullable = z.number().min(0).nullable().optional();
const monthNullable = z.number().int().min(1).max(12).nullable().optional();
const yearNullable = z.number().int().min(1900).max(2100).nullable().optional();
const uuidNullable = z.string().uuid().nullable().optional();

export const listVehiclesQuerySchema = createPaginationQuerySchema(100).extend({
  plate: z.string().trim().min(1).max(255).optional(),
  search: z.string().trim().min(1).max(255).optional(),
});

export const createVehicleSchema = z
  .object({
    plate: plateSchema,
    model: textNullable,
    color: textNullable,
    fuelType: fuelTypeSchema.optional(),
    ownerType: ownerTypeSchema.optional(),
    ipvaPaymentMonth: monthNullable,
    vehicleYear: yearNullable,
    renavam: textNullable,
    licensingStateId: uuidNullable,
    tareWeight: decimalOpt,
    capacityM3: decimalOpt,
    capacityKg: decimalOpt,
    entireCode: textNullable,
    rntrcCode: textNullable,
    vehicleType: vehicleTypeSchema.optional(),
    bodyType: bodyTypeSchema.optional(),
    axleType: axleTypeSchema.optional(),
    location: textNullable,
    refuelingMileage: decimalOpt,
    fleetNumber: textNullable,
  })
  .strict();

export const patchVehicleSchema = z
  .object({
    plate: plateSchema.optional(),
    model: textNullable,
    color: textNullable,
    fuelType: fuelTypeSchema.optional(),
    ownerType: ownerTypeSchema.optional(),
    ipvaPaymentMonth: monthNullable,
    vehicleYear: yearNullable,
    renavam: textNullable,
    licensingStateId: uuidNullable,
    tareWeight: decimalNullable,
    capacityM3: decimalNullable,
    capacityKg: decimalNullable,
    entireCode: textNullable,
    rntrcCode: textNullable,
    vehicleType: vehicleTypeSchema.optional(),
    bodyType: bodyTypeSchema.optional(),
    axleType: axleTypeSchema.optional(),
    location: textNullable,
    refuelingMileage: decimalNullable,
    fleetNumber: textNullable,
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const vehicleParamsSchema = z
  .object({
    vehicleId: z.string().uuid("Campo 'vehicleId' deve ser um UUID valido"),
  })
  .strict();

export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type PatchVehicleInput = z.infer<typeof patchVehicleSchema>;
