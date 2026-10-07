import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import {
  ceps,
  cities,
  countries,
  enterprises,
  enterprisesAddress,
  enterprisesMembers,
  enterprisesPrintModels,
  enterprisesSequences,
  fiscalDocumentModels,
  states,
} from "../../db/schema.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/errors/app-error.js";
import { isActiveEnterprise, activeUserMembershipWhere } from "../../shared/db/tenant-predicates.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import type { ListEnterprisesQuery } from "./schema.js";
import {
  resolveEnterpriseParameters,
  resolveEnterpriseParametersMany,
} from "./parameters/resolve.js";
import { serializeEnterpriseParameters } from "./parameters/catalog.js";
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
import {
  removePhoto as removeStoredPhoto,
  savePhoto,
  type PhotoFile,
} from "../../shared/photos/photo-storage.js";

const mapMembershipsToListItem = (
  rows: Array<{
    id: string;
    memberId: string;
    class: (typeof enterprisesMembers.$inferSelect)["class"];
    enterprise: (typeof enterprises.$inferSelect) | null;
    parameters: Awaited<ReturnType<typeof resolveEnterpriseParameters>>;
  }>,
) =>
  rows.map((row) => ({
    id: row.enterprise!.id,
    tradeName: row.enterprise!.tradeName,
    legalName: row.enterprise!.legalName,
    registration: row.enterprise!.registration,
    registeredOn: row.enterprise!.registeredOn,
    phone: row.enterprise!.phone,
    email: row.enterprise!.email,
    whatsapp: row.enterprise!.whatsapp,
    stateRegistration: row.enterprise!.stateRegistration,
    municipalRegistration: row.enterprise!.municipalRegistration,
    suframaRegistration: row.enterprise!.suframaRegistration,
    crt: row.enterprise!.crt,
    logoUrl: row.enterprise!.logoUrl,
    pdfFolder: row.enterprise!.pdfFolder,
    memberId: row.memberId,
    class: row.class,
    parameters: row.parameters,
    createdAt: row.enterprise!.createdAt,
    updatedAt: row.enterprise!.updatedAt,
  }));

type EnterpriseAddressWithDetails = typeof enterprisesAddress.$inferSelect & {
  cep?:
    | (typeof ceps.$inferSelect & {
        city?:
          | (typeof cities.$inferSelect & {
              state?:
                | (typeof states.$inferSelect & {
                    country?: typeof countries.$inferSelect | null;
                  })
                | null;
            })
          | null;
      })
    | null;
};

function mapEnterpriseAddressDetails(address: EnterpriseAddressWithDetails) {
  const city = address.cep?.city;
  const state = city?.state;
  const country = state?.country;

  return {
    id: address.id,
    number: address.number,
    complement: address.complement,
    adressType: address.adressType,
    enterpriseId: address.enterpriseId,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
    deletedAt: address.deletedAt,
    cep: address.cep
      ? {
          id: address.cep.id,
          cepNumber: address.cep.cepNumber,
          address: address.cep.address,
          neighborhood: address.cep.neighborhood,
          city: city
            ? {
                id: city.id,
                ibgeCode: city.ibgeCode,
                citieName: city.citieName,
                state: state
                  ? {
                      id: state.id,
                      acronym: state.acronym,
                      description: state.description,
                      country: country
                        ? {
                            id: country.id,
                            countryCode: country.countryCode,
                            countryName: country.countryName,
                          }
                        : null,
                    }
                  : null,
              }
            : null,
        }
      : null,
  };
}

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
    const parametersByEnterprise = await resolveEnterpriseParametersMany(
      page.map((row) => row.enterprise!.id),
    );

    return {
      items: mapMembershipsToListItem(
        page.map((row) => ({
          id: row.enterprise!.id,
          memberId: row.id,
          class: row.class,
          enterprise: row.enterprise,
          parameters:
            parametersByEnterprise.get(row.enterprise!.id) ??
            serializeEnterpriseParameters({}),
        })),
      ),
      total,
      limit,
      offset,
    };
  }

  //Busca uma empresa por ID (cadastro, endereços detalhados e sequências activos)
  public async getById(id: string) {
    const row = await db.query.enterprises.findFirst({
      where: and(eq(enterprises.id, id), isNull(enterprises.deletedAt)),
      with: {
        addresses: {
          where: isNull(enterprisesAddress.deletedAt),
          orderBy: [
            asc(enterprisesAddress.adressType),
            asc(enterprisesAddress.id),
          ],
          with: {
            cep: {
              with: {
                city: {
                  with: {
                    state: {
                      with: {
                        country: true,
                      },
                    },
                  },
                },
              },
            },
          },
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
    const parameters = await resolveEnterpriseParameters(id);
    return {
      ...enterprise,
      printModels: await this.printModelCodes(id),
      addresses: (addresses as EnterpriseAddressWithDetails[]).map(
        mapEnterpriseAddressDetails,
      ),
      sequences,
      parameters,
    };
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
    const nextModels = input.printModels ? [...new Set(input.printModels)].sort() : undefined;
    if (nextModels?.length) {
      const found = await db
        .select({ code: fiscalDocumentModels.code })
        .from(fiscalDocumentModels)
        .where(inArray(fiscalDocumentModels.code, nextModels));
      const missing = nextModels.filter((code) => !found.some((item) => item.code === code));
      if (missing.length) {
        throw new BadRequestError(
          `Modelo de nota nao cadastrado: ${missing.join(", ")}`,
          "ENTERPRISE_PRINT_MODEL_INVALID",
        );
      }
    }
    const previousModels = nextModels ? await this.printModelCodes(id) : undefined;
    try {
      const row = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(enterprises)
          .set({
            ...(input.pdfFolder !== undefined ? { pdfFolder: input.pdfFolder } : {}),
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
            ...(input.stateRegistration !== undefined
              ? { stateRegistration: input.stateRegistration }
              : {}),
            ...(input.municipalRegistration !== undefined
              ? { municipalRegistration: input.municipalRegistration }
              : {}),
            ...(input.suframaRegistration !== undefined
              ? { suframaRegistration: input.suframaRegistration }
              : {}),
            ...(input.crt !== undefined ? { crt: input.crt } : {}),
            updatedAt: new Date(),
          })
          .where(whereActiveById(enterprises, id))
          .returning();
        if (!updated) return undefined;
        if (nextModels) {
          await tx.delete(enterprisesPrintModels).where(eq(enterprisesPrintModels.enterpriseId, id));
          if (nextModels.length) {
            await tx.insert(enterprisesPrintModels).values(
              nextModels.map((documentModelCode) => ({ enterpriseId: id, documentModelCode })),
            );
          }
        }
        return updated;
      });
      if (!row) {
        throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
      }
      await recordEntityAudit({
        entityType: EntityTypes.ENTERPRISES,
        entityId: id,
        action: "UPDATE",
        before: { ...toAuditRecord(existing), ...(previousModels ? { printModels: previousModels } : {}) },
        after: { ...toAuditRecord(row), ...(nextModels ? { printModels: nextModels } : {}) },
        ctx: { ...audit, enterpriseId: audit.enterpriseId ?? id },
      });
      return { ...row, printModels: nextModels ?? (await this.printModelCodes(id)) };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new ConflictError(
        "Dados da empresa em conflito com cadastro existente",
        "ENTERPRISE_CONFLICT",
      );
    }
  }

  private async printModelCodes(id: string) {
    const rows = await db
      .select({ code: enterprisesPrintModels.documentModelCode })
      .from(enterprisesPrintModels)
      .where(eq(enterprisesPrintModels.enterpriseId, id))
      .orderBy(asc(enterprisesPrintModels.documentModelCode));
    return rows.map((item) => item.code);
  }

  private async findActive(id: string) {
    const [row] = await db
      .select()
      .from(enterprises)
      .where(whereActiveById(enterprises, id))
      .limit(1);
    if (!row) {
      throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    }
    return row;
  }

  public async setLogo(id: string, file: PhotoFile, audit: EntityAuditContext) {
    const existing = await this.findActive(id);
    const logoUrl = await savePhoto({
      folder: "empresas",
      id,
      name: existing.tradeName,
      file,
    });
    let row: typeof enterprises.$inferSelect | undefined;
    try {
      [row] = await db
        .update(enterprises)
        .set({ logoUrl, updatedAt: new Date() })
        .where(whereActiveById(enterprises, id))
        .returning();
    } catch (error) {
      await removeStoredPhoto(logoUrl);
      throw error;
    }
    if (!row) {
      await removeStoredPhoto(logoUrl);
      throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    }
    await recordEntityAudit({
      entityType: EntityTypes.ENTERPRISES,
      entityId: id,
      action: "UPDATE",
      before: { logoUrl: existing.logoUrl },
      after: { logoUrl },
      ctx: { ...audit, enterpriseId: audit.enterpriseId ?? id },
    });
    if (existing.logoUrl && existing.logoUrl !== logoUrl) {
      await removeStoredPhoto(existing.logoUrl);
    }
    return { logoUrl };
  }

  public async removeLogo(id: string, audit: EntityAuditContext) {
    const existing = await this.findActive(id);
    const [row] = await db
      .update(enterprises)
      .set({ logoUrl: null, updatedAt: new Date() })
      .where(whereActiveById(enterprises, id))
      .returning({ id: enterprises.id });
    if (!row) {
      throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    }
    await recordEntityAudit({
      entityType: EntityTypes.ENTERPRISES,
      entityId: id,
      action: "UPDATE",
      before: { logoUrl: existing.logoUrl },
      after: { logoUrl: null },
      ctx: { ...audit, enterpriseId: audit.enterpriseId ?? id },
    });
    await removeStoredPhoto(existing.logoUrl);
    return { logoUrl: null };
  }
}
export const enterprisesService = new EnterprisesService();
