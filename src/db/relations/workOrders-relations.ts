import { relations } from "drizzle-orm";
import { vehicles, vehiclesEnterprisesMembers, enterprisesMemberSalesItems } from "../entities/workOrders.js";
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

//**RELAÇÕES DE RELACIONAMENTO ENTRE MEMBRO DA EMPRESA E ITEM DE VENDA**//
export const enterprisesMemberSalesItemsRelations = relations(enterprisesMemberSalesItems, ({ one }) => ({
    enterpriseMember: one(enterprisesMembers, {
        fields: [enterprisesMemberSalesItems.enterprisesMembersId],
        references: [enterprisesMembers.id],
    }),
    salesItem: one(salesItems, {
        fields: [enterprisesMemberSalesItems.salesItemsId],
        references: [salesItems.id],
    }),
}));
