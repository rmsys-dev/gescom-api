import { sql } from "drizzle-orm";
import { date, pgTable, uniqueIndex, varchar, uuid } from "drizzle-orm/pg-core";
import { statusEnum, statusPermissionEnum } from "../enums.js";
import { tz } from "../functions.js";

//Tabela de departamentos (catálogo global; mantenedor define permissões padrão)
export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 255 }),
    status: statusEnum("status").default("ATIVO").notNull(),
    permissionReference: varchar("permission_reference", {
      length: 255,
    }).notNull(),
    registeredOn: date("registered_on", { mode: "date" })
      .default(sql`CURRENT_DATE`)
      .notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("departments_name_active_unique")
      .on(t.name)
      .where(sql`${t.deletedAt} is null`),
  ],
);

//Snapshot de permissões padrão por departamento
export const departmentDefaultPermissions = pgTable(
  "department_default_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 255 }).notNull(),
    status: statusPermissionEnum("status").default("ALLOW").notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("department_default_permissions_dept_perm_active_unique")
      .on(t.departmentId, t.permission)
      .where(sql`${t.deletedAt} is null`),
  ],
);
