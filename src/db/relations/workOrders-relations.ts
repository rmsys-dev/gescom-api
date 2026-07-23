import { relations } from "drizzle-orm";
import { vehicles, vehiclesEnterprisesMembers, mechanicSalesItems } from "../entities/workOrders.js";
import { enterprisesMembers } from "../entities/members.js";
import { states } from "../entities/addresses.js";
import { salesItems } from "../entities/sales.js";

//**RELAÇÕES DE VEÍCULOS**//
export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
    licensingState: one(states, {
        fields: [vehicles.licensingStateId],
        references: [states.id],
    }),
    enterprisesMembers: many(vehiclesEnterprisesMembers),
}));

//**RELAÇÕES DE RELACIONAMENTO ENTRE VEÍCULOS E EMPRESAS**//
export const vehiclesEnterprisesMembersRelations = relations(vehiclesEnterprisesMembers, ({ one }) => ({
    vehicle: one(vehicles, {
        fields: [vehiclesEnterprisesMembers.vehiclesId],
        references: [vehicles.id],
    }),
    enterpriseMember: one(enterprisesMembers, {
        fields: [vehiclesEnterprisesMembers.enterprisesMembersId],
        references: [enterprisesMembers.id],
    }),
}));

//**RELAÇÕES DE MECÂNICO × ITEM DE VENDA**//
export const mechanicSalesItemsRelations = relations(mechanicSalesItems, ({ one }) => ({
    mechanicMember: one(enterprisesMembers, {
        fields: [mechanicSalesItems.mechanic],
        references: [enterprisesMembers.id],
    }),
    salesItem: one(salesItems, {
        fields: [mechanicSalesItems.salesItemsId],
        references: [salesItems.id],
    }),
}));
