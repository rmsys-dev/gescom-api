import { relations } from "drizzle-orm";
import { enterprises } from "../entities/enterprises.js";
import { enterprisesMembers } from "../entities/members.js";
import { users } from "../entities/users.js";
import {
  usersCredentials,
  userSessions,
  passwordResetTokens,
} from "../entities/authentication.js";
import { authAuditLog, entityAuditLog } from "../auditoriums.js";

//**RELAÇÕES DE CREDENCIAIS**//
export const usersCredentialsRelations = relations(
  usersCredentials,
  ({ one }) => ({
    user: one(users, {
      fields: [usersCredentials.userId],
      references: [users.id],
    }),
  }),
);

//**RELAÇÕES DE SESSÕES**//
export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

//**RELAÇÕES DE AUDITORIA DE AUTENTICAÇÃO**//
export const authAuditLogRelations = relations(authAuditLog, ({ one }) => ({
  user: one(users, {
    fields: [authAuditLog.userId],
    references: [users.id],
  }),
  enterprise: one(enterprises, {
    fields: [authAuditLog.enterpriseId],
    references: [enterprises.id],
  }),
}));

//**RELAÇÕES DE AUDITORIA DE ENTIDADES DE DOMÍNIO**//
export const entityAuditLogRelations = relations(entityAuditLog, ({ one }) => ({
  actorUser: one(users, {
    fields: [entityAuditLog.actorUserId],
    references: [users.id],
  }),
  actorMember: one(enterprisesMembers, {
    fields: [entityAuditLog.actorMemberId],
    references: [enterprisesMembers.id],
  }),
  enterprise: one(enterprises, {
    fields: [entityAuditLog.enterpriseId],
    references: [enterprises.id],
  }),
}));

//**RELAÇÕES DE TOKENS DE REDEFINIÇÃO DE SENHA**//
export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  }),
);
