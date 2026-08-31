import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  enterpriseParameters,
  enterprises,
  enterprisesMembers,
  modules,
} from "../../../db/schema.js";
import { cascadeSoftDeleteEnterprise } from "../../../shared/db/cascade-enterprise-soft-delete.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import {
  normalizeCpfCnpj,
  normalizeEmail,
  normalizePhone,
} from "../../../shared/validation/data-normalizers.js";
import {
  AppError,
  ConflictError,
  InternalServerError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import {
  recordCreateAudit,
  recordSoftDeleteAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { ADMIN_MODULE_REFERENCE } from "../../auth/default-permissions.js";
import { insertMemberModuleWithPermissions } from "../../memberships/member-module-ops.js";
import { enterpriseParameterCatalog } from "../../enterprises/parameters/catalog.js";
import { enterpriseParametersService } from "../../enterprises/parameters/service.js";
import type { CreateEnterpriseInput } from "./schema.js";
import type { PatchEnterpriseParametersInput } from "../../enterprises/parameters/schema.js";

const ADMIN_ACCESS_LEVEL = "N6" as const;

export class MaintainerEnterprisesService {
  public async create(
    input: CreateEnterpriseInput,
    actorUserId: string,
    audit: EntityAuditContext,
  ) {
    const registration = normalizeCpfCnpj(input.registration);
    try {
      return await db.transaction(async (tx) => {
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
          throw new InternalServerError("Falha ao criar empresa");
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

        const [adminModule] = await tx
          .select({ id: modules.id })
          .from(modules)
          .where(
            and(
              eq(modules.reference, ADMIN_MODULE_REFERENCE),
              eq(modules.status, "ATIVO"),
              isNull(modules.deletedAt),
            ),
          )
          .limit(1);

        if (!adminModule) {
          throw new NotFoundError(
            "Modulo administrador nao encontrado no catalogo",
            "ADMIN_MODULE_NOT_FOUND",
          );
        }

        const now = new Date();
        const [member] = await tx
          .insert(enterprisesMembers)
          .values({
            userId: actorUserId,
            enterpriseId: created.id,
            class: "ADMINISTRADOR",
            status: "ATIVO",
            includedBy: actorUserId,
            approvedAt: now,
            approvedBy: actorUserId,
          })
          .returning();

        if (!member) {
          throw new InternalServerError(
            "Falha ao criar vinculo membro-empresa",
            "INTERNAL_ERROR",
          );
        }

        await insertMemberModuleWithPermissions(tx, {
          memberId: member.id,
          moduleId: adminModule.id,
          accessLevel: ADMIN_ACCESS_LEVEL,
        });

        const auditCtx = {
          ...audit,
          actorUserId,
          enterpriseId: created.id,
        };

        await recordCreateAudit({
          entityType: EntityTypes.ENTERPRISES,
          entityId: created.id,
          after: created,
          ctx: auditCtx,
          tx,
        });

        await recordCreateAudit({
          entityType: EntityTypes.ENTERPRISES_MEMBERS,
          entityId: member.id,
          after: member,
          ctx: auditCtx,
          tx,
        });

        return {
          ...created,
          member: {
            id: member.id,
            userId: member.userId,
            class: member.class,
            status: member.status,
            module: {
              moduleId: adminModule.id,
              reference: ADMIN_MODULE_REFERENCE,
              accessLevel: ADMIN_ACCESS_LEVEL,
            },
          },
        };
      });
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Dados da empresa em conflito com cadastro existente.",
          "ENTERPRISE_CONFLICT",
        );
      }
      throw err;
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
