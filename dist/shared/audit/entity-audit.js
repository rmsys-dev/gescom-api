import { db, entityAuditLog } from "../../db/schema.js";
import { LogEvents } from "../logging/log-events.js";
import { logError } from "../logging/logger.js";
import { buildFieldDiff, toAuditRecord } from "./build-field-diff.js";
export const writeEntityAudit = async (input, tx) => {
    const executor = tx ?? db;
    try {
        await executor.insert(entityAuditLog).values({
            entityType: input.entityType,
            entityId: input.entityId,
            action: input.action,
            changes: input.changes ?? null,
            actorUserId: input.actorUserId ?? null,
            actorMemberId: input.actorMemberId ?? null,
            enterpriseId: input.enterpriseId ?? null,
            requestId: input.requestId ?? null,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
            source: input.source ?? null,
            reason: input.reason ?? null,
        });
    }
    catch (error) {
        logError({
            event: LogEvents.ENTITY_AUDIT_WRITE_FAILED,
            requestId: input.requestId,
            entityType: input.entityType,
            entityId: input.entityId,
            action: input.action,
            source: input.source,
            reason: error instanceof Error ? error.message : "unknown",
        });
    }
};
/** Registra auditoria com diff automático entre before/after. */
export const recordEntityAudit = async (input) => {
    const changes = buildFieldDiff(input.before, input.after, input.keys);
    if (input.action === "UPDATE" &&
        Object.keys(changes.fields).length === 0) {
        return;
    }
    await writeEntityAudit({
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        changes,
        ...input.ctx,
    }, input.tx);
};
/** Atalho para criação (POST) com snapshot do registro criado. */
export const recordCreateAudit = async (params) => {
    await writeEntityAudit({
        entityType: params.entityType,
        entityId: params.entityId,
        action: "CREATE",
        changes: { after: toAuditRecord(params.after) },
        ...params.ctx,
    }, params.tx);
};
/** Mescla enterpriseId no contexto de auditoria. */
export const withEnterpriseAuditContext = (audit, enterpriseId) => ({
    ...audit,
    enterpriseId: audit.enterpriseId ?? enterpriseId,
});
/** Atalho para soft delete com diff de lifecycle. */
export const recordSoftDeleteAudit = async (params) => {
    await recordEntityAudit({
        entityType: params.entityType,
        entityId: params.entityId,
        action: "SOFT_DELETE",
        before: toAuditRecord(params.before),
        after: toAuditRecord(params.after),
        keys: ["deletedAt", "updatedAt", "status"],
        ctx: params.ctx,
        tx: params.tx,
    });
};
export { buildFieldDiff, toAuditRecord };
