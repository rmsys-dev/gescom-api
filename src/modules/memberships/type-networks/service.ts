import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { typeNetworks } from "../../../db/schema.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type {
  CreateTypeNetworkInput,
  ListTypeNetworksQuery,
  PatchTypeNetworkInput,
} from "./schema.js";

const scoped = (enterpriseId: string, id: string) =>
  and(eq(typeNetworks.id, id), eq(typeNetworks.enterpriseId, enterpriseId));

export class TypeNetworksService {
  public async list(enterpriseId: string, query: ListTypeNetworksQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = eq(typeNetworks.enterpriseId, enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(typeNetworks)
        .where(where)
        .orderBy(asc(typeNetworks.description), asc(typeNetworks.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(typeNetworks).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select()
        .from(typeNetworks)
        .where(scoped(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Tipo de rede nao encontrado",
        "TYPE_NETWORK_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateTypeNetworkInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(typeNetworks)
        .values({
          enterpriseId,
          description: input.description.trim(),
          status: input.status ?? "ATIVO",
        })
        .returning();
      if (!row) throw new Error("Falha ao criar tipo de rede");
      await recordCreateAudit({
        entityType: EntityTypes.TYPE_NETWORKS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Tipo de rede em conflito (descricao duplicada)",
          "TYPE_NETWORK_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchTypeNetworkInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    try {
      const [row] = await db
        .update(typeNetworks)
        .set({
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedAt: new Date(),
        })
        .where(scoped(enterpriseId, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Tipo de rede nao encontrado",
          "TYPE_NETWORK_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.TYPE_NETWORKS,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Tipo de rede em conflito (descricao duplicada)",
          "TYPE_NETWORK_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(
    enterpriseId: string,
    id: string,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    const [row] = await db
      .delete(typeNetworks)
      .where(scoped(enterpriseId, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Tipo de rede nao encontrado",
        "TYPE_NETWORK_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.TYPE_NETWORKS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const typeNetworksService = new TypeNetworksService();
