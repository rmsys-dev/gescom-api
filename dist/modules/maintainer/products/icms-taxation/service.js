import { eq } from "drizzle-orm";
import { db, icmsTaxation } from "../../../../db/schema.js";
import { ConflictError, NotFoundError, } from "../../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../../shared/db/postgres-errors.js";
import { recordCreateAudit, recordEntityAudit, } from "../../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
export class MaintainerIcmsTaxationService {
    async getById(id) {
        const rows = await db
            .select()
            .from(icmsTaxation)
            .where(eq(icmsTaxation.id, id))
            .limit(1);
        const row = rows[0];
        if (!row) {
            throw new NotFoundError("Tributacao do ICMS nao encontrada", "ICMS_TAXATION_NOT_FOUND");
        }
        return row;
    }
    async create(input, audit) {
        try {
            const [row] = await db
                .insert(icmsTaxation)
                .values({
                icms: input.icms.trim(),
                description: input.description.trim(),
                icmsRate: (input.icmsRate ?? 0).toString(),
                simplesIcmsRate: (input.simplesIcmsRate ?? 0).toString(),
            })
                .returning();
            if (!row) {
                throw new Error("Falha ao criar tributacao do ICMS");
            }
            await recordCreateAudit({
                entityType: EntityTypes.ICMS_TAXATION,
                entityId: row.id,
                after: row,
                ctx: audit,
            });
            return row;
        }
        catch (err) {
            if (isPostgresUniqueViolation(err)) {
                throw new ConflictError("Tributacao do ICMS em conflito (icms duplicado)", "ICMS_TAXATION_CONFLICT");
            }
            throw err;
        }
    }
    async patch(icmsTaxationId, input, audit) {
        const existing = await this.getById(icmsTaxationId);
        const now = new Date();
        try {
            const [row] = await db
                .update(icmsTaxation)
                .set({
                ...(input.icms !== undefined ? { icms: input.icms.trim() } : {}),
                ...(input.description !== undefined
                    ? { description: input.description.trim() }
                    : {}),
                ...(input.icmsRate !== undefined
                    ? { icmsRate: input.icmsRate.toString() }
                    : {}),
                ...(input.simplesIcmsRate !== undefined
                    ? { simplesIcmsRate: input.simplesIcmsRate.toString() }
                    : {}),
                updatedAt: now,
            })
                .where(eq(icmsTaxation.id, icmsTaxationId))
                .returning();
            if (!row) {
                throw new NotFoundError("Tributacao do ICMS nao encontrada", "ICMS_TAXATION_NOT_FOUND");
            }
            await recordEntityAudit({
                entityType: EntityTypes.ICMS_TAXATION,
                entityId: icmsTaxationId,
                action: "UPDATE",
                before: toAuditRecord(existing),
                after: toAuditRecord(row),
                ctx: audit,
            });
            return row;
        }
        catch (err) {
            if (isPostgresUniqueViolation(err)) {
                throw new ConflictError("Tributacao do ICMS em conflito (icms duplicado)", "ICMS_TAXATION_CONFLICT");
            }
            throw err;
        }
    }
    async delete(icmsTaxationId, audit) {
        const existing = await this.getById(icmsTaxationId);
        const [row] = await db
            .delete(icmsTaxation)
            .where(eq(icmsTaxation.id, icmsTaxationId))
            .returning();
        if (!row) {
            throw new NotFoundError("Tributacao do ICMS nao encontrada", "ICMS_TAXATION_NOT_FOUND");
        }
        await recordEntityAudit({
            entityType: EntityTypes.ICMS_TAXATION,
            entityId: icmsTaxationId,
            action: "DELETE",
            before: toAuditRecord(existing),
            after: toAuditRecord(row),
            ctx: audit,
        });
        return row;
    }
}
export const maintainerIcmsTaxationService = new MaintainerIcmsTaxationService();
