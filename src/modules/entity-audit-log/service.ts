import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { entityAuditLog, users } from "../../db/schema.js";
import { NotFoundError } from "../../shared/errors/app-error.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import type { ListEntityAuditLogQuery } from "./schema.js";

const columns = {
  id: entityAuditLog.id,
  entityType: entityAuditLog.entityType,
  entityId: entityAuditLog.entityId,
  action: entityAuditLog.action,
  changes: entityAuditLog.changes,
  actorUserId: entityAuditLog.actorUserId,
  actorUserName: users.userName,
  actorMemberId: entityAuditLog.actorMemberId,
  enterpriseId: entityAuditLog.enterpriseId,
  requestId: entityAuditLog.requestId,
  ipAddress: entityAuditLog.ipAddress,
  userAgent: entityAuditLog.userAgent,
  source: entityAuditLog.source,
  reason: entityAuditLog.reason,
  createdAt: entityAuditLog.createdAt,
};

export class EntityAuditLogService {
  public async actors(enterpriseId: string) {
    const rows = await db
      .selectDistinct({
        id: entityAuditLog.actorUserId,
        name: users.userName,
      })
      .from(entityAuditLog)
      .innerJoin(users, eq(users.id, entityAuditLog.actorUserId))
      .where(eq(entityAuditLog.enterpriseId, enterpriseId))
      .orderBy(asc(users.userName), asc(entityAuditLog.actorUserId));
    return rows.flatMap((row) => (row.id ? [{ id: row.id, name: row.name }] : []));
  }

  public async list(enterpriseId: string, query: ListEntityAuditLogQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [eq(entityAuditLog.enterpriseId, enterpriseId)];
    if (query.entityType) conditions.push(eq(entityAuditLog.entityType, query.entityType));
    if (query.entityId) conditions.push(eq(entityAuditLog.entityId, query.entityId));
    if (query.action) conditions.push(eq(entityAuditLog.action, query.action));
    if (query.actorUserId) conditions.push(eq(entityAuditLog.actorUserId, query.actorUserId));
    if (query.from) conditions.push(gte(entityAuditLog.createdAt, query.from));
    if (query.to) conditions.push(lte(entityAuditLog.createdAt, query.to));
    if (query.search) {
      const term = `%${query.search}%`;
      const matched = or(
        sql`${entityAuditLog.entityType}::text ilike ${term}`,
        sql`${entityAuditLog.action}::text ilike ${term}`,
        sql`${entityAuditLog.entityId}::text ilike ${term}`,
        ilike(entityAuditLog.source, term),
        ilike(entityAuditLog.reason, term),
        ilike(users.userName, term),
      );
      if (matched) conditions.push(matched);
    }
    const where = and(...conditions);
    const [items, totalRows] = await Promise.all([
      db
        .select(columns)
        .from(entityAuditLog)
        .leftJoin(users, eq(users.id, entityAuditLog.actorUserId))
        .where(where)
        .orderBy(desc(entityAuditLog.createdAt), desc(entityAuditLog.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(entityAuditLog)
        .leftJoin(users, eq(users.id, entityAuditLog.actorUserId))
        .where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select(columns)
        .from(entityAuditLog)
        .leftJoin(users, eq(users.id, entityAuditLog.actorUserId))
        .where(and(eq(entityAuditLog.enterpriseId, enterpriseId), eq(entityAuditLog.id, id)))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Registro de auditoria nao encontrado",
        "ENTITY_AUDIT_LOG_NOT_FOUND",
      );
    }
    return row;
  }
}

export const entityAuditLogService = new EntityAuditLogService();
