import { and, asc, eq, isNull } from "drizzle-orm";
import { db, states, statesDivisions } from "../../../db/schema.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  recordSoftDeleteAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { countRowsWhere } from "../../../shared/db/relational-list.js";
import {
  softDeleteValues,
  touchUpdatedAt,
} from "../../../shared/db/record-lifecycle.js";
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  isPostgresUniqueViolation,
  requireActiveState,
} from "../shared/address-helpers.js";
import type {
  CreateStateDivisionInput,
  ListStatesDivisionsQuery,
  PatchStateDivisionInput,
} from "./schema.js";

const assertBorderUf = async (statesId: string, uf: string) => {
  const [state] = await db
    .select({ acronym: states.acronym })
    .from(states)
    .where(and(eq(states.id, statesId), isNull(states.deletedAt)))
    .limit(1);
  if (!state) {
    throw new NotFoundError("Estado nao encontrado", "STATE_NOT_FOUND");
  }
  if (state.acronym === uf) {
    throw new BadRequestError(
      "A UF da divisao nao pode ser a do proprio estado",
      "STATE_DIVISION_SAME_UF",
    );
  }
  const [border] = await db
    .select({ id: states.id })
    .from(states)
    .where(and(eq(states.acronym, uf), isNull(states.deletedAt)))
    .limit(1);
  if (!border) {
    throw new NotFoundError(
      "UF da divisao nao encontrada",
      "STATE_DIVISION_UF_NOT_FOUND",
    );
  }
};

export class AddressesStatesDivisionsService {
  public async list(query: ListStatesDivisionsQuery) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [isNull(statesDivisions.deletedAt)];
    if (query.statesId !== undefined) {
      conditions.push(eq(statesDivisions.statesId, query.statesId));
    }
    const whereClause = and(...conditions);
    const [items, total] = await Promise.all([
      db.query.statesDivisions.findMany({
        where: whereClause,
        orderBy: [asc(statesDivisions.uf), asc(statesDivisions.id)],
        limit,
        offset,
      }),
      countRowsWhere(statesDivisions, whereClause),
    ]);
    return { items, total, limit, offset };
  }

  public async create(input: CreateStateDivisionInput, audit: EntityAuditContext) {
    await requireActiveState(input.statesId);
    await assertBorderUf(input.statesId, input.uf);
    try {
      const [row] = await db
        .insert(statesDivisions)
        .values({ statesId: input.statesId, uf: input.uf })
        .returning();
      if (!row) {
        throw new InternalServerError("Falha ao criar divisao de estado");
      }
      await recordCreateAudit({
        entityType: EntityTypes.STATES_DIVISIONS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Divisao de estado em conflito (UF ja vinculada)",
          "STATE_DIVISION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    id: string,
    input: PatchStateDivisionInput,
    audit: EntityAuditContext,
  ) {
    const [existing] = await db
      .select()
      .from(statesDivisions)
      .where(and(eq(statesDivisions.id, id), isNull(statesDivisions.deletedAt)))
      .limit(1);
    if (!existing) {
      throw new NotFoundError(
        "Divisao de estado nao encontrada",
        "STATE_DIVISION_NOT_FOUND",
      );
    }

    const now = new Date();
    if (input.softDelete === true) {
      const [row] = await db
        .update(statesDivisions)
        .set(softDeleteValues(now))
        .where(and(eq(statesDivisions.id, id), isNull(statesDivisions.deletedAt)))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Divisao de estado nao encontrada",
          "STATE_DIVISION_NOT_FOUND",
        );
      }
      await recordSoftDeleteAudit({
        entityType: EntityTypes.STATES_DIVISIONS,
        entityId: id,
        before: existing,
        after: row,
        ctx: audit,
      });
      return row;
    }

    const statesId = input.statesId ?? existing.statesId;
    const uf = input.uf ?? existing.uf;
    if (input.statesId !== undefined) {
      await requireActiveState(input.statesId);
    }
    await assertBorderUf(statesId, uf);

    try {
      const [row] = await db
        .update(statesDivisions)
        .set({
          ...(input.statesId !== undefined ? { statesId: input.statesId } : {}),
          ...(input.uf !== undefined ? { uf: input.uf } : {}),
          ...touchUpdatedAt(now),
        })
        .where(and(eq(statesDivisions.id, id), isNull(statesDivisions.deletedAt)))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Divisao de estado nao encontrada",
          "STATE_DIVISION_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.STATES_DIVISIONS,
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
          "Divisao de estado em conflito (UF ja vinculada)",
          "STATE_DIVISION_CONFLICT",
        );
      }
      throw err;
    }
  }
}

export const addressesStatesDivisionsService =
  new AddressesStatesDivisionsService();
