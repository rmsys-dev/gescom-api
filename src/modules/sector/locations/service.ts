import { and, asc, count, eq, ilike, inArray } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { locations, sectors } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { assertSectorBelongsToEnterprise } from "../../stock/balance.js";
import {
  locationDetailWith,
  toLocationResponse,
  type LocationWithSector,
} from "../../stock/nested-response.js";
import type {
  CreateLocationInput,
  ListLocationsQuery,
  PatchLocationInput,
} from "./schema.js";

export class LocationsService {
  private enterpriseSectorIds(enterpriseId: string) {
    return db
      .select({ id: sectors.id })
      .from(sectors)
      .where(eq(sectors.enterprisesId, enterpriseId));
  }

  private scopeWhere(
    enterpriseId: string,
    id?: string,
    filters: Pick<
      ListLocationsQuery,
      "box" | "description" | "sectorId" | "status"
    > = {},
  ) {
    const conditions = [
      inArray(locations.sectorId, this.enterpriseSectorIds(enterpriseId)),
    ];
    if (id) conditions.push(eq(locations.id, id));
    if (filters.box) {
      conditions.push(ilike(locations.box, `%${filters.box}%`));
    }
    if (filters.description) {
      conditions.push(ilike(locations.description, `%${filters.description}%`));
    }
    if (filters.sectorId) {
      conditions.push(eq(locations.sectorId, filters.sectorId));
    }
    if (filters.status) {
      conditions.push(eq(locations.status, filters.status));
    }
    return and(...conditions);
  }

  private async getPlainById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select({
          id: locations.id,
          box: locations.box,
          description: locations.description,
          sectorId: locations.sectorId,
          status: locations.status,
          createdAt: locations.createdAt,
          updatedAt: locations.updatedAt,
        })
        .from(locations)
        .innerJoin(sectors, eq(locations.sectorId, sectors.id))
        .where(
          and(eq(sectors.enterprisesId, enterpriseId), eq(locations.id, id)),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Locacao fisica de estoque nao encontrada",
        "LOCATION_NOT_FOUND",
      );
    }
    return row;
  }

  public async list(enterpriseId: string, query: ListLocationsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scopeWhere(enterpriseId, undefined, {
      box: query.box,
      description: query.description,
      sectorId: query.sectorId,
      status: query.status,
    });
    const [items, totalRows] = await Promise.all([
      db.query.locations.findMany({
        where,
        with: locationDetailWith,
        orderBy: [asc(locations.box), asc(locations.id)],
        limit,
        offset,
      }),
      db.select({ c: count() }).from(locations).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return {
      items: items.map((row) =>
        toLocationResponse(row as LocationWithSector),
      ),
      total,
      limit,
      offset,
    };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = await db.query.locations.findFirst({
      where: this.scopeWhere(enterpriseId, id),
      with: locationDetailWith,
    });
    if (!row) {
      throw new NotFoundError(
        "Locacao fisica de estoque nao encontrada",
        "LOCATION_NOT_FOUND",
      );
    }
    return toLocationResponse(row as LocationWithSector);
  }

  public async create(
    enterpriseId: string,
    input: CreateLocationInput,
    audit: EntityAuditContext,
  ) {
    await assertSectorBelongsToEnterprise(enterpriseId, input.sectorId);
    try {
      const [row] = await db
        .insert(locations)
        .values({
          box: input.box?.trim() ?? null,
          description: input.description?.trim() ?? null,
          sectorId: input.sectorId,
          status: input.status ?? "ATIVO",
        })
        .returning();
      if (!row) throw new Error("Falha ao criar locacao fisica de estoque");
      await recordCreateAudit({
        entityType: EntityTypes.LOCATIONS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return this.getById(enterpriseId, row.id);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Codigo de locacao ja existe no setor",
          "LOCATION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchLocationInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getPlainById(enterpriseId, id);
    if (input.sectorId) {
      await assertSectorBelongsToEnterprise(enterpriseId, input.sectorId);
    }
    try {
      const [row] = await db
        .update(locations)
        .set({
          ...(input.box !== undefined ? { box: input.box.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() ?? null }
            : {}),
          ...(input.sectorId !== undefined ? { sectorId: input.sectorId } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedAt: new Date(),
        })
        .where(eq(locations.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Locacao fisica de estoque nao encontrada",
          "LOCATION_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.LOCATIONS,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return this.getById(enterpriseId, id);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Codigo de locacao ja existe no setor",
          "LOCATION_CONFLICT",
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
    const existing = await this.getPlainById(enterpriseId, id);
    const [row] = await db
      .delete(locations)
      .where(eq(locations.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Locacao fisica de estoque nao encontrada",
        "LOCATION_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.LOCATIONS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const locationsService = new LocationsService();
