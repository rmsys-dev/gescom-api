import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import { countries } from "../../../db/schema.js";
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
  invalidateReferenceCountries,
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
  assertNoActiveStatesForCountry,
  isPostgresUniqueViolation,
} from "../shared/address-helpers.js";
import type {
  CreateCountryInput,
  ListCountriesQuery,
  PatchCountryInput,
} from "./schema.js";

const fetchAllCountries = () =>
  db.query.countries.findMany({
    where: isNull(countries.deletedAt),
    orderBy: [asc(countries.countryName), asc(countries.id)],
  });

export class AddressesCountriesService {
  public async list(query: ListCountriesQuery) {
    const { limit, offset } = resolveListPagination(query);
    const allItems = await memoryCache.getOrSet(
      referenceCacheKeys.countries,
      REFERENCE_DATA_TTL_MS,
      fetchAllCountries,
    );

    return paginateArray(allItems, limit, offset);
  }

  public async create(input: CreateCountryInput, audit: EntityAuditContext) {
    try {
      const [row] = await db
        .insert(countries)
        .values({
          countryCode: input.countryCode,
          countryName: input.countryName.trim(),
          cbsTax: input.cbsTax,
          isTax: input.isTax,
          ibs_uf_tax: input.ibs_uf_tax,
          ibs_municipal_tax: input.ibs_municipal_tax,
        })
        .returning();
      if (!row) {
        throw new InternalServerError("Falha ao criar pais");
      }
      invalidateReferenceCountries();
      invalidateReferenceStates();
      await recordCreateAudit({
        entityType: EntityTypes.COUNTRIES,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Pais em conflito (codigo duplicado)",
          "COUNTRY_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    countryId: string,
    input: PatchCountryInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(countries)
      .where(and(eq(countries.id, countryId), isNull(countries.deletedAt)))
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError("Pais nao encontrado", "COUNTRY_NOT_FOUND");
    }

    const now = new Date();

    if (input.softDelete === true) {
      await assertNoActiveStatesForCountry(countryId);
      const [row] = await db
        .update(countries)
        .set(softDeleteValues(now))
        .where(and(eq(countries.id, countryId), isNull(countries.deletedAt)))
        .returning();
      if (!row) {
        throw new NotFoundError("Pais nao encontrado", "COUNTRY_NOT_FOUND");
      }
      invalidateReferenceCountries();
      invalidateReferenceStates();
      await recordSoftDeleteAudit({
        entityType: EntityTypes.COUNTRIES,
        entityId: countryId,
        before: existing,
        after: row,
        ctx: audit,
      });
      return row;
    }

    try {
      const [row] = await db
        .update(countries)
        .set({
          ...(input.countryCode !== undefined
            ? { countryCode: input.countryCode }
            : {}),
          ...(input.countryName !== undefined
            ? { countryName: input.countryName.trim() }
            : {}),
          ...(input.cbsTax !== undefined ? { cbsTax: input.cbsTax } : {}),
          ...(input.isTax !== undefined ? { isTax: input.isTax } : {}),
          ...(input.ibs_uf_tax !== undefined
            ? { ibs_uf_tax: input.ibs_uf_tax }
            : {}),
          ...(input.ibs_municipal_tax !== undefined
            ? { ibs_municipal_tax: input.ibs_municipal_tax }
            : {}),
          ...touchUpdatedAt(now),
        })
        .where(and(eq(countries.id, countryId), isNull(countries.deletedAt)))
        .returning();
      if (!row) {
        throw new NotFoundError("Pais nao encontrado", "COUNTRY_NOT_FOUND");
      }
      invalidateReferenceCountries();
      invalidateReferenceStates();
      await recordEntityAudit({
        entityType: EntityTypes.COUNTRIES,
        entityId: countryId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Pais em conflito (codigo duplicado)",
          "COUNTRY_CONFLICT",
        );
      }
      throw err;
    }
  }
}

export const addressesCountriesService = new AddressesCountriesService();
