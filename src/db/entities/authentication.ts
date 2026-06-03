import {
  pgTable,
  varchar,
  uuid,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { statusEnum, loginTypeEnum, inviteChannelEnum } from "../enums.js";
import { users } from "./users.js";
import { enterprisesMembers } from "./members.js";
import { sql } from "drizzle-orm";
import { tz } from "../functions.js";

//Tabela de credenciais de usuários
export const usersCredentials = pgTable(
  "users_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: statusEnum("status").default("ATIVO").notNull(),
    login: varchar("login", { length: 255 }).notNull(), // Apresentação (email original ou CPF formatado)
    loginType: loginTypeEnum("login_type").notNull(),
    loginNormalized: varchar("login_normalized", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    passwordUpdatedAt: tz("password_updated_at"),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    lockedUntil: tz("locked_until"),
    lastFailedAt: tz("last_failed_at"),
    lastLoginAt: tz("last_login_at"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("users_credentials_login_type_normalized_active_unique")
      .on(t.loginType, t.loginNormalized)
      .where(sql`${t.deletedAt} is null`),
    uniqueIndex("users_credentials_user_login_type_active_unique")
      .on(t.userId, t.loginType)
      .where(sql`${t.deletedAt} is null`),
    check(
      "users_credentials_failed_attempts_non_negative",
      sql`${t.failedAttempts} >= 0`,
    ),
  ],
);

//Tabela de sessões de usuários (refresh tokens revogáveis)
export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }), // ID do usuário
    jti: uuid("jti").notNull(), // Identificador único da sessão
    memberId: uuid("member_id").references(() => enterprisesMembers.id, {
      onDelete: "restrict",
    }), // ID do membro
    refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull(), // Hash do token de atualização
    userAgent: varchar("user_agent", { length: 500 }), // Agente do usuário
    ipAddress: varchar("ip_address", { length: 64 }), // Endereço IP
    expiresAt: tz("expires_at").notNull(), // Data de expiração
    revokedAt: tz("revoked_at"), // Data de revogação
    revokedReason: varchar("revoked_reason", { length: 64 }), // Motivo da revogação
    replacedBySessionId: uuid("replaced_by_session_id"), // ID da sessão substituída
    createdAt: tz("created_at").defaultNow().notNull(), // Data de criação
    updatedAt: tz("updated_at"), // Data de atualização
  },
  (t) => [
    uniqueIndex("user_sessions_jti_active_unique")
      .on(t.jti)
      .where(sql`${t.revokedAt} is null`),
    index("user_sessions_user_member_idx").on(t.userId, t.memberId),
    check("user_sessions_member_required", sql`${t.memberId} is not null`),
  ],
);

//Tabela de tokens de redefinição de senha (código de uso único, TTL limitado)
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: statusEnum("status").default("ATIVO").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    channel: inviteChannelEnum("channel").notNull(),
    sentTo: varchar("sent_to", { length: 255 }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    expiresAt: tz("expires_at").notNull(),
    consumedAt: tz("consumed_at"),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 500 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("password_reset_tokens_user_pending_unique")
      .on(t.userId)
      .where(sql`${t.consumedAt} is null and ${t.deletedAt} is null`),
    index("password_reset_tokens_user_created_idx").on(t.userId, t.createdAt),
    check(
      "password_reset_tokens_attempts_non_negative",
      sql`${t.attempts} >= 0`,
    ),
    check(
      "password_reset_tokens_attempts_le_max",
      sql`${t.attempts} <= ${t.maxAttempts}`,
    ),
  ],
);
