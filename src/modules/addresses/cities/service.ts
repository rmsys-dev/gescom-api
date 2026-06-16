import { and, asc, eq, isNull } from "drizzle-orm";
import { db, cities } from "../../../db/schema.js";
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
  ConflictError,
  InternalServerError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  assertNoActiveCepsForCity,
  isPostgresUniqueViolation,
  requireActiveState,
} from "../shared/address-helpers.js";
import type {
  CreateCityInput,
  ListCitiesQuery,
  PatchCityInput,
} from "./schema.js";

export class AddressesCitiesService {
  public async list(query: ListCitiesQuery) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [isNull(cities.deletedAt)];

    if (query.stateId !== undefined) {
      conditions.push(eq(cities.stateId, query.stateId));
    }

    const whereClause = and(...conditions);

    const [items, total] = await Promise.all([
      db.query.cities.findMany({
        where: whereClause,
        orderBy: [asc(cities.citieName), asc(cities.id)],
        limit,
        offset,
      }),
      countRowsWhere(cities, whereClause),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  public async create(input: CreateCityInput, audit: EntityAuditContext) {
    await requireActiveState(input.stateId);
    try {
      const [row] = await db
        .insert(cities)
        .values({
          ibgeCode: input.ibgeCode,
          citieName: input.citieName.trim(),
          citieCode: input.citieCode,
          citieDigit: input.citieDigit,
          ibs_municipal_tax: input.ibs_municipal_tax,
          stateId: input.stateId,
        })
        .returning();
      if (!row) {
        throw new InternalServerError("Falha ao criar cidade");
      }
      await recordCreateAudit({
        entityType: EntityTypes.CITIES,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Cidade em conflito (codigo IBGE ou nome duplicado)",
          "CITY_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    cityId: string,
    input: PatchCityInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(cities)
      .where(and(eq(cities.id, cityId), isNull(cities.deletedAt)))
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError("Cidade nao encontrada", "CITY_NOT_FOUND");
    }

    const now = new Date();

    if (input.softDelete === true) {
      await assertNoActiveCepsForCity(cityId);
      const [row] = await db
        .update(cities)
        .set(softDeleteValues(now))
        .where(and(eq(cities.id, cityId), isNull(cities.deletedAt)))
        .returning();
      if (!row) {
        throw new NotFoundError("Cidade nao encontrada", "CITY_NOT_FOUND");
      }
      await recordSoftDeleteAudit({
        entityType: EntityTypes.CITIES,
        entityId: cityId,
        before: existing,
        after: row,
        ctx: audit,
      });
      return row;
    }

    if (input.stateId !== undefined) {
      await requireActiveState(input.stateId);
    }

    try {
      const [row] = await db
        .update(cities)
        .set({
          ...(input.ibgeCode !== undefined ? { ibgeCode: input.ibgeCode } : {}),
          ...(input.citieName !== undefined
            ? { citieName: input.citieName.trim() }
            : {}),
          ...(input.citieCode !== undefined
            ? { citieCode: input.citieCode }
            : {}),
          ...(input.citieDigit !== undefined
            ? { citieDigit: input.citieDigit }
            : {}),
          ...(input.ibs_municipal_tax !== undefined
            ? { ibs_municipal_tax: input.ibs_municipal_tax }
            : {}),
          ...(input.stateId !== undefined ? { stateId: input.stateId } : {}),
          ...touchUpdatedAt(now),
        })
        .where(and(eq(cities.id, cityId), isNull(cities.deletedAt)))
        .returning();
      if (!row) {
        throw new NotFoundError("Cidade nao encontrada", "CITY_NOT_FOUND");
      }
      await recordEntityAudit({
        entityType: EntityTypes.CITIES,
        entityId: cityId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Cidade em conflito (codigo IBGE ou nome duplicado)",
          "CITY_CONFLICT",
        );
      }
      throw err;
    }
  }
}

export const addressesCitiesService = new AddressesCitiesService();
