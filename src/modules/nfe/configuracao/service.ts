import { and, desc, eq, isNull } from "drizzle-orm";
import {
  db,
  enterprises,
  enterprisesNfe,
  enterprisesNfeCertificates,
} from "../../../db/schema.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import {
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/app-error.js";
import { inspectPfx, loadPfxFromBuffer } from "../sefaz/certificate.js";
import {
  certificatePeriodRejection,
  certificateValidityMeta,
  normalizeCnpjDigits,
} from "../sefaz/certificate-validity.js";
import { nfeCertInvalidError } from "../sefaz/errors.js";
import { decryptSecret, encryptSecret } from "../sefaz/secrets.js";
import type { LoadedClientCert } from "../sefaz/certificate.js";
import type { SefazAmbiente } from "../sefaz/types.js";
import type { PatchNfeConfiguracaoInput } from "./schema.js";

const SETTINGS_AUDIT_KEYS = [
  "ambiente",
  "serieNfe",
  "serieNfce",
  "idCsc",
  "tipoEmissao",
] as const;

export type NfeCertificatePublic = {
  id: string;
  fileName: string;
  cnpj: string | null;
  subject: string | null;
  validFrom: Date;
  validUntil: Date;
  expired: boolean;
  notYetValid: boolean;
  daysToExpire: number;
  expiringSoon: boolean;
  alerta: string | null;
  status: "ATIVO" | "SUBSTITUIDO";
  createdAt: Date;
};

export type NfeConfiguracaoResponse = {
  ambiente: SefazAmbiente;
  serieNfe: number;
  serieNfce: number;
  idCsc: string | null;
  csc: string | null;
  tipoEmissao: number;
  certificado: Omit<NfeCertificatePublic, "status" | "createdAt"> | null;
};

const defaultSettings = {
  ambiente: 2 as SefazAmbiente,
  serieNfe: 1,
  serieNfce: 1,
  idCsc: null as string | null,
  cscEncrypted: null as string | null,
  tipoEmissao: 1,
};

const toPublicCertificate = (
  row: typeof enterprisesNfeCertificates.$inferSelect,
): NfeCertificatePublic => {
  const validity = certificateValidityMeta(
    row.validUntil,
    new Date(),
    row.validFrom,
  );
  return {
    id: row.id,
    fileName: row.fileName,
    cnpj: row.cnpj,
    subject: row.subject,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    expired: validity.expired,
    notYetValid: validity.notYetValid,
    daysToExpire: validity.daysToExpire,
    expiringSoon: validity.expiringSoon,
    alerta: validity.alerta,
    status: row.status,
    createdAt: row.createdAt,
  };
};

const assertEnterprise = async (enterpriseId: string) => {
  const enterprise = (
    await db
      .select({
        id: enterprises.id,
        registration: enterprises.registration,
      })
      .from(enterprises)
      .where(
        and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)),
      )
      .limit(1)
  )[0];
  if (!enterprise) {
    throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
  }
  return enterprise;
};

const getSettingsRow = async (enterpriseId: string) =>
  (
    await db
      .select()
      .from(enterprisesNfe)
      .where(
        and(
          eq(enterprisesNfe.enterpriseId, enterpriseId),
          isNull(enterprisesNfe.deletedAt),
        ),
      )
      .limit(1)
  )[0];

const getActiveCertificateRow = async (enterpriseId: string) =>
  (
    await db
      .select()
      .from(enterprisesNfeCertificates)
      .where(
        and(
          eq(enterprisesNfeCertificates.enterpriseId, enterpriseId),
          eq(enterprisesNfeCertificates.status, "ATIVO"),
          isNull(enterprisesNfeCertificates.deletedAt),
        ),
      )
      .limit(1)
  )[0];

const ensureSettingsRow = async (enterpriseId: string) => {
  const existing = await getSettingsRow(enterpriseId);
  if (existing) {
    return existing;
  }
  const [created] = await db
    .insert(enterprisesNfe)
    .values({ enterpriseId })
    .returning();
  if (!created) {
    throw new Error("Falha ao criar configuracao de NF-e da empresa");
  }
  return created;
};

const toConfigResponse = (
  settings: typeof defaultSettings | typeof enterprisesNfe.$inferSelect,
  certificate: typeof enterprisesNfeCertificates.$inferSelect | undefined,
): NfeConfiguracaoResponse => {
  const publicCert = certificate
    ? toPublicCertificate(certificate)
    : null;
  return {
    ambiente: settings.ambiente as SefazAmbiente,
    serieNfe: settings.serieNfe,
    serieNfce: settings.serieNfce,
    idCsc: settings.idCsc,
    csc: settings.cscEncrypted
      ? decryptSecret(settings.cscEncrypted)
      : null,
    tipoEmissao: settings.tipoEmissao,
    certificado: publicCert
      ? {
          id: publicCert.id,
          fileName: publicCert.fileName,
          cnpj: publicCert.cnpj,
          subject: publicCert.subject,
          validFrom: publicCert.validFrom,
          validUntil: publicCert.validUntil,
          expired: publicCert.expired,
          notYetValid: publicCert.notYetValid,
          daysToExpire: publicCert.daysToExpire,
          expiringSoon: publicCert.expiringSoon,
          alerta: publicCert.alerta,
        }
      : null,
  };
};

export class NfeConfiguracaoService {
  public get = async (
    enterpriseId: string,
  ): Promise<NfeConfiguracaoResponse> => {
    await assertEnterprise(enterpriseId);
    const settings = (await getSettingsRow(enterpriseId)) ?? defaultSettings;
    const certificate = await getActiveCertificateRow(enterpriseId);
    return toConfigResponse(settings, certificate);
  };

  public getAmbiente = async (enterpriseId: string): Promise<SefazAmbiente> => {
    await assertEnterprise(enterpriseId);
    const settings = (await getSettingsRow(enterpriseId)) ?? defaultSettings;
    return settings.ambiente as SefazAmbiente;
  };

  public patch = async (
    enterpriseId: string,
    input: PatchNfeConfiguracaoInput,
    audit: EntityAuditContext,
  ): Promise<NfeConfiguracaoResponse> => {
    await assertEnterprise(enterpriseId);
    const existing = await ensureSettingsRow(enterpriseId);

    const nextCscEncrypted =
      input.csc === undefined
        ? existing.cscEncrypted
        : input.csc === null
          ? null
          : encryptSecret(input.csc);

    const nextIdCsc =
      input.idCsc === undefined ? existing.idCsc : input.idCsc;

    const [updated] = await db
      .update(enterprisesNfe)
      .set({
        ambiente: input.ambiente ?? existing.ambiente,
        serieNfe: input.serieNfe ?? existing.serieNfe,
        serieNfce: input.serieNfce ?? existing.serieNfce,
        idCsc: nextIdCsc,
        cscEncrypted: nextCscEncrypted,
        tipoEmissao: input.tipoEmissao ?? existing.tipoEmissao,
        updatedAt: new Date(),
      })
      .where(eq(enterprisesNfe.id, existing.id))
      .returning();

    await recordEntityAudit({
      entityType: EntityTypes.ENTERPRISES_NFE,
      entityId: existing.id,
      action: "UPDATE",
      before: toAuditRecord(existing),
      after: toAuditRecord(updated ?? existing),
      keys: [...SETTINGS_AUDIT_KEYS],
      ctx: { ...audit, enterpriseId },
    });

    const certificate = await getActiveCertificateRow(enterpriseId);
    return toConfigResponse(updated ?? existing, certificate);
  };

  public listCertificates = async (
    enterpriseId: string,
  ): Promise<NfeCertificatePublic[]> => {
    await assertEnterprise(enterpriseId);
    const rows = await db
      .select()
      .from(enterprisesNfeCertificates)
      .where(
        and(
          eq(enterprisesNfeCertificates.enterpriseId, enterpriseId),
          isNull(enterprisesNfeCertificates.deletedAt),
        ),
      )
      .orderBy(desc(enterprisesNfeCertificates.createdAt));

    return rows.map(toPublicCertificate);
  };

  public uploadCertificate = async (
    enterpriseId: string,
    input: { pfx: Buffer; fileName: string; password: string },
    audit: EntityAuditContext,
  ): Promise<NfeConfiguracaoResponse> => {
    const enterprise = await assertEnterprise(enterpriseId);
    const inspected = inspectPfx(input.pfx, input.password);
    const certCnpj = inspected.cnpj
      ? normalizeCnpjDigits(inspected.cnpj)
      : null;
    const enterpriseCnpj = normalizeCnpjDigits(enterprise.registration);

    if (!certCnpj || certCnpj !== enterpriseCnpj) {
      throw new ValidationError(
        [
          {
            path: "pfx",
            message:
              "CNPJ do certificado digital nao corresponde ao da empresa",
          },
        ],
        certCnpj
          ? `CNPJ do certificado (${certCnpj}) nao corresponde ao da empresa (${enterpriseCnpj})`
          : "Nao foi possivel ler o CNPJ do certificado digital",
      );
    }

    const periodError = certificatePeriodRejection(
      inspected.validFrom,
      inspected.validUntil,
    );
    if (periodError) {
      throw new ValidationError([periodError], periodError.message);
    }

    await ensureSettingsRow(enterpriseId);

    await db.transaction(async (tx) => {
      const current = (
        await tx
          .select()
          .from(enterprisesNfeCertificates)
          .where(
            and(
              eq(enterprisesNfeCertificates.enterpriseId, enterpriseId),
              eq(enterprisesNfeCertificates.status, "ATIVO"),
              isNull(enterprisesNfeCertificates.deletedAt),
            ),
          )
          .limit(1)
      )[0];

      if (current) {
        const [replaced] = await tx
          .update(enterprisesNfeCertificates)
          .set({
            status: "SUBSTITUIDO",
            updatedAt: new Date(),
          })
          .where(eq(enterprisesNfeCertificates.id, current.id))
          .returning();

        await recordEntityAudit({
          entityType: EntityTypes.ENTERPRISES_NFE_CERTIFICATES,
          entityId: current.id,
          action: "UPDATE",
          before: toAuditRecord({
            ...current,
            pfx: undefined,
            passwordEncrypted: undefined,
          }),
          after: toAuditRecord({
            ...(replaced ?? current),
            pfx: undefined,
            passwordEncrypted: undefined,
            status: "SUBSTITUIDO",
          }),
          keys: ["status"],
          ctx: { ...audit, enterpriseId },
          tx,
        });
      }

      const [created] = await tx
        .insert(enterprisesNfeCertificates)
        .values({
          enterpriseId,
          pfx: input.pfx,
          passwordEncrypted: encryptSecret(input.password),
          fileName: input.fileName,
          cnpj: certCnpj,
          subject: inspected.subject || null,
          validFrom: inspected.validFrom,
          validUntil: inspected.validUntil,
          status: "ATIVO",
        })
        .returning();

      if (created) {
        await recordCreateAudit({
          entityType: EntityTypes.ENTERPRISES_NFE_CERTIFICATES,
          entityId: created.id,
          after: {
            id: created.id,
            enterpriseId: created.enterpriseId,
            fileName: created.fileName,
            cnpj: created.cnpj,
            validFrom: created.validFrom,
            validUntil: created.validUntil,
            status: created.status,
          },
          ctx: { ...audit, enterpriseId },
          tx,
        });
      }
    });

    return this.get(enterpriseId);
  };

  public loadCredentials = async (
    enterpriseId: string,
  ): Promise<{ ambiente: SefazAmbiente; certificate: LoadedClientCert }> => {
    await assertEnterprise(enterpriseId);
    const settings = (await getSettingsRow(enterpriseId)) ?? defaultSettings;
    const row = await getActiveCertificateRow(enterpriseId);
    if (!row) {
      throw nfeCertInvalidError(
        "Certificado digital da empresa nao configurado",
      );
    }
    const periodError = certificatePeriodRejection(
      row.validFrom,
      row.validUntil,
    );
    if (periodError) {
      throw nfeCertInvalidError(periodError.message);
    }
    const password = decryptSecret(row.passwordEncrypted);
    return {
      ambiente: settings.ambiente as SefazAmbiente,
      certificate: loadPfxFromBuffer(row.pfx, password),
    };
  };
}

export const nfeConfiguracaoService = new NfeConfiguracaoService();
