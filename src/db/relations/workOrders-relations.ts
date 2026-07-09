import { relations } from "drizzle-orm";
import { vehicles, vehiclesEnterprisesMembers } from "../entities/workOrders.js";
import { enterprisesMembers } from "../entities/members.js";
import { states } from "../entities/addresses.js";
import { statusEnum } from "../enums.js";

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
