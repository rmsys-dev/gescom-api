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
import { assertActiveCep } from "./enterprise-address-validation.js";
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
    await assertActiveCep(input.cepId);

    const [row] = await db
      .insert(enterprisesAddress)
      .values({
        enterpriseId,
        cepId: input.cepId,
        number: input.number.trim(),
        complement: input.complement?.trim() ?? null,
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

    if (input.cepId !== undefined) {
      await assertActiveCep(input.cepId);
    }

    const [row] = await db
      .update(enterprisesAddress)
      .set({
        ...(input.cepId !== undefined ? { cepId: input.cepId } : {}),
        ...(input.number !== undefined ? { number: input.number.trim() } : {}),
        ...(input.complement !== undefined
          ? { complement: input.complement?.trim() ?? null }
          : {}),
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
