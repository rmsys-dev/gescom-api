import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, enterprises, enterprisesLogos } from "../../../db/schema.js";
import {
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import {
  resolveLogoMime,
  type AllowedLogoMime,
} from "./upload.js";

export type EnterpriseLogoPayload = {
  bytes: Buffer;
  mime: AllowedLogoMime;
};

export type EnterpriseLogoMeta = {
  hasLogo: true;
  mime: string;
};

export class EnterpriseLogoService {
  private async assertEnterpriseExists(enterpriseId: string): Promise<void> {
    const [row] = await db
      .select({ id: enterprises.id })
      .from(enterprises)
      .where(
        and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    }
  }

  public async hasLogo(enterpriseId: string): Promise<boolean> {
    const [row] = await db
      .select({ enterpriseId: enterprisesLogos.enterpriseId })
      .from(enterprisesLogos)
      .where(eq(enterprisesLogos.enterpriseId, enterpriseId))
      .limit(1);
    return Boolean(row);
  }

  public async hasLogoMany(
    enterpriseIds: string[],
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();
    for (const id of enterpriseIds) {
      result.set(id, false);
    }
    if (enterpriseIds.length === 0) return result;

    const rows = await db
      .select({ enterpriseId: enterprisesLogos.enterpriseId })
      .from(enterprisesLogos)
      .where(inArray(enterprisesLogos.enterpriseId, enterpriseIds));

    for (const row of rows) {
      result.set(row.enterpriseId, true);
    }
    return result;
  }

  public async getBytes(
    enterpriseId: string,
  ): Promise<{ bytes: Buffer; mime: string }> {
    await this.assertEnterpriseExists(enterpriseId);
    const [row] = await db
      .select({
        bytes: enterprisesLogos.bytes,
        mime: enterprisesLogos.mime,
      })
      .from(enterprisesLogos)
      .where(eq(enterprisesLogos.enterpriseId, enterpriseId))
      .limit(1);
    if (!row) {
      throw new NotFoundError("Logo nao encontrada", "ENTERPRISE_LOGO_NOT_FOUND");
    }
    return { bytes: row.bytes, mime: row.mime };
  }

  public async upsert(
    enterpriseId: string,
    file: Express.Multer.File | undefined,
    audit: EntityAuditContext,
  ): Promise<EnterpriseLogoMeta> {
    await this.assertEnterpriseExists(enterpriseId);

    if (!file?.buffer?.length) {
      throw new ValidationError(
        [{ path: "logo", message: "Arquivo de logo e obrigatorio" }],
        "Arquivo ausente",
      );
    }

    const mime = resolveLogoMime(file.mimetype, file.buffer);
    const hadLogo = await this.hasLogo(enterpriseId);
    const now = new Date();

    await db
      .insert(enterprisesLogos)
      .values({
        enterpriseId,
        mime,
        bytes: file.buffer,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: enterprisesLogos.enterpriseId,
        set: {
          mime,
          bytes: file.buffer,
          updatedAt: now,
        },
      });

    await recordEntityAudit({
      entityType: EntityTypes.ENTERPRISES,
      entityId: enterpriseId,
      action: "UPDATE",
      before: { hasLogo: hadLogo, mime: hadLogo ? undefined : null },
      after: { hasLogo: true, mime },
      keys: ["hasLogo", "mime"],
      ctx: { ...audit, enterpriseId: audit.enterpriseId ?? enterpriseId },
    });

    return { hasLogo: true, mime };
  }

  public async remove(
    enterpriseId: string,
    audit: EntityAuditContext,
  ): Promise<void> {
    await this.assertEnterpriseExists(enterpriseId);

    const [existing] = await db
      .select({ mime: enterprisesLogos.mime })
      .from(enterprisesLogos)
      .where(eq(enterprisesLogos.enterpriseId, enterpriseId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("Logo nao encontrada", "ENTERPRISE_LOGO_NOT_FOUND");
    }

    await db
      .delete(enterprisesLogos)
      .where(eq(enterprisesLogos.enterpriseId, enterpriseId));

    await recordEntityAudit({
      entityType: EntityTypes.ENTERPRISES,
      entityId: enterpriseId,
      action: "UPDATE",
      before: { hasLogo: true, mime: existing.mime },
      after: { hasLogo: false, mime: null },
      keys: ["hasLogo", "mime"],
      ctx: { ...audit, enterpriseId: audit.enterpriseId ?? enterpriseId },
    });
  }
}

export const enterpriseLogoService = new EnterpriseLogoService();
