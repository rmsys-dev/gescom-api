import { relations } from "drizzle-orm";
import {
  memberModules,
  modulePermissions,
  modules,
} from "../entities/modules.js";
import { enterprisesMembers } from "../entities/members.js";

export const modulesRelations = relations(modules, ({ many }) => ({
  memberModules: many(memberModules),
}));

export const memberModulesRelations = relations(
  memberModules,
  ({ one, many }) => ({
    module: one(modules, {
      fields: [memberModules.moduleId],
      references: [modules.id],
    }),
    member: one(enterprisesMembers, {
      fields: [memberModules.memberId],
      references: [enterprisesMembers.id],
    }),
    permissions: many(modulePermissions),
  }),
);

export const modulePermissionsRelations = relations(
  modulePermissions,
  ({ one }) => ({
    memberModule: one(memberModules, {
      fields: [modulePermissions.memberModuleId],
      references: [memberModules.id],
    }),
  }),
);
