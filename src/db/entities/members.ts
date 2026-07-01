import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
  uuid,
  decimal,
} from "drizzle-orm/pg-core";
import {
  statusEnum,
  statusPermissionEnum,
  memberClassEnum,
  invitePurposeEnum,
  inviteChannelEnum,
} from "../enums.js";
import { users } from "./users.js";
import { enterprises } from "./enterprises.js";
import { departments } from "./departments.js";
import { typeSupplierCustomers } from "./typeSupplierCustomers.js";
import { typeNetworks } from "./typeNetworks.js";
import { tz } from "../functions.js";
import { percentageDecimal } from "../functions.js";

//Tabela de membros de empresas
export const enterprisesMembers = pgTable(
  "enterprises_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    code: integer("code"), // Código do membro
    status: statusEnum("status").default("ATIVO").notNull(), // Status
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }), // Usuário
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }), // Empresa
    class: memberClassEnum("class").notNull(), // Classe
    observations: varchar("observations", { length: 500 }), // Observações
    includedBy: uuid("included_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }), // Incluído por
    registeredOn: date("registered_on", { mode: "date" })
      .default(sql`CURRENT_DATE`)
      .notNull(),
    saleLimit: decimal("sale_limit", percentageDecimal)
      .notNull()
      .default("0.00"), // Limite de vendas
    exceedDiscountSale: boolean("exceed_discount_sale")
      .notNull()
      .default(false), // Exceder desconto de venda
    receiptLimitDiscount: decimal("receipt_limit_discount", percentageDecimal)
      .notNull()
      .default("0.00"), // Limite de desconto de recebimento
    comissionOnSight: decimal("comission_on_sight", percentageDecimal)
      .notNull()
      .default("0.00"), // Comissão a vista
    comissionToTerms: decimal("comission_to_terms", percentageDecimal)
      .notNull()
      .default("0.00"), // Comissão a prazo
    comissionPartial: decimal("comission_partial", percentageDecimal)
      .notNull()
      .default("0.00"), // Comissão parcial
    typeSupplierCustomerId: uuid("type_supplier_customer_id").references(
      () => typeSupplierCustomers.id,
      { onDelete: "restrict" },
    ),
    typeNetworkId: uuid("type_network_id").references(() => typeNetworks.id, {
      onDelete: "restrict",
    }),
    approvedAt: date("approved_at", { mode: "date" }), // Data de aprovação / ativação
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("enterprises_members_user_enterprise_active_unique")
      .on(t.userId, t.enterpriseId)
      .where(sql`${t.deletedAt} is null`),
    index("enterprises_members_enterprise_active_idx").on(
      t.enterpriseId,
      t.deletedAt,
    ),
  ],
);

//Convites de primeiro acesso / aceite de vínculo (código de 6 dígitos, TTL limitado)
export const userInvitations = pgTable(
  "user_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: statusEnum("status").default("ATIVO").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    purpose: invitePurposeEnum("purpose").notNull(),
    memberId: uuid("member_id").references(() => enterprisesMembers.id, {
      onDelete: "restrict",
    }),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    channel: inviteChannelEnum("channel").notNull(),
    sentTo: varchar("sent_to", { length: 255 }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    expiresAt: date("expires_at", { mode: "date" }).notNull(),
    consumedAt: date("consumed_at", { mode: "date" }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 500 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("user_invitations_first_access_user_pending_unique")
      .on(t.userId)
      .where(
        sql`${t.purpose} = 'FIRST_ACCESS'::invite_purpose and ${t.consumedAt} is null and ${t.deletedAt} is null`,
      ),
    uniqueIndex("user_invitations_membership_member_pending_unique")
      .on(t.memberId)
      .where(
        sql`${t.purpose} = 'MEMBERSHIP_ACCEPT'::invite_purpose and ${t.memberId} is not null and ${t.consumedAt} is null and ${t.deletedAt} is null`,
      ),
    check("user_invitations_attempts_non_negative", sql`${t.attempts} >= 0`),
    check(
      "user_invitations_attempts_le_max",
      sql`${t.attempts} <= ${t.maxAttempts}`,
    ),
    check(
      "user_invitations_membership_member_required",
      sql`${t.purpose} <> 'MEMBERSHIP_ACCEPT'::invite_purpose or ${t.memberId} is not null`,
    ),
    index("user_invitations_user_member_purpose_idx").on(
      t.userId,
      t.memberId,
      t.purpose,
    ),
  ],
);

//Tabela de departamentos de membros de empresas
export const membersDepartments = pgTable(
  "members_departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: statusEnum("status").default("ATIVO").notNull(), // Status
    memberId: uuid("member_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "restrict" }), // Vínculo membro-empresa
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }), // Departamento
    mainDepartment: boolean("main_department").notNull(), // Departamento principal
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("members_departments_member_department_active_unique")
      .on(t.memberId, t.departmentId)
      .where(sql`${t.deletedAt} is null`),
    uniqueIndex("members_departments_main_unique")
      .on(t.memberId)
      .where(sql`${t.mainDepartment} = true and ${t.deletedAt} is null`),
    index("members_departments_member_department_idx").on(
      t.memberId,
      t.departmentId,
    ),
  ],
);

//Permissões padrão (snapshot do arquivo estático no momento do vínculo)
export const memberPermissionsDefault = pgTable(
  "member_permissions_default",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    permission: varchar("permission", { length: 255 }).notNull(), // Permissão
    status: statusPermissionEnum("status").default("ALLOW").notNull(), // Status
    memberDepartmentId: uuid("member_department_id")
      .notNull()
      .references(() => membersDepartments.id, { onDelete: "cascade" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("member_permissions_default_member_dept_perm_active_unique")
      .on(t.memberDepartmentId, t.permission)
      .where(sql`${t.deletedAt} is null`),
  ],
);

//Permissões extras concedidas por demanda
export const memberExtraPermissions = pgTable(
  "member_extra_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    permission: varchar("permission", { length: 255 }).notNull(), // Permissão
    status: statusPermissionEnum("status").default("ALLOW").notNull(), // Status
    memberDepartmentId: uuid("member_department_id")
      .notNull()
      .references(() => membersDepartments.id, { onDelete: "cascade" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("member_extra_permissions_member_dept_perm_active_unique")
      .on(t.memberDepartmentId, t.permission)
      .where(sql`${t.deletedAt} is null`),
  ],
);
