import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsEnterprises, sectorsRental } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
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
import {
  getProductEnterpriseForStock,
  assertLocationBelongsToEnterprise,
} from "../../stock/balance.js";
import {
  locationDetailWith,
  toLocationResponse,
  type LocationWithSector,
} from "../../stock/nested-response.js";
import type {
  CreateSectorRentalInput,
  ListSectorsRentalQuery,
  PatchSectorRentalInput,
} from "./schema.js";

type SectorRentalWithRelations = typeof sectorsRental.$inferSelect & {
  productsEnterprises: typeof productsEnterprises.$inferSelect;
  location: LocationWithSector;
};

export class SectorsRentalService {
  private toResponse(row: SectorRentalWithRelations) {
    const {
      productsEnterprisesId: _productsEnterprisesId,
      locationsId: _locationsId,
      productsEnterprises: productsEnterprisesRow,
      location: locationRow,
      ...rest
    } = row;
    return {
      ...rest,
      productsEnterprises: productsEnterprisesRow,
      location: toLocationResponse(locationRow),
    };
  }

  private enterpriseProductsEnterprisesIds(enterpriseId: string) {
    return db
      .select({ id: productsEnterprises.id })
      .from(productsEnterprises)
      .where(eq(productsEnterprises.enterprisesId, enterpriseId));
  }

  private scopeWhere(enterpriseId: string, id?: string) {
    const conditions = [
      inArray(
        sectorsRental.productsEnterprisesId,
        this.enterpriseProductsEnterprisesIds(enterpriseId),
      ),
    ];
    if (id) conditions.push(eq(sectorsRental.id, id));
    return and(...conditions);
  }

  private async assertRefs(
    enterpriseId: string,
    input: { productsEnterprisesId: string; locationsId: string },
  ) {
    const pe = await getProductEnterpriseForStock(
      enterpriseId,
      input.productsEnterprisesId,
    );
    if (pe.controlsBatch) {
      throw new ValidationError(
        [
          {
            path: "body.productsEnterprisesId",
            message:
              "Produto com lote deve usar locacao em /stock-batch-balances",
          },
        ],
        "Use locacao por lote",
      );
    }
    await assertLocationBelongsToEnterprise(enterpriseId, input.locationsId);
  }

  private async getPlainById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select({
          id: sectorsRental.id,
          productsEnterprisesId: sectorsRental.productsEnterprisesId,
          locationsId: sectorsRental.locationsId,
          createdAt: sectorsRental.createdAt,
          updatedAt: sectorsRental.updatedAt,
        })
        .from(sectorsRental)
        .innerJoin(
          productsEnterprises,
          eq(sectorsRental.productsEnterprisesId, productsEnterprises.id),
        )
        .where(
          and(
            eq(productsEnterprises.enterprisesId, enterpriseId),
            eq(sectorsRental.id, id),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Locacao de estoque nao encontrada",
        "SECTOR_RENTAL_NOT_FOUND",
      );
    }
    return row;
  }

  public async list(enterpriseId: string, query: ListSectorsRentalQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scopeWhere(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db.query.sectorsRental.findMany({
        where,
        with: {
          productsEnterprises: true,
          location: {
            with: locationDetailWith,
          },
        },
        orderBy: [asc(sectorsRental.id)],
        limit,
        offset,
      }),
      db.select({ c: count() }).from(sectorsRental).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return {
      items: items.map((row) => this.toResponse(row as SectorRentalWithRelations)),
      total,
      limit,
      offset,
    };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = await db.query.sectorsRental.findFirst({
      where: this.scopeWhere(enterpriseId, id),
      with: {
        productsEnterprises: true,
        location: {
          with: locationDetailWith,
        },
      },
    });
    if (!row) {
      throw new NotFoundError(
        "Locacao de estoque nao encontrada",
        "SECTOR_RENTAL_NOT_FOUND",
      );
    }
    return this.toResponse(row as SectorRentalWithRelations);
  }

  public async create(
    enterpriseId: string,
    input: CreateSectorRentalInput,
    audit: EntityAuditContext,
  ) {
    await this.assertRefs(enterpriseId, input);
    try {
      const [row] = await db
        .insert(sectorsRental)
        .values({
          productsEnterprisesId: input.productsEnterprisesId,
          locationsId: input.locationsId,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar locacao de estoque");
      await recordCreateAudit({
        entityType: EntityTypes.SECTORS_RENTAL,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return this.getById(enterpriseId, row.id);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Locacao ja existe para produto e local",
          "SECTOR_RENTAL_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchSectorRentalInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getPlainById(enterpriseId, id);
    await this.assertRefs(enterpriseId, {
      productsEnterprisesId:
        input.productsEnterprisesId ?? existing.productsEnterprisesId,
      locationsId: input.locationsId ?? existing.locationsId,
    });
    try {
      const [row] = await db
        .update(sectorsRental)
        .set({
          ...(input.productsEnterprisesId !== undefined
            ? { productsEnterprisesId: input.productsEnterprisesId }
            : {}),
          ...(input.locationsId !== undefined
            ? { locationsId: input.locationsId }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(sectorsRental.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Locacao de estoque nao encontrada",
          "SECTOR_RENTAL_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.SECTORS_RENTAL,
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
          "Locacao ja existe para produto e local",
          "SECTOR_RENTAL_CONFLICT",
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
      .delete(sectorsRental)
      .where(eq(sectorsRental.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Locacao de estoque nao encontrada",
        "SECTOR_RENTAL_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.SECTORS_RENTAL,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const sectorsRentalService = new SectorsRentalService();
