import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import { states } from "../../../db/schema.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  recordSoftDeleteAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { memoryCache } from "../../../shared/cache/memory-cache.js";
import {
  invalidateReferenceStates,
  referenceCacheKeys,
  REFERENCE_DATA_TTL_MS,
} from "../../../shared/cache/reference-data-cache.js";
import {
  softDeleteValues,
  touchUpdatedAt,
} from "../../../shared/db/record-lifecycle.js";
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { paginateArray } from "../../../shared/pagination/paginate-array.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  assertNoActiveCitiesForState,
  isPostgresUniqueViolation,
  requireActiveCountry,
} from "../shared/address-helpers.js";
import type {
  CreateStateInput,
  ListStatesQuery,
  PatchStateInput,
} from "./schema.js";

const fetchStates = (countryId?: string) => {
  const conditions = [isNull(states.deletedAt)];

  if (countryId !== undefined) {
    conditions.push(eq(states.countryId, countryId));
  }

  return db.query.states.findMany({
    where: and(...conditions),
    orderBy: [asc(states.description), asc(states.id)],
  });
};

export class AddressesStatesService {
  public async list(query: ListStatesQuery) {
    const { limit, offset } = resolveListPagination(query);
    const cacheKey = referenceCacheKeys.states(query.countryId);
    const allItems = await memoryCache.getOrSet(
      cacheKey,
      REFERENCE_DATA_TTL_MS,
      () => fetchStates(query.countryId),
    );

    return paginateArray(allItems, limit, offset);
  }

  public async create(input: CreateStateInput, audit: EntityAuditContext) {
    await requireActiveCountry(input.countryId);
    try {
      const [row] = await db
        .insert(states)
        .values({
          acronym: input.acronym,
          description: input.description.trim(),
          internalAliquot: input.internalAliquot,
          interstateAliquot: input.interstateAliquot,
          fcpAliquot: input.fcpAliquot,
          borders: input.borders,
          embedTax: input.embedTax,
          ibs_uf_tax: input.ibs_uf_tax,
          ibs_municipal_tax: input.ibs_municipal_tax,
          countryId: input.countryId,
        })
        .returning();
      if (!row) {
        throw new InternalServerError("Falha ao criar estado");
      }
      invalidateReferenceStates();
      await recordCreateAudit({
        entityType: EntityTypes.STATES,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Estado em conflito (sigla duplicada no pais)",
          "STATE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    stateId: string,
    input: PatchStateInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(states)
      .where(and(eq(states.id, stateId), isNull(states.deletedAt)))
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError("Estado nao encontrado", "STATE_NOT_FOUND");
    }

    const now = new Date();

    if (input.softDelete === true) {
      await assertNoActiveCitiesForState(stateId);
      const [row] = await db
        .update(states)
        .set(softDeleteValues(now))
        .where(and(eq(states.id, stateId), isNull(states.deletedAt)))
        .returning();
      if (!row) {
        throw new NotFoundError("Estado nao encontrado", "STATE_NOT_FOUND");
      }
      invalidateReferenceStates();
      await recordSoftDeleteAudit({
        entityType: EntityTypes.STATES,
        entityId: stateId,
        before: existing,
        after: row,
        ctx: audit,
      });
      return row;
    }

    if (input.countryId !== undefined) {
      await requireActiveCountry(input.countryId);
    }

    try {
      const [row] = await db
        .update(states)
        .set({
          ...(input.acronym !== undefined ? { acronym: input.acronym } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.internalAliquot !== undefined
            ? { internalAliquot: input.internalAliquot }
            : {}),
          ...(input.interstateAliquot !== undefined
            ? { interstateAliquot: input.interstateAliquot }
            : {}),
          ...(input.fcpAliquot !== undefined
            ? { fcpAliquot: input.fcpAliquot }
            : {}),
          ...(input.borders !== undefined ? { borders: input.borders } : {}),
          ...(input.embedTax !== undefined ? { embedTax: input.embedTax } : {}),
          ...(input.ibs_uf_tax !== undefined
            ? { ibs_uf_tax: input.ibs_uf_tax }
            : {}),
          ...(input.ibs_municipal_tax !== undefined
            ? { ibs_municipal_tax: input.ibs_municipal_tax }
            : {}),
          ...(input.countryId !== undefined
            ? { countryId: input.countryId }
            : {}),
          ...touchUpdatedAt(now),
        })
        .where(and(eq(states.id, stateId), isNull(states.deletedAt)))
        .returning();
      if (!row) {
        throw new NotFoundError("Estado nao encontrado", "STATE_NOT_FOUND");
      }
      invalidateReferenceStates();
      await recordEntityAudit({
        entityType: EntityTypes.STATES,
        entityId: stateId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Estado em conflito (sigla duplicada no pais)",
          "STATE_CONFLICT",
        );
      }
      throw err;
    }
  }
}

export const addressesStatesService = new AddressesStatesService();
