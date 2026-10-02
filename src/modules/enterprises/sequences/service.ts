import { and, eq, isNull, max, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { sequenceTypeEnum, type SequenceType } from "../../../db/enums.js";
import {
  enterprisesMembers,
  enterprisesSequences,
  nfeHeaders,
  productsEnterprises,
  sales,
} from "../../../db/schema.js";
import { BadRequestError } from "../../../shared/errors/app-error.js";
import {
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";

const LABELS: Record<SequenceType, string> = {
  VENDA: "Pedido de venda",
  NFE: "NF-e (modelo 55)",
  NFSE: "NFS-e",
  NFCE: "NFC-e (modelo 65)",
  MDFE: "MDF-e",
  CTE: "CT-e",
  MEMBRO: "Código de membro",
  PRODUTO: "Código de produto",
};

export class EnterpriseSequencesService {
  /** Maior número já gravado; a sequência não pode ficar abaixo dele. */
  private async lastUsed(enterpriseId: string, type: SequenceType): Promise<number> {
    const value = async (query: Promise<Array<{ value: number | null }>>) =>
      Number((await query)[0]?.value ?? 0);
    switch (type) {
      case "NFE":
      case "NFCE":
        return value(
          db
            .select({ value: max(nfeHeaders.nNf) })
            .from(nfeHeaders)
            .where(
              and(
                eq(nfeHeaders.enterpriseId, enterpriseId),
                eq(nfeHeaders.mod, type === "NFCE" ? "65" : "55"),
                eq(nfeHeaders.issuanceType, "PROPRIA"),
              ),
            ),
        );
      case "VENDA":
        return value(
          db
            .select({ value: max(sales.orderNumber) })
            .from(sales)
            .where(eq(sales.enterprisesId, enterpriseId)),
        );
      case "MEMBRO":
        return value(
          db
            .select({ value: max(enterprisesMembers.code) })
            .from(enterprisesMembers)
            .where(eq(enterprisesMembers.enterpriseId, enterpriseId)),
        );
      case "PRODUTO":
        return value(
          db
            .select({ value: max(productsEnterprises.code) })
            .from(productsEnterprises)
            .where(eq(productsEnterprises.enterprisesId, enterpriseId)),
        );
      default:
        return 0;
    }
  }

  public async list(enterpriseId: string) {
    const rows = await db
      .select()
      .from(enterprisesSequences)
      .where(
        and(
          eq(enterprisesSequences.enterpriseId, enterpriseId),
          isNull(enterprisesSequences.deletedAt),
        ),
      );
    return Promise.all(
      sequenceTypeEnum.enumValues.map(async (type) => {
        const row = rows.find((item) => item.type === type);
        return {
          id: row?.id ?? null,
          type,
          label: LABELS[type],
          sequence: row?.sequence ?? 0,
          lastUsed: await this.lastUsed(enterpriseId, type),
          updatedAt: row?.updatedAt ?? row?.createdAt ?? null,
        };
      }),
    );
  }

  public async update(
    enterpriseId: string,
    type: SequenceType,
    sequence: number,
    audit: EntityAuditContext,
  ) {
    const lastUsed = await this.lastUsed(enterpriseId, type);
    if (sequence < lastUsed) {
      throw new BadRequestError(
        `A sequencia de ${LABELS[type]} nao pode ficar abaixo do ultimo numero usado (${lastUsed})`,
        "SEQUENCE_BELOW_LAST_USED",
      );
    }
    const [before] = await db
      .select()
      .from(enterprisesSequences)
      .where(
        and(
          eq(enterprisesSequences.enterpriseId, enterpriseId),
          eq(enterprisesSequences.type, type),
          isNull(enterprisesSequences.deletedAt),
        ),
      )
      .limit(1);
    const [after] = before
      ? await db
          .update(enterprisesSequences)
          .set({ sequence, updatedAt: sql`now()` })
          .where(eq(enterprisesSequences.id, before.id))
          .returning()
      : await db
          .insert(enterprisesSequences)
          .values({ enterpriseId, type, sequence })
          .returning();
    if (!after) throw new Error("Falha ao gravar sequencia");
    await recordEntityAudit({
      entityType: EntityTypes.ENTERPRISES,
      entityId: enterpriseId,
      action: "UPDATE",
      before: { [`sequence_${type}`]: before?.sequence ?? 0 },
      after: { [`sequence_${type}`]: after.sequence },
      ctx: { ...audit, enterpriseId },
    });
    return {
      id: after.id,
      type,
      label: LABELS[type],
      sequence: after.sequence,
      lastUsed,
      updatedAt: after.updatedAt ?? after.createdAt,
    };
  }
}

export const enterpriseSequencesService = new EnterpriseSequencesService();
