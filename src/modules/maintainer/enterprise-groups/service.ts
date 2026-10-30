import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db, enterpriseGroups, enterprises } from "../../../db/schema.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import {
  AppError,
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  recordSoftDeleteAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import type {
  CreateEnterpriseGroupInput,
  PatchEnterpriseGroupInput,
} from "./schema.js";

const groupConflict = () =>
  new ConflictError(
    "Ja existe um grupo de empresas com este nome.",
    "ENTERPRISE_GROUP_CONFLICT",
  );

const groupNotFound = () =>
  new NotFoundError("Grupo de empresas nao encontrado", "ENTERPRISE_GROUP_NOT_FOUND");

const enterpriseSummary = {
  id: enterprises.id,
  groupId: enterprises.groupId,
  registration: enterprises.registration,
  legalName: enterprises.legalName,
  tradeName: enterprises.tradeName,
  status: enterprises.status,
};

export class MaintainerEnterpriseGroupsService {
  private async activeGroup(id: string) {
    const [row] = await db
      .select()
      .from(enterpriseGroups)
      .where(and(eq(enterpriseGroups.id, id), isNull(enterpriseGroups.deletedAt)))
      .limit(1);
    if (!row) throw groupNotFound();
    return row;
  }

  private async groupEnterprises(groupIds: string[]) {
    if (groupIds.length === 0) return [];
    return db
      .select(enterpriseSummary)
      .from(enterprises)
      .where(and(inArray(enterprises.groupId, groupIds), isNull(enterprises.deletedAt)))
      .orderBy(asc(enterprises.tradeName));
  }

  public async list() {
    const groups = await db
      .select()
      .from(enterpriseGroups)
      .where(isNull(enterpriseGroups.deletedAt))
      .orderBy(asc(enterpriseGroups.name));
    const members = await this.groupEnterprises(groups.map((group) => group.id));
    return groups.map((group) => ({
      ...group,
      enterprises: members.filter((item) => item.groupId === group.id),
    }));
  }

  public async getById(id: string) {
    const group = await this.activeGroup(id);
    return { ...group, enterprises: await this.groupEnterprises([id]) };
  }

  public async create(input: CreateEnterpriseGroupInput, audit: EntityAuditContext) {
    try {
      return await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(enterpriseGroups)
          .values({ name: input.name.trim() })
          .returning();
        if (!created) throw new InternalServerError("Falha ao criar grupo de empresas");
        await recordCreateAudit({
          entityType: EntityTypes.ENTERPRISE_GROUPS,
          entityId: created.id,
          after: created,
          ctx: audit,
          tx,
        });
        return { ...created, enterprises: [] };
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (isPostgresUniqueViolation(err)) throw groupConflict();
      throw err;
    }
  }

  public async patch(id: string, input: PatchEnterpriseGroupInput, audit: EntityAuditContext) {
    const existing = await this.activeGroup(id);
    try {
      const [updated] = await db
        .update(enterpriseGroups)
        .set({
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(enterpriseGroups.id, id), isNull(enterpriseGroups.deletedAt)))
        .returning();
      if (!updated) throw groupNotFound();
      await recordEntityAudit({
        entityType: EntityTypes.ENTERPRISE_GROUPS,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(updated),
        ctx: audit,
      });
      return { ...updated, enterprises: await this.groupEnterprises([id]) };
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (isPostgresUniqueViolation(err)) throw groupConflict();
      throw err;
    }
  }

  /** Exclui o grupo e desvincula as lojas, que voltam a consultar só o próprio estoque. */
  public async softDelete(id: string, audit: EntityAuditContext) {
    const existing = await this.activeGroup(id);
    return db.transaction(async (tx) => {
      const now = new Date();
      const unlinked = await tx
        .update(enterprises)
        .set({ groupId: null, updatedAt: now })
        .where(eq(enterprises.groupId, id))
        .returning({ id: enterprises.id });
      const [deleted] = await tx
        .update(enterpriseGroups)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(enterpriseGroups.id, id))
        .returning();
      if (!deleted) throw groupNotFound();
      await recordSoftDeleteAudit({
        entityType: EntityTypes.ENTERPRISE_GROUPS,
        entityId: id,
        before: existing,
        after: deleted,
        ctx: audit,
        tx,
      });
      for (const item of unlinked) {
        await recordEntityAudit({
          entityType: EntityTypes.ENTERPRISES,
          entityId: item.id,
          action: "UPDATE",
          before: { groupId: id },
          after: { groupId: null },
          ctx: { ...audit, enterpriseId: item.id },
          tx,
        });
      }
      return { id: deleted.id, deletedAt: deleted.deletedAt, unlinkedEnterprises: unlinked.length };
    });
  }

  public async setEnterpriseGroup(
    enterpriseId: string,
    groupId: string | null,
    audit: EntityAuditContext,
  ) {
    const [enterprise] = await db
      .select(enterpriseSummary)
      .from(enterprises)
      .where(and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)))
      .limit(1);
    if (!enterprise) {
      throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    }
    if (groupId) {
      const group = await this.activeGroup(groupId);
      if (group.status !== "ATIVO") {
        throw new BadRequestError(
          "O grupo de empresas esta inativo.",
          "ENTERPRISE_GROUP_INACTIVE",
        );
      }
    }
    if (enterprise.groupId === groupId) return enterprise;
    const [updated] = await db
      .update(enterprises)
      .set({ groupId, updatedAt: new Date() })
      .where(eq(enterprises.id, enterpriseId))
      .returning(enterpriseSummary);
    if (!updated) {
      throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    }
    await recordEntityAudit({
      entityType: EntityTypes.ENTERPRISES,
      entityId: enterpriseId,
      action: "UPDATE",
      before: { groupId: enterprise.groupId },
      after: { groupId: updated.groupId },
      ctx: { ...audit, enterpriseId },
    });
    return updated;
  }
}

export const maintainerEnterpriseGroupsService = new MaintainerEnterpriseGroupsService();
