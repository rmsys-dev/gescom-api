import { and, asc, count, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { states, vehicles } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/app-error.js";
import {
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import type {
  CreateVehicleInput,
  ListVehiclesQuery,
  PatchVehicleInput,
} from "./schema.js";

const toDec = (value: number | null | undefined) =>
  value === undefined ? undefined : value === null ? null : value.toString();

const toText = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : value.trim();

export class VehiclesService {
  private async assertLicensingState(stateId: string) {
    const row = (
      await db
        .select({ id: states.id })
        .from(states)
        .where(and(eq(states.id, stateId), isNull(states.deletedAt)))
        .limit(1)
    )[0];
    if (!row) {
      throw new ValidationError(
        [
          {
            path: "body.licensingStateId",
            message: "Estado de licenciamento nao encontrado",
          },
        ],
        "Estado invalido",
      );
    }
  }

  public async list(query: ListVehiclesQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const filters: SQL[] = [];

    if (query.plate) {
      filters.push(ilike(vehicles.plate, `%${query.plate}%`));
    }
    if (query.model) {
      filters.push(ilike(vehicles.model, `%${query.model}%`));
    }
    if (query.renavam) {
      filters.push(ilike(vehicles.renavam, `%${query.renavam}%`));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      filters.push(
        or(
          ilike(vehicles.plate, term),
          ilike(vehicles.model, term),
          ilike(vehicles.renavam, term),
          ilike(vehicles.entireCode, term),
          ilike(vehicles.fleetNumber, term),
        )!,
      );
    }

    const where = filters.length > 0 ? and(...filters) : undefined;
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(vehicles)
        .where(where)
        .orderBy(asc(vehicles.plate), asc(vehicles.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(vehicles).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Veiculo nao encontrado", "VEHICLE_NOT_FOUND");
    }
    return row;
  }

  public async create(input: CreateVehicleInput, audit: EntityAuditContext) {
    if (input.licensingStateId) {
      await this.assertLicensingState(input.licensingStateId);
    }
    try {
      const [row] = await db
        .insert(vehicles)
        .values({
          plate: input.plate,
          model: toText(input.model) ?? null,
          color: toText(input.color) ?? null,
          ...(input.fuelType !== undefined ? { fuelType: input.fuelType } : {}),
          ...(input.ownerType !== undefined
            ? { ownerType: input.ownerType }
            : {}),
          ipvaPaymentMonth: input.ipvaPaymentMonth ?? null,
          vehicleYear: input.vehicleYear ?? null,
          renavam: toText(input.renavam) ?? null,
          licensingStateId: input.licensingStateId ?? null,
          tareWeight: toDec(input.tareWeight) ?? null,
          capacityM3: toDec(input.capacityM3) ?? null,
          capacityKg: toDec(input.capacityKg) ?? null,
          entireCode: toText(input.entireCode) ?? null,
          rntrcCode: toText(input.rntrcCode) ?? null,
          ...(input.vehicleType !== undefined
            ? { vehicleType: input.vehicleType }
            : {}),
          ...(input.bodyType !== undefined ? { bodyType: input.bodyType } : {}),
          ...(input.axleType !== undefined ? { axleType: input.axleType } : {}),
          location: toText(input.location) ?? null,
          refuelingMileage: toDec(input.refuelingMileage) ?? null,
          fleetNumber: toText(input.fleetNumber) ?? null,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar veiculo");
      await recordCreateAudit({
        entityType: EntityTypes.VEHICLES,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Placa de veiculo ja cadastrada",
          "VEHICLE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    id: string,
    input: PatchVehicleInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(id);
    if (input.licensingStateId) {
      await this.assertLicensingState(input.licensingStateId);
    }
    try {
      const [row] = await db
        .update(vehicles)
        .set({
          ...(input.plate !== undefined ? { plate: input.plate } : {}),
          ...(input.model !== undefined ? { model: toText(input.model) } : {}),
          ...(input.color !== undefined ? { color: toText(input.color) } : {}),
          ...(input.fuelType !== undefined ? { fuelType: input.fuelType } : {}),
          ...(input.ownerType !== undefined
            ? { ownerType: input.ownerType }
            : {}),
          ...(input.ipvaPaymentMonth !== undefined
            ? { ipvaPaymentMonth: input.ipvaPaymentMonth }
            : {}),
          ...(input.vehicleYear !== undefined
            ? { vehicleYear: input.vehicleYear }
            : {}),
          ...(input.renavam !== undefined
            ? { renavam: toText(input.renavam) }
            : {}),
          ...(input.licensingStateId !== undefined
            ? { licensingStateId: input.licensingStateId }
            : {}),
          ...(input.tareWeight !== undefined
            ? { tareWeight: toDec(input.tareWeight) }
            : {}),
          ...(input.capacityM3 !== undefined
            ? { capacityM3: toDec(input.capacityM3) }
            : {}),
          ...(input.capacityKg !== undefined
            ? { capacityKg: toDec(input.capacityKg) }
            : {}),
          ...(input.entireCode !== undefined
            ? { entireCode: toText(input.entireCode) }
            : {}),
          ...(input.rntrcCode !== undefined
            ? { rntrcCode: toText(input.rntrcCode) }
            : {}),
          ...(input.vehicleType !== undefined
            ? { vehicleType: input.vehicleType }
            : {}),
          ...(input.bodyType !== undefined ? { bodyType: input.bodyType } : {}),
          ...(input.axleType !== undefined ? { axleType: input.axleType } : {}),
          ...(input.location !== undefined
            ? { location: toText(input.location) }
            : {}),
          ...(input.refuelingMileage !== undefined
            ? { refuelingMileage: toDec(input.refuelingMileage) }
            : {}),
          ...(input.fleetNumber !== undefined
            ? { fleetNumber: toText(input.fleetNumber) }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(vehicles.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError("Veiculo nao encontrado", "VEHICLE_NOT_FOUND");
      }
      await recordEntityAudit({
        entityType: EntityTypes.VEHICLES,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Placa de veiculo ja cadastrada",
          "VEHICLE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(id: string, audit: EntityAuditContext) {
    const existing = await this.getById(id);
    try {
      const [row] = await db
        .delete(vehicles)
        .where(eq(vehicles.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError("Veiculo nao encontrado", "VEHICLE_NOT_FOUND");
      }
      await recordEntityAudit({
        entityType: EntityTypes.VEHICLES,
        entityId: id,
        action: "DELETE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresForeignKeyViolation(err)) {
        throw new ConflictError(
          "Veiculo possui vinculos ativos e nao pode ser excluido",
          "VEHICLE_IN_USE",
        );
      }
      throw err;
    }
  }
}

export const vehiclesService = new VehiclesService();
