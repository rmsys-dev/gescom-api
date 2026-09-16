import { and, eq, isNull } from "drizzle-orm";
import { db, enterpriseParameters, enterprises } from "../../../db/schema.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { enterpriseParameterCatalog } from "./catalog.js";
import {
  resolveEnterpriseParameters,
  type ResolvedEnterpriseParameters,
} from "./resolve.js";
import type { PatchEnterpriseParametersInput } from "./schema.js";

export class EnterpriseParametersService {
  public async getForEnterprise(
    enterpriseId: string,
  ): Promise<ResolvedEnterpriseParameters> {
    const enterprise = (
      await db
        .select({ id: enterprises.id })
        .from(enterprises)
        .where(
          and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)),
        )
        .limit(1)
    )[0];
    if (!enterprise) {
      throw new NotFoundError("Empresa não encontrada", "ENTERPRISE_NOT_FOUND");
    }
    return resolveEnterpriseParameters(enterpriseId);
  }

  public async patch(
    enterpriseId: string,
    input: PatchEnterpriseParametersInput,
    audit: EntityAuditContext,
  ): Promise<ResolvedEnterpriseParameters> {
    const enterprise = (
      await db
        .select({ id: enterprises.id })
        .from(enterprises)
        .where(
          and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)),
        )
        .limit(1)
    )[0];
    if (!enterprise) {
      throw new NotFoundError("Empresa não encontrada", "ENTERPRISE_NOT_FOUND");
    }

    const before = await resolveEnterpriseParameters(enterpriseId);

    await db.transaction(async (tx) => {
      for (const slug of enterpriseParameterCatalog) {
        const nextValue = input[slug];
        if (nextValue === undefined || nextValue === before[slug]) {
          continue;
        }

        const existing = (
          await tx
            .select()
            .from(enterpriseParameters)
            .where(
              and(
                eq(enterpriseParameters.enterpriseId, enterpriseId),
                eq(enterpriseParameters.parameter, slug),
                isNull(enterpriseParameters.deletedAt),
              ),
            )
            .limit(1)
        )[0];

        if (existing) {
          const [updated] = await tx
            .update(enterpriseParameters)
            .set({ enabled: nextValue, updatedAt: new Date() })
            .where(eq(enterpriseParameters.id, existing.id))
            .returning();

          await recordEntityAudit({
            entityType: EntityTypes.ENTERPRISE_PARAMETERS,
            entityId: existing.id,
            action: "UPDATE",
            before: toAuditRecord(existing),
            after: toAuditRecord(
              updated ?? { ...existing, enabled: nextValue },
            ),
            keys: ["enabled", "parameter"],
            ctx: { ...audit, enterpriseId },
            tx,
          });
        } else {
          const [created] = await tx
            .insert(enterpriseParameters)
            .values({
              enterpriseId,
              parameter: slug,
              enabled: nextValue,
            })
            .returning();

          if (created) {
            await recordCreateAudit({
              entityType: EntityTypes.ENTERPRISE_PARAMETERS,
              entityId: created.id,
              after: created,
              ctx: { ...audit, enterpriseId },
              tx,
            });
          }
        }
      }
    });

    return resolveEnterpriseParameters(enterpriseId);
  }
}

export const enterpriseParametersService = new EnterpriseParametersService();
