import { sql } from "drizzle-orm";
import { pgTable, uniqueIndex, varchar, uuid } from "drizzle-orm/pg-core";
import { accessLevelEnum, statusPermissionEnum, statusEnum } from "../enums.js";
import { tz } from "../functions.js";
import { enterprisesMembers } from "./members.js";

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 255 }),
    status: statusEnum("status").default("ATIVO").notNull(),
    reference: varchar("reference", { length: 255 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("modules_name_active_unique")
      .on(t.name)
      .where(sql`${t.deletedAt} is null`),
    uniqueIndex("modules_reference_active_unique")
      .on(t.reference)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const memberModules = pgTable(
  "member_modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "cascade" }),
    accessLevel: accessLevelEnum("access_level").default("N0").notNull(),
    status: statusEnum("status").default("ATIVO").notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("member_modules_member_id_module_id_active_unique")
      .on(t.memberId, t.moduleId)
      .where(sql`${t.deletedAt} is null`),
  ],
);

export const modulePermissions = pgTable(
  "module_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberModuleId: uuid("member_module_id")
      .notNull()
      .references(() => memberModules.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 255 }).notNull(),
    status: statusPermissionEnum("status").default("ALLOW").notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("module_permissions_member_module_permission_unique").on(
      t.memberModuleId,
      t.permission,
    ),
  ],
);
