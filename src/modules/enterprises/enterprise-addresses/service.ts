import { and, asc, eq, isNull } from "drizzle-orm";
import { db, enterprisesAddress } from "../../../db/schema.js";
import { countRowsWhere } from "../../../shared/db/relational-list.js";
import {
  InternalServerError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import {
  softDeleteValues,
  touchUpdatedAt,
} from "../../../shared/db/record-lifecycle.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import { assertAddressHierarchy } from "./enterprise-address-validation.js";
import {
  recordEntityAudit,
  recordSoftDeleteAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import type {
  CreateEnterpriseAddressInput,
  ListEnterpriseAddressesQuery,
  PatchEnterpriseAddressInput,
} from "./schema.js";

export class EnterpriseAddressesService {
  public async list(enterpriseId: string, query: ListEnterpriseAddressesQuery) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [
      eq(enterprisesAddress.enterpriseId, enterpriseId),
      isNull(enterprisesAddress.deletedAt),
    ];

    if (query.adressType !== undefined) {
      conditions.push(eq(enterprisesAddress.adressType, query.adressType));
    }

    const whereClause = and(...conditions);

    const [items, total] = await Promise.all([
      db.query.enterprisesAddress.findMany({
        where: whereClause,
        orderBy: [asc(enterprisesAddress.adressType), asc(enterprisesAddress.id)],
        limit,
        offset,
      }),
      countRowsWhere(enterprisesAddress, whereClause),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  public async create(
    enterpriseId: string,
    input: CreateEnterpriseAddressInput,
  ) {
    await assertAddressHierarchy({
      cepId: input.cepId,
      cityId: input.cityId,
      stateId: input.stateId,
      countryId: input.countryId,
    });

    const [row] = await db
      .insert(enterprisesAddress)
      .values({
        enterpriseId,
        cepId: input.cepId,
        countryId: input.countryId,
        stateId: input.stateId,
        cityId: input.cityId,
        adressType: input.adressType,
      })
      .returning();

    if (!row) {
      throw new InternalServerError("Falha ao criar endereco da empresa");
    }

    return row;
  }

  public async patch(
    enterpriseId: string,
    addressId: string,
    input: PatchEnterpriseAddressInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(enterprisesAddress)
      .where(
        and(
          eq(enterprisesAddress.id, addressId),
          eq(enterprisesAddress.enterpriseId, enterpriseId),
          isNull(enterprisesAddress.deletedAt),
        ),
      )
      .limit(1);

    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "Endereco da empresa nao encontrado",
        "ENTERPRISE_ADDRESS_NOT_FOUND",
      );
    }

    const now = new Date();

    if (input.softDelete === true) {
      const [row] = await db
        .update(enterprisesAddress)
        .set(softDeleteValues(now))
        .where(
          and(
            eq(enterprisesAddress.id, addressId),
            eq(enterprisesAddress.enterpriseId, enterpriseId),
            isNull(enterprisesAddress.deletedAt),
          ),
        )
        .returning();

      if (!row) {
        throw new NotFoundError(
          "Endereco da empresa nao encontrado",
          "ENTERPRISE_ADDRESS_NOT_FOUND",
        );
      }

      await recordSoftDeleteAudit({
        entityType: EntityTypes.ENTERPRISES_ADDRESS,
        entityId: addressId,
        before: existing,
        after: row,
        ctx: { ...audit, enterpriseId: audit.enterpriseId ?? enterpriseId },
      });
      return row;
    }

    const effective = {
      cepId: input.cepId ?? existing.cepId,
      cityId: input.cityId ?? existing.cityId,
      stateId: input.stateId ?? existing.stateId,
      countryId: input.countryId ?? existing.countryId,
    };

    const hierarchyChanged =
      input.cepId !== undefined ||
      input.cityId !== undefined ||
      input.stateId !== undefined ||
      input.countryId !== undefined;

    if (hierarchyChanged) {
      await assertAddressHierarchy(effective);
    }

    const [row] = await db
      .update(enterprisesAddress)
      .set({
        ...(input.cepId !== undefined ? { cepId: input.cepId } : {}),
        ...(input.countryId !== undefined
          ? { countryId: input.countryId }
          : {}),
        ...(input.stateId !== undefined ? { stateId: input.stateId } : {}),
        ...(input.cityId !== undefined ? { cityId: input.cityId } : {}),
        ...(input.adressType !== undefined
          ? { adressType: input.adressType }
          : {}),
        ...touchUpdatedAt(now),
      })
      .where(
        and(
          eq(enterprisesAddress.id, addressId),
          eq(enterprisesAddress.enterpriseId, enterpriseId),
          isNull(enterprisesAddress.deletedAt),
        ),
      )
      .returning();

    if (!row) {
      throw new NotFoundError(
        "Endereco da empresa nao encontrado",
        "ENTERPRISE_ADDRESS_NOT_FOUND",
      );
    }

    await recordEntityAudit({
      entityType: EntityTypes.ENTERPRISES_ADDRESS,
      entityId: addressId,
      action: "UPDATE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: { ...audit, enterpriseId: audit.enterpriseId ?? enterpriseId },
    });
    return row;
  }
}

export const enterpriseAddressesService = new EnterpriseAddressesService();
