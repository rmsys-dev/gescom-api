import { sql } from "drizzle-orm";
import { pgTable, varchar, uuid, integer, decimal, uniqueIndex } from "drizzle-orm/pg-core";
import { tz, valorQuatroCasasDecimais } from "../functions.js";
import { enterprisesMembers } from "./members.js";
import { fuelTypeEnum, ownerTypeEnum, vehicleTypeEnum, bodyTypeEnum, axleTypeEnum, statusEnum } from "../enums.js";
import { states } from "./addresses.js";

// tabela de veículos ( global para todas as empresas)
export const vehicles = pgTable("vehicles", {
    id: uuid("id").defaultRandom().primaryKey(),  
    plate: varchar("plate", { length: 255 }).notNull(), // Placa do veículo
    model: varchar("model", { length: 255 }).notNull(), // Modelo do veículo
    color: varchar("color", { length: 255 }).notNull(), // Cor do veículo
    fuelType: fuelTypeEnum("fuel_type").notNull().default("GASOLINA"), // Tipo de combustível
    ownerType: ownerTypeEnum("owner_type").notNull().default("PROPRIETARIO"),  // Tipo de proprietário
    ipvaPaymentMonth: integer("ipva_payment_month").notNull(), // Mês de pagamento do IPVA
    vehicleYear: integer("vehicle_year").notNull(), // Ano do veículo (ex: 2020)
    renavam: varchar("renavam", { length: 255 }).notNull(), // Renavam do veículo
    licensingStateId: uuid("licensing_state_id").references(() => states.id).notNull(), // Estado do licenciamento
    tareWeight: decimal("tare_weight", valorQuatroCasasDecimais), // peso de tara do veiculo (ex: 1000.0000)
    capacityM3: decimal("capacity_m3", valorQuatroCasasDecimais), // capacidade do veículo em metros cúbicos (ex: 10.0000)
    capacityKg: decimal("capacity_kg", valorQuatroCasasDecimais), // capacidade do veículo em quilogramas (ex: 10000.0000)
    entireCode: varchar("entire_code", { length: 255 }).notNull(), // código interno do veículo (ex: 1234567890)
    rntrcCode: varchar("rntrc_code", { length: 255 }).notNull(), // código do RNTRC do veículo (ex: 1234567890)
    vehicleType: vehicleTypeEnum("vehicle_type").notNull().default("TRUCK"), // Tipo de veículo ( Truck, Toco, Van, Carroceria, Outros)
    bodyType: bodyTypeEnum("body_type").notNull().default("NAO_APLICAVEL"), // Tipo de carroceria ( Nao aplicavel, Aberta, Fechada, Semi-Fechada, Outros )
    axleType: axleTypeEnum("axle_type").notNull().default("VEICULO 2 EIXOS"), // Tipo de eixo ( Simples, Duplo, Triplo, Quadruplo, Outros )
    location: varchar("location", { length: 255 }).notNull(), // Locação
    refuelingMileage: decimal("refueling_mileage", valorQuatroCasasDecimais), // Quilometragem de abastecimento (ex: 1000.0000)
    fleetNumber: varchar("fleet_number", { length: 255 }), // Número da frota do veículo
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),    
},
(t) => [
    uniqueIndex("vehicles_plate_unique")
    .on(t.plate)
   ],   
);

// tabela de relacionamento entre veículos e empresas
export const vehiclesEnterprisesMembers = pgTable("vehicles_enterprises_members", {
    id: uuid("id").defaultRandom().primaryKey(),
    status: statusEnum("status").default("ATIVO").notNull(), // status do veiculo          
    vehiclesId: uuid("vehicles_id").references(() => vehicles.id).notNull(),
    enterprisesMembersId: uuid("enterprises_members_id").references(() => enterprisesMembers.id).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
},
(t) => [
    uniqueIndex("vehicles_enterprises_members_unique")
      .on(t.vehiclesId, t.enterprisesMembersId)
      .where(sql`${t.status} = 'ATIVO'`),
  ],
); 

