import { eq } from "drizzle-orm";
import { db, productsCest } from "../../../../db/schema.js";
import { ConflictError, NotFoundError, } from "../../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../../shared/db/postgres-errors.js";
import { recordCreateAudit, recordEntityAudit, } from "../../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
export class MaintainerProductsCestService {
    async getById(id) {
        const rows = await db
            .select()
            .from(productsCest)
            .where(eq(productsCest.id, id))
            .limit(1);
        const row = rows[0];
        if (!row) {
            throw new NotFoundError("CEST de produto nao encontrado", "PRODUCTS_CEST_NOT_FOUND");
        }
        return row;
    }
    async create(input, audit) {
        try {
            const [row] = await db
                .insert(productsCest)
                .values({
                cest: input.cest,
                description: input.description.trim(),
                productsNcmId: input.productsNcmId,
            })
                .returning();
            if (!row) {
                throw new Error("Falha ao criar CEST de produto");
            }
            await recordCreateAudit({
                entityType: EntityTypes.PRODUCTS_CEST,
                entityId: row.id,
                after: row,
                ctx: audit,
            });
            return row;
        }
        catch (err) {
            if (isPostgresUniqueViolation(err)) {
                throw new ConflictError("CEST de produto em conflito (cest duplicado)", "PRODUCTS_CEST_CONFLICT");
            }
            throw err;
        }
    }
    async patch(productsCestId, input, audit) {
        const existing = await this.getById(productsCestId);
        const now = new Date();
        try {
            const [row] = await db
                .update(productsCest)
                .set({
                ...(input.cest !== undefined ? { cest: input.cest } : {}),
                ...(input.description !== undefined
                    ? { description: input.description.trim() }
                    : {}),
                ...(input.productsNcmId !== undefined
                    ? { productsNcmId: input.productsNcmId }
                    : {}),
                updatedAt: now,
            })
                .where(eq(productsCest.id, productsCestId))
                .returning();
            if (!row) {
                throw new NotFoundError("CEST de produto nao encontrado", "PRODUCTS_CEST_NOT_FOUND");
            }
            await recordEntityAudit({
                entityType: EntityTypes.PRODUCTS_CEST,
                entityId: productsCestId,
                action: "UPDATE",
                before: toAuditRecord(existing),
                after: toAuditRecord(row),
                ctx: audit,
            });
            return row;
        }
        catch (err) {
            if (isPostgresUniqueViolation(err)) {
                throw new ConflictError("CEST de produto em conflito (cest duplicado)", "PRODUCTS_CEST_CONFLICT");
            }
            throw err;
        }
    }
    async delete(productsCestId, audit) {
        const existing = await this.getById(productsCestId);
        const [row] = await db
            .delete(productsCest)
            .where(eq(productsCest.id, productsCestId))
            .returning();
        if (!row) {
            throw new NotFoundError("CEST de produto nao encontrado", "PRODUCTS_CEST_NOT_FOUND");
        }
        await recordEntityAudit({
            entityType: EntityTypes.PRODUCTS_CEST,
            entityId: productsCestId,
            action: "DELETE",
            before: toAuditRecord(existing),
            after: toAuditRecord(row),
            ctx: audit,
        });
        return row;
    }
}
export const maintainerProductsCestService = new MaintainerProductsCestService();
