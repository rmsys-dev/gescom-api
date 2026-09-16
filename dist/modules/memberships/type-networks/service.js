import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { typeNetworks } from "../../../db/schema.js";
import { recordCreateAudit, recordEntityAudit, } from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import { ConflictError, NotFoundError, } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
export class TypeNetworksService {
    async list(query = {}) {
        const { limit, offset } = resolveListPagination(query);
        const [items, totalRows] = await Promise.all([
            db
                .select()
                .from(typeNetworks)
                .orderBy(asc(typeNetworks.description), asc(typeNetworks.id))
                .limit(limit)
                .offset(offset),
            db.select({ c: count() }).from(typeNetworks),
        ]);
        const total = Number(totalRows[0]?.c ?? 0);
        return { items, total, limit, offset };
    }
    async getById(id) {
        const row = (await db
            .select()
            .from(typeNetworks)
            .where(eq(typeNetworks.id, id))
            .limit(1))[0];
        if (!row) {
            throw new NotFoundError("Tipo de rede nao encontrado", "TYPE_NETWORK_NOT_FOUND");
        }
        return row;
    }
    async create(input, audit) {
        try {
            const [row] = await db
                .insert(typeNetworks)
                .values({
                description: input.description.trim(),
                status: input.status ?? "ATIVO",
            })
                .returning();
            if (!row)
                throw new Error("Falha ao criar tipo de rede");
            await recordCreateAudit({
                entityType: EntityTypes.TYPE_NETWORKS,
                entityId: row.id,
                after: row,
                ctx: audit,
            });
            return row;
        }
        catch (err) {
            if (isPostgresUniqueViolation(err)) {
                throw new ConflictError("Tipo de rede em conflito (descricao duplicada)", "TYPE_NETWORK_CONFLICT");
            }
            throw err;
        }
    }
    async patch(id, input, audit) {
        const existing = await this.getById(id);
        try {
            const [row] = await db
                .update(typeNetworks)
                .set({
                ...(input.description !== undefined
                    ? { description: input.description.trim() }
                    : {}),
                ...(input.status !== undefined ? { status: input.status } : {}),
                updatedAt: new Date(),
            })
                .where(eq(typeNetworks.id, id))
                .returning();
            if (!row) {
                throw new NotFoundError("Tipo de rede nao encontrado", "TYPE_NETWORK_NOT_FOUND");
            }
            await recordEntityAudit({
                entityType: EntityTypes.TYPE_NETWORKS,
                entityId: id,
                action: "UPDATE",
                before: toAuditRecord(existing),
                after: toAuditRecord(row),
                ctx: audit,
            });
            return row;
        }
        catch (err) {
            if (isPostgresUniqueViolation(err)) {
                throw new ConflictError("Tipo de rede em conflito (descricao duplicada)", "TYPE_NETWORK_CONFLICT");
            }
            throw err;
        }
    }
    async delete(id, audit) {
        const existing = await this.getById(id);
        const [row] = await db
            .delete(typeNetworks)
            .where(eq(typeNetworks.id, id))
            .returning();
        if (!row) {
            throw new NotFoundError("Tipo de rede nao encontrado", "TYPE_NETWORK_NOT_FOUND");
        }
        await recordEntityAudit({
            entityType: EntityTypes.TYPE_NETWORKS,
            entityId: id,
            action: "DELETE",
            before: toAuditRecord(existing),
            after: toAuditRecord(row),
            ctx: audit,
        });
        return row;
    }
}
export const typeNetworksService = new TypeNetworksService();
