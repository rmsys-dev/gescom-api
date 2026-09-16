import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsEnterprises, sectorsRental } from "../../../db/schema.js";
import { ConflictError, NotFoundError, ValidationError, } from "../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import { recordCreateAudit, recordEntityAudit, } from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { getProductEnterpriseForStock, assertLocationBelongsToEnterprise, } from "../../stock/balance.js";
import { productRequiresStockLocation } from "../../stock/stock-location.js";
import { locationDetailWith, toLocationResponse, } from "../../stock/nested-response.js";
export class SectorsRentalService {
    toResponse(row) {
        const { productsEnterprisesId: _productsEnterprisesId, locationsId: _locationsId, productsEnterprises: productsEnterprisesRow, location: locationRow, ...rest } = row;
        return {
            ...rest,
            productsEnterprises: productsEnterprisesRow,
            location: toLocationResponse(locationRow),
        };
    }
    enterpriseProductsEnterprisesIds(enterpriseId) {
        return db
            .select({ id: productsEnterprises.id })
            .from(productsEnterprises)
            .where(eq(productsEnterprises.enterprisesId, enterpriseId));
    }
    scopeWhere(enterpriseId, id) {
        const conditions = [
            inArray(sectorsRental.productsEnterprisesId, this.enterpriseProductsEnterprisesIds(enterpriseId)),
        ];
        if (id)
            conditions.push(eq(sectorsRental.id, id));
        return and(...conditions);
    }
    async assertRefs(enterpriseId, input) {
        const pe = await getProductEnterpriseForStock(enterpriseId, input.productsEnterprisesId);
        if (!productRequiresStockLocation(pe)) {
            throw new ValidationError([
                {
                    path: "body.productsEnterprisesId",
                    message: "Produto sem controle de locacao nao aceita vinculo de locacao",
                },
            ], "Locacao nao permitida");
        }
        await assertLocationBelongsToEnterprise(enterpriseId, input.locationsId);
    }
    async getPlainById(enterpriseId, id) {
        const row = (await db
            .select({
            id: sectorsRental.id,
            productsEnterprisesId: sectorsRental.productsEnterprisesId,
            locationsId: sectorsRental.locationsId,
            createdAt: sectorsRental.createdAt,
            updatedAt: sectorsRental.updatedAt,
        })
            .from(sectorsRental)
            .innerJoin(productsEnterprises, eq(sectorsRental.productsEnterprisesId, productsEnterprises.id))
            .where(and(eq(productsEnterprises.enterprisesId, enterpriseId), eq(sectorsRental.id, id)))
            .limit(1))[0];
        if (!row) {
            throw new NotFoundError("Locacao de estoque nao encontrada", "SECTOR_RENTAL_NOT_FOUND");
        }
        return row;
    }
    async list(enterpriseId, query = {}) {
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
            items: items.map((row) => this.toResponse(row)),
            total,
            limit,
            offset,
        };
    }
    async getById(enterpriseId, id) {
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
            throw new NotFoundError("Locacao de estoque nao encontrada", "SECTOR_RENTAL_NOT_FOUND");
        }
        return this.toResponse(row);
    }
    async create(enterpriseId, input, audit) {
        await this.assertRefs(enterpriseId, input);
        try {
            const [row] = await db
                .insert(sectorsRental)
                .values({
                productsEnterprisesId: input.productsEnterprisesId,
                locationsId: input.locationsId,
            })
                .returning();
            if (!row)
                throw new Error("Falha ao criar locacao de estoque");
            await recordCreateAudit({
                entityType: EntityTypes.SECTORS_RENTAL,
                entityId: row.id,
                after: row,
                ctx: audit,
            });
            return this.getById(enterpriseId, row.id);
        }
        catch (err) {
            if (isPostgresUniqueViolation(err)) {
                throw new ConflictError("Locação já vinculada a este produto e local.", "SECTOR_RENTAL_CONFLICT");
            }
            throw err;
        }
    }
    async patch(enterpriseId, id, input, audit) {
        const existing = await this.getPlainById(enterpriseId, id);
        await this.assertRefs(enterpriseId, {
            productsEnterprisesId: input.productsEnterprisesId ?? existing.productsEnterprisesId,
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
                throw new NotFoundError("Locacao de estoque nao encontrada", "SECTOR_RENTAL_NOT_FOUND");
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
        }
        catch (err) {
            if (isPostgresUniqueViolation(err)) {
                throw new ConflictError("Locação já vinculada a este produto e local.", "SECTOR_RENTAL_CONFLICT");
            }
            throw err;
        }
    }
    async delete(enterpriseId, id, audit) {
        const existing = await this.getPlainById(enterpriseId, id);
        const [row] = await db
            .delete(sectorsRental)
            .where(eq(sectorsRental.id, id))
            .returning();
        if (!row) {
            throw new NotFoundError("Locacao de estoque nao encontrada", "SECTOR_RENTAL_NOT_FOUND");
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
