import {
  index,
  jsonb,
  pgTable,
  varchar,
  uuid,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./entities/users.js";
import {
  loginTypeEnum,
  authEventEnum,
  entityAuditActionEnum,
  entityTypeEnum,
} from "./enums.js";
import { enterprises } from "./entities/enterprises.js";
import { enterprisesMembers } from "./entities/members.js";

/** Coluna timestamptz (instante com fuso). */
const tz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" });

//Tabela de auditoria de autenticação
export const authAuditLog = pgTable("auth_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  loginAttempt: varchar("login_attempt", { length: 255 }),
  loginType: loginTypeEnum("login_type"),
  event: authEventEnum("event").notNull(),
  enterpriseId: uuid("enterprise_id").references(() => enterprises.id, {
    onDelete: "set null",
  }),
  sessionId: uuid("session_id"),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: varchar("user_agent", { length: 500 }),
  requestId: varchar("request_id", { length: 64 }),
  reason: varchar("reason", { length: 500 }),
  createdAt: tz("created_at").defaultNow().notNull(),
});

//Tabela unificada de auditoria de entidades de domínio (append-only)
export const entityAuditLog = pgTable(
  "entity_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: entityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: entityAuditActionEnum("action").notNull(),
    changes: jsonb("changes"),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorMemberId: uuid("actor_member_id").references(
      () => enterprisesMembers.id,
      { onDelete: "set null" },
    ),
    enterpriseId: uuid("enterprise_id").references(() => enterprises.id, {
      onDelete: "set null",
    }),
    requestId: varchar("request_id", { length: 64 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 500 }),
    source: varchar("source", { length: 255 }),
    reason: varchar("reason", { length: 500 }),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("entity_audit_entity_idx").on(t.entityType, t.entityId, t.createdAt),
    index("entity_audit_enterprise_idx").on(t.enterpriseId, t.createdAt),
    index("entity_audit_actor_user_idx").on(t.actorUserId, t.createdAt),
  ],
);
