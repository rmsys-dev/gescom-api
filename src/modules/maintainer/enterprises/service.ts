import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import { enterpriseParameters, enterprises } from "../../../db/schema.js";
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
import { enterpriseParameterCatalog } from "../../enterprises/parameters/catalog.js";
import { enterpriseParametersService } from "../../enterprises/parameters/service.js";
import type { CreateEnterpriseInput } from "./schema.js";
import type { PatchEnterpriseParametersInput } from "../../enterprises/parameters/schema.js";

export class MaintainerEnterprisesService {
  public async create(input: CreateEnterpriseInput, audit: EntityAuditContext) {
    const registration = normalizeCpfCnpj(input.registration);
    try {
      const row = await db.transaction(async (tx) => {
        const [created] = await tx
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

        if (!created) {
          return null;
        }

        // Novas empresas sobem com todos os parâmetros do catálogo desativados
        // (opt-in via suporte / PATCH maintainer).
        await tx.insert(enterpriseParameters).values(
          enterpriseParameterCatalog.map((parameter) => ({
            enterpriseId: created.id,
            parameter,
            enabled: false,
          })),
        );

        await recordCreateAudit({
          entityType: EntityTypes.ENTERPRISES,
          entityId: created.id,
          after: created,
          ctx: { ...audit, enterpriseId: audit.enterpriseId ?? created.id },
          tx,
        });

        return created;
      });

      return row;
    } catch {
      throw new ConflictError(
        "Dados da empresa em conflito com cadastro existente.",
        "ENTERPRISE_CONFLICT",
      );
    }
  }

  public async patchParameters(
    enterpriseId: string,
    input: PatchEnterpriseParametersInput,
    audit: EntityAuditContext,
  ) {
    return enterpriseParametersService.patch(enterpriseId, input, audit);
  }

  public async softDelete(id: string, audit: EntityAuditContext) {
    const existingRows = await db
      .select()
      .from(enterprises)
      .where(and(eq(enterprises.id, id), isNull(enterprises.deletedAt)))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) {
      throw new NotFoundError("Empresa não encontrada", "ENTERPRISE_NOT_FOUND");
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
          "Empresa não encontrada",
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
