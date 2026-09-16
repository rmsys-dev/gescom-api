import { and, asc, count, eq, ilike, isNull } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { enterprisesMembers, users, vehicles, vehiclesEnterprisesMembers, } from "../../../db/schema.js";
import { ConflictError, NotFoundError, ValidationError, } from "../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import { recordCreateAudit, recordEntityAudit, withEnterpriseAuditContext, } from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
export class VehiclesEnterprisesMembersService {
    tenantScope(enterpriseId, id) {
        const base = [
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            isNull(enterprisesMembers.deletedAt),
        ];
        if (id)
            base.push(eq(vehiclesEnterprisesMembers.id, id));
        return and(...base);
    }
    async assertVehicleExists(vehiclesId) {
        const row = (await db
            .select({ id: vehicles.id })
            .from(vehicles)
            .where(eq(vehicles.id, vehiclesId))
            .limit(1))[0];
        if (!row) {
            throw new ValidationError([{ path: "body.vehiclesId", message: "Veiculo nao encontrado" }], "Veiculo invalido");
        }
    }
    async assertMemberInEnterprise(enterpriseId, enterprisesMembersId) {
        const row = (await db
            .select({ id: enterprisesMembers.id })
            .from(enterprisesMembers)
            .where(and(eq(enterprisesMembers.id, enterprisesMembersId), eq(enterprisesMembers.enterpriseId, enterpriseId), isNull(enterprisesMembers.deletedAt)))
            .limit(1))[0];
        if (!row) {
            throw new ValidationError([
                {
                    path: "body.enterprisesMembersId",
                    message: "Membro nao encontrado na empresa",
                },
            ], "Membro invalido");
        }
    }
    async list(enterpriseId, query = {}) {
        const { limit, offset } = resolveListPagination(query);
        const filters = [this.tenantScope(enterpriseId)];
        if (query.vehiclesId) {
            filters.push(eq(vehiclesEnterprisesMembers.vehiclesId, query.vehiclesId));
        }
        if (query.enterprisesMembersId) {
            filters.push(eq(vehiclesEnterprisesMembers.enterprisesMembersId, query.enterprisesMembersId));
        }
        if (query.status) {
            filters.push(eq(vehiclesEnterprisesMembers.status, query.status));
        }
        if (query.plate) {
            filters.push(ilike(vehicles.plate, `%${query.plate}%`));
        }
        if (query.model) {
            filters.push(ilike(vehicles.model, `%${query.model}%`));
        }
        if (query.renavam) {
            filters.push(ilike(vehicles.renavam, `%${query.renavam}%`));
        }
        if (query.client) {
            filters.push(ilike(users.userName, `%${query.client}%`));
        }
        const where = and(...filters);
        const [items, totalRows] = await Promise.all([
            db
                .select({
                id: vehiclesEnterprisesMembers.id,
                status: vehiclesEnterprisesMembers.status,
                vehiclesId: vehiclesEnterprisesMembers.vehiclesId,
                enterprisesMembersId: vehiclesEnterprisesMembers.enterprisesMembersId,
                createdAt: vehiclesEnterprisesMembers.createdAt,
                updatedAt: vehiclesEnterprisesMembers.updatedAt,
                plate: vehicles.plate,
                model: vehicles.model,
                renavam: vehicles.renavam,
                color: vehicles.color,
                fuelType: vehicles.fuelType,
                vehicleYear: vehicles.vehicleYear,
                fleetNumber: vehicles.fleetNumber,
            })
                .from(vehiclesEnterprisesMembers)
                .innerJoin(enterprisesMembers, eq(vehiclesEnterprisesMembers.enterprisesMembersId, enterprisesMembers.id))
                .innerJoin(vehicles, eq(vehiclesEnterprisesMembers.vehiclesId, vehicles.id))
                .innerJoin(users, eq(users.id, enterprisesMembers.userId))
                .where(where)
                .orderBy(asc(vehicles.plate), asc(vehiclesEnterprisesMembers.id))
                .limit(limit)
                .offset(offset),
            db
                .select({ c: count() })
                .from(vehiclesEnterprisesMembers)
                .innerJoin(enterprisesMembers, eq(vehiclesEnterprisesMembers.enterprisesMembersId, enterprisesMembers.id))
                .innerJoin(vehicles, eq(vehiclesEnterprisesMembers.vehiclesId, vehicles.id))
                .innerJoin(users, eq(users.id, enterprisesMembers.userId))
                .where(where),
        ]);
        const total = Number(totalRows[0]?.c ?? 0);
        return { items, total, limit, offset };
    }
    async getById(enterpriseId, id) {
        const row = (await db
            .select({
            id: vehiclesEnterprisesMembers.id,
            status: vehiclesEnterprisesMembers.status,
            vehiclesId: vehiclesEnterprisesMembers.vehiclesId,
            enterprisesMembersId: vehiclesEnterprisesMembers.enterprisesMembersId,
            createdAt: vehiclesEnterprisesMembers.createdAt,
            updatedAt: vehiclesEnterprisesMembers.updatedAt,
            plate: vehicles.plate,
            model: vehicles.model,
            renavam: vehicles.renavam,
            color: vehicles.color,
            fuelType: vehicles.fuelType,
            vehicleYear: vehicles.vehicleYear,
            fleetNumber: vehicles.fleetNumber,
        })
            .from(vehiclesEnterprisesMembers)
            .innerJoin(enterprisesMembers, eq(vehiclesEnterprisesMembers.enterprisesMembersId, enterprisesMembers.id))
            .innerJoin(vehicles, eq(vehiclesEnterprisesMembers.vehiclesId, vehicles.id))
            .where(this.tenantScope(enterpriseId, id))
            .limit(1))[0];
        if (!row) {
            throw new NotFoundError("Vinculo veiculo/membro nao encontrado", "VEHICLE_MEMBER_LINK_NOT_FOUND");
        }
        return row;
    }
    async create(enterpriseId, input, audit) {
        await this.assertVehicleExists(input.vehiclesId);
        await this.assertMemberInEnterprise(enterpriseId, input.enterprisesMembersId);
        const ctx = withEnterpriseAuditContext(audit, enterpriseId);
        try {
            const [row] = await db
                .insert(vehiclesEnterprisesMembers)
                .values({
                vehiclesId: input.vehiclesId,
                enterprisesMembersId: input.enterprisesMembersId,
                ...(input.status !== undefined ? { status: input.status } : {}),
            })
                .returning();
            if (!row)
                throw new Error("Falha ao vincular veiculo ao membro");
            await recordCreateAudit({
                entityType: EntityTypes.VEHICLES_ENTERPRISES_MEMBERS,
                entityId: row.id,
                after: row,
                ctx,
            });
            return row;
        }
        catch (err) {
            if (isPostgresUniqueViolation(err)) {
                throw new ConflictError("Ja existe vinculo ativo entre este veiculo e membro", "VEHICLE_MEMBER_LINK_CONFLICT");
            }
            throw err;
        }
    }
    async patch(enterpriseId, id, input, audit) {
        const existing = await this.getById(enterpriseId, id);
        const ctx = withEnterpriseAuditContext(audit, enterpriseId);
        try {
            const [row] = await db
                .update(vehiclesEnterprisesMembers)
                .set({
                status: input.status,
                updatedAt: new Date(),
            })
                .where(eq(vehiclesEnterprisesMembers.id, id))
                .returning();
            if (!row) {
                throw new NotFoundError("Vinculo veiculo/membro nao encontrado", "VEHICLE_MEMBER_LINK_NOT_FOUND");
            }
            await recordEntityAudit({
                entityType: EntityTypes.VEHICLES_ENTERPRISES_MEMBERS,
                entityId: id,
                action: "UPDATE",
                before: toAuditRecord(existing),
                after: toAuditRecord(row),
                ctx,
            });
            return row;
        }
        catch (err) {
            if (isPostgresUniqueViolation(err)) {
                throw new ConflictError("Ja existe vinculo ativo entre este veiculo e membro", "VEHICLE_MEMBER_LINK_CONFLICT");
            }
            throw err;
        }
    }
    /** Inativa o vínculo (respeita índice único parcial em status ATIVO). */
    async delete(enterpriseId, id, audit) {
        const existing = await this.getById(enterpriseId, id);
        if (existing.status === "INATIVO") {
            return existing;
        }
        const ctx = withEnterpriseAuditContext(audit, enterpriseId);
        const [row] = await db
            .update(vehiclesEnterprisesMembers)
            .set({
            status: "INATIVO",
            updatedAt: new Date(),
        })
            .where(eq(vehiclesEnterprisesMembers.id, id))
            .returning();
        if (!row) {
            throw new NotFoundError("Vinculo veiculo/membro nao encontrado", "VEHICLE_MEMBER_LINK_NOT_FOUND");
        }
        await recordEntityAudit({
            entityType: EntityTypes.VEHICLES_ENTERPRISES_MEMBERS,
            entityId: id,
            action: "SOFT_DELETE",
            before: toAuditRecord(existing),
            after: toAuditRecord(row),
            ctx,
        });
        return row;
    }
}
export const vehiclesEnterprisesMembersService = new VehiclesEnterprisesMembersService();
