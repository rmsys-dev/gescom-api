import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import {
  enterprises,
  enterprisesAddress,
  enterprisesMembers,
  enterprisesSequences,
  membersDepartments,
} from "../../db/schema.js";
import { ConflictError, NotFoundError } from "../../shared/errors/app-error.js";
import { isActiveEnterprise, activeUserMembershipWhere } from "../../shared/db/tenant-predicates.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import type { ListEnterprisesQuery } from "./schema.js";
import {
  normalizeCpfCnpj,
  normalizeEmail,
  normalizePhone,
} from "../../shared/validation/data-normalizers.js";
import {
  recordEntityAudit,
  type EntityAuditContext,
} from "../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../shared/audit/entity-types.js";
import { whereActiveById } from "../../shared/db/record-lifecycle.js";
import type { PatchEnterpriseInput } from "./schema.js";

const mapMembershipsToListItem = (
  rows: Array<{
    id: string;
    memberId: string;
    class: (typeof enterprisesMembers.$inferSelect)["class"];
    enterprise: (typeof enterprises.$inferSelect) | null;
  }>,
) =>
  rows.map((row) => ({
    id: row.enterprise!.id,
    tradeName: row.enterprise!.tradeName,
    legalName: row.enterprise!.legalName,
    memberId: row.memberId,
    class: row.class,
  }));

export class EnterprisesService {
  //Listagem de empresas
  public async listForAuthenticatedUser(
    userId: string,
    query: ListEnterprisesQuery,
  ) {
    const { limit, offset } = resolveListPagination(query);

    const rows = await db.query.enterprisesMembers.findMany({
      where: activeUserMembershipWhere(userId),
      with: {
        enterprise: true,
        departments: {
          where: and(
            eq(membersDepartments.mainDepartment, true),
            eq(membersDepartments.status, "ATIVO"),
            isNull(membersDepartments.deletedAt),
          ),
        },
      },
    });

    const activeRows = rows
      .filter((row) => isActiveEnterprise(row.enterprise))
      .sort((left, right) => {
        const byTradeName = (left.enterprise?.tradeName ?? "").localeCompare(
          right.enterprise?.tradeName ?? "",
        );
        if (byTradeName !== 0) {
          return byTradeName;
        }
        return (left.enterprise?.id ?? "").localeCompare(
          right.enterprise?.id ?? "",
        );
      });

    const total = activeRows.length;
    const page = activeRows.slice(offset, offset + limit);

    return {
      items: mapMembershipsToListItem(
        page.map((row) => ({
          id: row.enterprise!.id,
          memberId: row.id,
          class: row.class,
          enterprise: row.enterprise,
        })),
      ),
      total,
      limit,
      offset,
    };
  }

  //Busca uma empresa por ID (cadastro, endereços e sequências activos)
  public async getById(id: string) {
    const row = await db.query.enterprises.findFirst({
      where: and(eq(enterprises.id, id), isNull(enterprises.deletedAt)),
      with: {
        addresses: {
          where: isNull(enterprisesAddress.deletedAt),
        },
        sequences: {
          where: isNull(enterprisesSequences.deletedAt),
        },
      },
    });

    if (!row) {
      throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    }

    const { addresses, sequences, ...enterprise } = row;
    return { ...enterprise, addresses, sequences };
  }

  //Altera uma empresa
  public async patch(
    id: string,
    input: PatchEnterpriseInput,
    audit: EntityAuditContext,
  ) {
    const existingRows = await db
      .select()
      .from(enterprises)
      .where(and(eq(enterprises.id, id), isNull(enterprises.deletedAt)))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) {
      throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    }

    const registration = input.registration
      ? normalizeCpfCnpj(input.registration)
      : undefined;
    try {
      const [row] = await db
        .update(enterprises)
        .set({
          ...(registration !== undefined ? { registration } : {}),
          ...(input.legalName !== undefined
            ? { legalName: input.legalName.trim() }
            : {}),
          ...(input.tradeName !== undefined
            ? { tradeName: input.tradeName.trim() }
            : {}),
          ...(input.phone !== undefined
            ? { phone: input.phone ? normalizePhone(input.phone) : null }
            : {}),
          ...(input.email !== undefined
            ? { email: input.email ? normalizeEmail(input.email) : null }
            : {}),
          ...(input.whatsapp !== undefined
            ? {
                whatsapp: input.whatsapp
                  ? normalizePhone(input.whatsapp)
                  : null,
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(whereActiveById(enterprises, id))
        .returning();
      if (!row) {
        throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
      }
      await recordEntityAudit({
        entityType: EntityTypes.ENTERPRISES,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: { ...audit, enterpriseId: audit.enterpriseId ?? id },
      });
      return row;
    } catch {
      throw new ConflictError(
        "Dados da empresa em conflito com cadastro existente",
        "ENTERPRISE_CONFLICT",
      );
    }
  }
}
export const enterprisesService = new EnterprisesService();
