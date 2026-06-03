import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import { enterprises } from "../../../db/schema.js";
import { cascadeSoftDeleteEnterprise } from "../../../shared/db/cascade-enterprise-soft-delete.js";
import {
  normalizeCpfCnpj,
  normalizeEmail,
  normalizePhone,
} from "../../../shared/validation/data-normalizers.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import {
  recordCreateAudit,
  recordSoftDeleteAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import type { CreateEnterpriseInput } from "./schema.js";

export class MaintainerEnterprisesService {
  public async create(
    input: CreateEnterpriseInput,
    audit: EntityAuditContext,
  ) {
    const registration = normalizeCpfCnpj(input.registration);
    try {
      const [row] = await db
        .insert(enterprises)
        .values({
          registration,
          legalName: input.legalName.trim(),
          tradeName: input.tradeName.trim(),
          phone: input.phone ? normalizePhone(input.phone) : null,
          email: input.email ? normalizeEmail(input.email) : null,
          whatsapp: input.whatsapp ? normalizePhone(input.whatsapp) : null,
        })
        .returning();
      if (row) {
        await recordCreateAudit({
          entityType: EntityTypes.ENTERPRISES,
          entityId: row.id,
          after: row,
          ctx: { ...audit, enterpriseId: audit.enterpriseId ?? row.id },
        });
      }
      return row;
    } catch {
      throw new ConflictError(
        "Dados da empresa em conflito com cadastro existente",
        "ENTERPRISE_CONFLICT",
      );
    }
  }

  public async softDelete(id: string, audit: EntityAuditContext) {
    const existingRows = await db
      .select()
      .from(enterprises)
      .where(and(eq(enterprises.id, id), isNull(enterprises.deletedAt)))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) {
      throw new NotFoundError(
        "Empresa nao encontrada",
        "ENTERPRISE_NOT_FOUND",
      );
    }

    return db.transaction(async (tx) => {
      await cascadeSoftDeleteEnterprise(id, tx);

      const [updated] = await tx
        .select()
        .from(enterprises)
        .where(eq(enterprises.id, id))
        .limit(1);
      if (!updated?.deletedAt) {
        throw new NotFoundError(
          "Empresa nao encontrada",
          "ENTERPRISE_NOT_FOUND",
        );
      }

      await recordSoftDeleteAudit({
        entityType: EntityTypes.ENTERPRISES,
        entityId: id,
        before: existing,
        after: updated,
        ctx: { ...audit, enterpriseId: audit.enterpriseId ?? id },
        tx,
      });

      return { id: updated.id, deletedAt: updated.deletedAt };
    });
  }
}

export const maintainerEnterprisesService = new MaintainerEnterprisesService();
