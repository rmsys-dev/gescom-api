import { and, eq, isNull } from "drizzle-orm";
import { db, nfeParameters } from "../../../db/schema.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { nfeParameterCatalog } from "./catalog.js";
import {
  resolveNfeParameters,
  type ResolvedNfeParameters,
} from "./resolve.js";
import type { PatchNfeParametersInput } from "./schema.js";

export class NfeParametersService {
  public list = async (): Promise<ResolvedNfeParameters> =>
    resolveNfeParameters();

  public patch = async (
    input: PatchNfeParametersInput,
    audit: EntityAuditContext,
  ): Promise<ResolvedNfeParameters> => {
    const before = await resolveNfeParameters();

    await db.transaction(async (tx) => {
      for (const slug of nfeParameterCatalog) {
        const nextValue = input[slug];
        if (nextValue === undefined || nextValue === before[slug]) {
          continue;
        }

        const existing = (
          await tx
            .select()
            .from(nfeParameters)
            .where(
              and(
                eq(nfeParameters.parameter, slug),
                isNull(nfeParameters.deletedAt),
              ),
            )
            .limit(1)
        )[0];

        if (existing) {
          const [updated] = await tx
            .update(nfeParameters)
            .set({ value: nextValue, updatedAt: new Date() })
            .where(eq(nfeParameters.id, existing.id))
            .returning();

          await recordEntityAudit({
            entityType: EntityTypes.NFE_PARAMETERS,
            entityId: existing.id,
            action: "UPDATE",
            before: toAuditRecord(existing),
            after: toAuditRecord(
              updated ?? { ...existing, value: nextValue },
            ),
            keys: ["value", "parameter"],
            ctx: audit,
            tx,
          });
        } else {
          const [created] = await tx
            .insert(nfeParameters)
            .values({
              parameter: slug,
              value: nextValue,
            })
            .returning();

          if (created) {
            await recordCreateAudit({
              entityType: EntityTypes.NFE_PARAMETERS,
              entityId: created.id,
              after: created,
              ctx: audit,
              tx,
            });
          }
        }
      }
    });

    return resolveNfeParameters();
  };
}

export const nfeParametersService = new NfeParametersService();
