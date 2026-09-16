import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { icmsTaxation, pisCofinsSituation, productTaxation, } from "../../../db/schema.js";
import { ConflictError, NotFoundError, } from "../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import { recordCreateAudit, recordEntityAudit, } from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
const productTaxationDetailWith = {
    cstPisEntrada: true,
    cstPisSaida: true,
    cstCofinsEntrada: true,
    cstCofinsSaida: true,
    icmsTaxation: true,
};
export class ProductTaxationService {
    toResponse(row) {
        const { cstPisEntradaId: _cstPisEntradaId, cstPisSaidaId: _cstPisSaidaId, cstCofinsEntradaId: _cstCofinsEntradaId, cstCofinsSaidaId: _cstCofinsSaidaId, icmsTaxationId: _icmsTaxationId, cstPisEntrada, cstPisSaida, cstCofinsEntrada, cstCofinsSaida, icmsTaxation: icmsTaxationRow, ...rest } = row;
        return {
            ...rest,
            cstPisEntrada,
            cstPisSaida,
            cstCofinsEntrada,
            cstCofinsSaida,
            icmsTaxation: icmsTaxationRow,
        };
    }
    async assertIcmsExists(icmsTaxationId) {
        const row = (await db
            .select({ id: icmsTaxation.id })
            .from(icmsTaxation)
            .where(eq(icmsTaxation.id, icmsTaxationId))
            .limit(1))[0];
        if (!row) {
            throw new NotFoundError("Tributacao do ICMS nao encontrada", "ICMS_TAXATION_NOT_FOUND");
        }
    }
    async assertPisCofinsSituationExists(pisCofinsSituationId) {
        const row = (await db
            .select({ id: pisCofinsSituation.id })
            .from(pisCofinsSituation)
            .where(eq(pisCofinsSituation.id, pisCofinsSituationId))
            .limit(1))[0];
        if (!row) {
            throw new NotFoundError("Situacao PIS/COFINS nao encontrada", "PIS_COFINS_SITUATION_NOT_FOUND");
        }
    }
    async assertPisCofinsSituationsExist(ids) {
        await Promise.all(ids.map((id) => this.assertPisCofinsSituationExists(id)));
    }
    async getPlainById(id) {
        const row = (await db
            .select()
            .from(productTaxation)
            .where(eq(productTaxation.id, id))
            .limit(1))[0];
        if (!row) {
            throw new NotFoundError("Tributacao do produto nao encontrada", "PRODUCT_TAXATION_NOT_FOUND");
        }
        return row;
    }
    async list(query = {}) {
        const { limit, offset } = resolveListPagination(query);
        const [items, totalRows] = await Promise.all([
            db.query.productTaxation.findMany({
                with: productTaxationDetailWith,
                orderBy: [asc(productTaxation.id)],
                limit,
                offset,
            }),
            db.select({ c: count() }).from(productTaxation),
        ]);
        const total = Number(totalRows[0]?.c ?? 0);
        return {
            items: items.map((row) => this.toResponse(row)),
            total,
            limit,
            offset,
        };
    }
    async getById(id) {
        const row = await db.query.productTaxation.findFirst({
            where: eq(productTaxation.id, id),
            with: productTaxationDetailWith,
        });
        if (!row) {
            throw new NotFoundError("Tributacao do produto nao encontrada", "PRODUCT_TAXATION_NOT_FOUND");
        }
        return this.toResponse(row);
    }
    async create(input, audit) {
        await Promise.all([
            this.assertIcmsExists(input.icmsTaxationId),
            this.assertPisCofinsSituationsExist([
                input.cstPisEntradaId,
                input.cstPisSaidaId,
                input.cstCofinsEntradaId,
                input.cstCofinsSaidaId,
            ]),
        ]);
        try {
            const [row] = await db
                .insert(productTaxation)
                .values({
                cstPisEntradaId: input.cstPisEntradaId,
                cstPisSaidaId: input.cstPisSaidaId,
                cstCofinsEntradaId: input.cstCofinsEntradaId,
                cstCofinsSaidaId: input.cstCofinsSaidaId,
                icmsTaxationId: input.icmsTaxationId,
            })
                .returning();
            if (!row)
                throw new Error("Falha ao criar tributacao do produto");
            await recordCreateAudit({
                entityType: EntityTypes.PRODUCT_TAXATION,
                entityId: row.id,
                after: row,
                ctx: audit,
            });
            return this.getById(row.id);
        }
        catch (err) {
            if (isPostgresUniqueViolation(err)) {
                throw new ConflictError("Tributacao do produto em conflito (combinacao de CST PIS/COFINS e ICMS duplicada)", "PRODUCT_TAXATION_CONFLICT");
            }
            throw err;
        }
    }
    async patch(id, input, audit) {
        const existing = await this.getPlainById(id);
        if (input.icmsTaxationId) {
            await this.assertIcmsExists(input.icmsTaxationId);
        }
        const pisCofinsIds = [
            input.cstPisEntradaId,
            input.cstPisSaidaId,
            input.cstCofinsEntradaId,
            input.cstCofinsSaidaId,
        ].filter((value) => value !== undefined);
        if (pisCofinsIds.length > 0) {
            await this.assertPisCofinsSituationsExist(pisCofinsIds);
        }
        try {
            const [row] = await db
                .update(productTaxation)
                .set({
                ...(input.cstPisEntradaId !== undefined
                    ? { cstPisEntradaId: input.cstPisEntradaId }
                    : {}),
                ...(input.cstPisSaidaId !== undefined
                    ? { cstPisSaidaId: input.cstPisSaidaId }
                    : {}),
                ...(input.cstCofinsEntradaId !== undefined
                    ? { cstCofinsEntradaId: input.cstCofinsEntradaId }
                    : {}),
                ...(input.cstCofinsSaidaId !== undefined
                    ? { cstCofinsSaidaId: input.cstCofinsSaidaId }
                    : {}),
                ...(input.icmsTaxationId !== undefined
                    ? { icmsTaxationId: input.icmsTaxationId }
                    : {}),
                updatedAt: new Date(),
            })
                .where(eq(productTaxation.id, id))
                .returning();
            if (!row) {
                throw new NotFoundError("Tributacao do produto nao encontrada", "PRODUCT_TAXATION_NOT_FOUND");
            }
            await recordEntityAudit({
                entityType: EntityTypes.PRODUCT_TAXATION,
                entityId: id,
                action: "UPDATE",
                before: toAuditRecord(existing),
                after: toAuditRecord(row),
                ctx: audit,
            });
            return this.getById(id);
        }
        catch (err) {
            if (isPostgresUniqueViolation(err)) {
                throw new ConflictError("Tributacao do produto em conflito (combinacao de CST PIS/COFINS e ICMS duplicada)", "PRODUCT_TAXATION_CONFLICT");
            }
            throw err;
        }
    }
    async delete(id, audit) {
        const existing = await this.getPlainById(id);
        const [row] = await db
            .delete(productTaxation)
            .where(eq(productTaxation.id, id))
            .returning();
        if (!row) {
            throw new NotFoundError("Tributacao do produto nao encontrada", "PRODUCT_TAXATION_NOT_FOUND");
        }
        await recordEntityAudit({
            entityType: EntityTypes.PRODUCT_TAXATION,
            entityId: id,
            action: "DELETE",
            before: toAuditRecord(existing),
            after: toAuditRecord(row),
            ctx: audit,
        });
        return row;
    }
}
export const productTaxationService = new ProductTaxationService();
