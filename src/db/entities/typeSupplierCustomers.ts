import { sql } from "drizzle-orm";
import { boolean, decimal, pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { percentageDecimal, tz } from "../functions.js";
import { statusEnum, typeClassificationCustomersEnum } from "../enums.js";


//Tabela de tipos de fornecedores/clientes
export const typeSupplierCustomers = pgTable(
  "type_supplier_customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: statusEnum("status").default("ATIVO").notNull(), // Status
    description: varchar("description", { length: 255 }).notNull(), // Descrição
    icmsReduction: decimal("icms_reduction", percentageDecimal),  // Redução ICMS
    low: boolean("low").notNull().default(false),  // Baixa
    generatesSt: boolean("generates_st").notNull().default(false),  // Gera ST
    endConsumer: boolean("end_consumer").notNull().default(false),  // Consumidor final
    classification: typeClassificationCustomersEnum("classification").notNull().default("CLIENTE"),  // Classificação
    benefitCode: varchar("benefit_code", { length: 255 }),  // Código de benefício     // ainda tem que fazer a tabela de codigo beneficio
    customerDiscount: decimal("customer_discount", percentageDecimal),  // Desconto do cliente
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("type_supplier_customers_description_active_unique")
      .on(t.description)
      .where(sql`${t.status} = 'ATIVO'`),
  ],
);


