import { and, asc, eq, isNull, ne } from "drizzle-orm";
import {
  db,
  users,
  usersAddress,
  usersContact,
  usersFinancialInfo,
  usersPersonalInfo,
  usersRelationships,
  usersTaxInfos,
} from "../../../db/schema.js";
import { findUserByIdScoped } from "../repository.js";
import {
  activeMembershipForEnterprise,
  hasActiveTenantMembership,
} from "../../../shared/db/tenant-predicates.js";
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import {
  softDeleteValues,
  touchUpdatedAt,
} from "../../../shared/db/record-lifecycle.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  recordSoftDeleteAudit,
  withEnterpriseAuditContext,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { assertAddressHierarchy } from "../../enterprises/enterprise-addresses/enterprise-address-validation.js";
import type { UserGetByIdReadMode } from "../../../shared/middleware/user-read-access-middleware.js";
import type {
  PersonalInfoCreateInput,
  PersonalInfoPatchInput,
  UsersAddressCreateInput,
  UsersAddressPatchInput,
  UsersContactCreateInput,
  UsersContactPatchInput,
  UsersFinancialInfoCreateInput,
  UsersFinancialInfoPatchInput,
  UsersRelationshipsCreateInput,
  UsersRelationshipsPatchInput,
  UsersTaxInfosCreateInput,
  UsersTaxInfosPatchInput,
} from "./schema.js";

import { parseIsoDateOnly } from "../../../shared/validation/data-normalizers.js";

function decimalToString(value: number | undefined) {
  return value === undefined ? undefined : value.toString();
}

function isActiveChild<T extends { deletedAt: Date | null }>(
  row: T | null | undefined,
): row is T {
  return row != null && row.deletedAt == null;
}

function mapUserDetailsResponse(
  row: {
    id: string;
    userName: string;
    userPhone: string;
    userEmail: string;
    personalInfo?: typeof usersPersonalInfo.$inferSelect | null;
    addresses?: (typeof usersAddress.$inferSelect)[];
    contacts?: (typeof usersContact.$inferSelect)[];
    relationships?: typeof usersRelationships.$inferSelect | null;
    taxInfos?: typeof usersTaxInfos.$inferSelect | null;
    financialInfo?: typeof usersFinancialInfo.$inferSelect | null;
  },
  readMode: UserGetByIdReadMode,
) {
  return {
    user: {
      id: row.id,
      userName: row.userName,
      userPhone: row.userPhone,
      userEmail: row.userEmail,
    },
    personalInfo: isActiveChild(row.personalInfo) ? row.personalInfo : null,
    addresses: row.addresses ?? [],
    contacts: row.contacts ?? [],
    relationships: isActiveChild(row.relationships) ? row.relationships : null,
    taxInfos: isActiveChild(row.taxInfos) ? row.taxInfos : null,
    financialInfo: isActiveChild(row.financialInfo) ? row.financialInfo : null,
    accessMode: readMode,
  };
}

export class UsersOnboardingService {
  private async assertUserInEnterprise(userId: string, enterpriseId: string) {
    const row = await findUserByIdScoped(userId, enterpriseId);
    if (!row) {
      throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
    }
  }

  public async getUsersWithDetails(
    userId: string,
    enterpriseId: string,
    readMode: UserGetByIdReadMode,
  ) {
    const detailsWith = {
      personalInfo: true as const,
      addresses: {
        where: isNull(usersAddress.deletedAt),
        orderBy: [asc(usersAddress.adressType), asc(usersAddress.id)],
      },
      contacts: {
        where: isNull(usersContact.deletedAt),
        orderBy: [asc(usersContact.type), asc(usersContact.id)],
      },
      relationships: true as const,
      taxInfos: true as const,
      financialInfo: true as const,
    };

    if (readMode === "directory") {
      const row = await db.query.users.findFirst({
        where: and(eq(users.id, userId), isNull(users.deletedAt)),
        with: {
          ...detailsWith,
          memberships: {
            where: activeMembershipForEnterprise(enterpriseId),
            with: { enterprise: true },
          },
        },
      });

      if (!row || !hasActiveTenantMembership(row.memberships)) {
        throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
      }

      return mapUserDetailsResponse(row, readMode);
    }

    const row = await db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
      with: detailsWith,
    });

    if (!row) {
      throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
    }

    return mapUserDetailsResponse(row, readMode);
  }

  public async createPersonalInfo(
    enterpriseId: string,
    userId: string,
    input: PersonalInfoCreateInput,
    audit: EntityAuditContext,
  ) {
    await this.assertUserInEnterprise(userId, enterpriseId);

    return db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: usersPersonalInfo.id })
        .from(usersPersonalInfo)
        .where(
          and(
            eq(usersPersonalInfo.userId, userId),
            isNull(usersPersonalInfo.deletedAt),
          ),
        )
        .limit(1);

      if (existing[0]) {
        throw new ConflictError(
          "Informacoes pessoais ja cadastradas",
          "USER_PERSONAL_INFO_ALREADY_EXISTS",
        );
      }

      const [row] = await tx
        .insert(usersPersonalInfo)
        .values({
          userId,
          gender: input.gender,
          birthDate: input.birthDate
            ? parseIsoDateOnly(input.birthDate)
            : undefined,
          placeOfBirth: input.placeOfBirth,
        })
        .returning();

      if (!row) {
        throw new InternalServerError("Falha ao criar informacoes pessoais");
      }

      await recordCreateAudit({
        entityType: EntityTypes.USERS_PERSONAL_INFO,
        entityId: row.id,
        after: row,
        ctx: withEnterpriseAuditContext(audit, enterpriseId),
        tx,
      });

      return row;
    });
  }

  public async patchPersonalInfo(
    enterpriseId: string,
    userId: string,
    input: PersonalInfoPatchInput,
    audit: EntityAuditContext,
  ) {
    await this.assertUserInEnterprise(userId, enterpriseId);

    const rows = await db
      .select()
      .from(usersPersonalInfo)
      .where(
        and(
          eq(usersPersonalInfo.userId, userId),
          isNull(usersPersonalInfo.deletedAt),
        ),
      )
      .limit(1);

    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "Informacoes pessoais nao encontradas",
        "USER_PERSONAL_INFO_NOT_FOUND",
      );
    }

    const now = new Date();

    const [row] = await db
      .update(usersPersonalInfo)
      .set({
        ...(input.gender !== undefined ? { gender: input.gender } : {}),
        ...(input.birthDate !== undefined
          ? { birthDate: parseIsoDateOnly(input.birthDate) }
          : {}),
        ...(input.placeOfBirth !== undefined
          ? { placeOfBirth: input.placeOfBirth }
          : {}),
        ...touchUpdatedAt(now),
      })
      .where(
        and(
          eq(usersPersonalInfo.userId, userId),
          isNull(usersPersonalInfo.deletedAt),
        ),
      )
      .returning();

    if (!row) {
      throw new NotFoundError(
        "Informacoes pessoais nao encontradas",
        "USER_PERSONAL_INFO_NOT_FOUND",
      );
    }

    await recordEntityAudit({
      entityType: EntityTypes.USERS_PERSONAL_INFO,
      entityId: row.id,
      action: "UPDATE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: withEnterpriseAuditContext(audit, enterpriseId),
    });

    return row;
  }

  public async createAddress(
    enterpriseId: string,
    userId: string,
    input: UsersAddressCreateInput,
    audit: EntityAuditContext,
  ) {
    await this.assertUserInEnterprise(userId, enterpriseId);

    await assertAddressHierarchy({
      cepId: input.cepId,
      cityId: input.cityId,
      stateId: input.stateId,
      countryId: input.countryId,
    });

    return db.transaction(async (tx) => {
      if (input.adressType === "PRINCIPAL") {
        const conflict = await tx
          .select({ id: usersAddress.id })
          .from(usersAddress)
          .where(
            and(
              eq(usersAddress.userId, userId),
              eq(usersAddress.adressType, "PRINCIPAL"),
              isNull(usersAddress.deletedAt),
            ),
          )
          .limit(1);

        if (conflict[0]) {
          throw new ConflictError(
            "Endereco principal ja cadastrado",
            "USER_ADDRESS_PRINCIPAL_ALREADY_EXISTS",
          );
        }
      }

      const [row] = await tx
        .insert(usersAddress)
        .values({
          userId,
          cepId: input.cepId,
          countryId: input.countryId,
          stateId: input.stateId,
          cityId: input.cityId,
          adressType: input.adressType,
        })
        .returning();

      if (!row) {
        throw new InternalServerError("Falha ao criar endereco do usuario");
      }

      await recordCreateAudit({
        entityType: EntityTypes.USERS_ADDRESS,
        entityId: row.id,
        after: row,
        ctx: withEnterpriseAuditContext(audit, enterpriseId),
        tx,
      });

      return row;
    });
  }

  public async patchAddress(
    enterpriseId: string,
    userId: string,
    addressId: string,
    input: UsersAddressPatchInput,
    audit: EntityAuditContext,
  ) {
    await this.assertUserInEnterprise(userId, enterpriseId);

    const rows = await db
      .select()
      .from(usersAddress)
      .where(
        and(
          eq(usersAddress.id, addressId),
          eq(usersAddress.userId, userId),
          isNull(usersAddress.deletedAt),
        ),
      )
      .limit(1);

    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "Endereco do usuario nao encontrado",
        "USER_ADDRESS_NOT_FOUND",
      );
    }

    const now = new Date();

    if (input.softDelete === true) {
      const [row] = await db
        .update(usersAddress)
        .set(softDeleteValues(now))
        .where(
          and(
            eq(usersAddress.id, addressId),
            eq(usersAddress.userId, userId),
            isNull(usersAddress.deletedAt),
          ),
        )
        .returning();

      if (!row) {
        throw new NotFoundError(
          "Endereco do usuario nao encontrado",
          "USER_ADDRESS_NOT_FOUND",
        );
      }

      await recordSoftDeleteAudit({
        entityType: EntityTypes.USERS_ADDRESS,
        entityId: addressId,
        before: existing,
        after: row,
        ctx: withEnterpriseAuditContext(audit, enterpriseId),
      });
      return row;
    }

    const effective = {
      cepId: input.cepId ?? existing.cepId,
      cityId: input.cityId ?? existing.cityId,
      stateId: input.stateId ?? existing.stateId,
      countryId: input.countryId ?? existing.countryId,
      adressType: input.adressType ?? existing.adressType,
    };

    const hierarchyChanged =
      input.cepId !== undefined ||
      input.countryId !== undefined ||
      input.stateId !== undefined ||
      input.cityId !== undefined;

    if (hierarchyChanged) {
      await assertAddressHierarchy({
        cepId: effective.cepId,
        cityId: effective.cityId,
        stateId: effective.stateId,
        countryId: effective.countryId,
      });
    }

    if (effective.adressType === "PRINCIPAL") {
      const conflict = await db
        .select({ id: usersAddress.id })
        .from(usersAddress)
        .where(
          and(
            eq(usersAddress.userId, userId),
            eq(usersAddress.adressType, "PRINCIPAL"),
            isNull(usersAddress.deletedAt),
            ne(usersAddress.id, addressId),
          ),
        )
        .limit(1);

      if (conflict[0]) {
        throw new ConflictError(
          "Endereco principal ja cadastrado",
          "USER_ADDRESS_PRINCIPAL_ALREADY_EXISTS",
        );
      }
    }

    const [row] = await db
      .update(usersAddress)
      .set({
        ...(input.cepId !== undefined ? { cepId: input.cepId } : {}),
        ...(input.countryId !== undefined
          ? { countryId: input.countryId }
          : {}),
        ...(input.stateId !== undefined ? { stateId: input.stateId } : {}),
        ...(input.cityId !== undefined ? { cityId: input.cityId } : {}),
        ...(input.adressType !== undefined
          ? { adressType: input.adressType }
          : {}),
        ...touchUpdatedAt(now),
      })
      .where(
        and(
          eq(usersAddress.id, addressId),
          eq(usersAddress.userId, userId),
          isNull(usersAddress.deletedAt),
        ),
      )
      .returning();

    if (!row) {
      throw new NotFoundError(
        "Endereco do usuario nao encontrado",
        "USER_ADDRESS_NOT_FOUND",
      );
    }

    await recordEntityAudit({
      entityType: EntityTypes.USERS_ADDRESS,
      entityId: addressId,
      action: "UPDATE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: withEnterpriseAuditContext(audit, enterpriseId),
    });
    return row;
  }

  public async createContact(
    enterpriseId: string,
    userId: string,
    input: UsersContactCreateInput,
    audit: EntityAuditContext,
  ) {
    await this.assertUserInEnterprise(userId, enterpriseId);

    return db.transaction(async (tx) => {
      if (input.type === "PRINCIPAL") {
        const conflict = await tx
          .select({ id: usersContact.id })
          .from(usersContact)
          .where(
            and(
              eq(usersContact.userId, userId),
              eq(usersContact.type, "PRINCIPAL"),
              isNull(usersContact.deletedAt),
            ),
          )
          .limit(1);

        if (conflict[0]) {
          throw new ConflictError(
            "Contato principal ja cadastrado",
            "USER_CONTACT_PRINCIPAL_ALREADY_EXISTS",
          );
        }
      }

      const [row] = await tx
        .insert(usersContact)
        .values({
          userId,
          phone: input.phone,
          email: input.email,
          whatsapp: input.whatsapp,
          type: input.type,
        })
        .returning();

      if (!row) {
        throw new InternalServerError("Falha ao criar contato do usuario");
      }

      await recordCreateAudit({
        entityType: EntityTypes.USERS_CONTACT,
        entityId: row.id,
        after: row,
        ctx: withEnterpriseAuditContext(audit, enterpriseId),
        tx,
      });

      return row;
    });
  }

  public async patchContact(
    enterpriseId: string,
    userId: string,
    contactId: string,
    input: UsersContactPatchInput,
    audit: EntityAuditContext,
  ) {
    await this.assertUserInEnterprise(userId, enterpriseId);

    const rows = await db
      .select()
      .from(usersContact)
      .where(
        and(
          eq(usersContact.id, contactId),
          eq(usersContact.userId, userId),
          isNull(usersContact.deletedAt),
        ),
      )
      .limit(1);

    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "Contato do usuario nao encontrado",
        "USER_CONTACT_NOT_FOUND",
      );
    }

    const now = new Date();

    if (input.softDelete === true) {
      const [row] = await db
        .update(usersContact)
        .set(softDeleteValues(now))
        .where(
          and(
            eq(usersContact.id, contactId),
            eq(usersContact.userId, userId),
            isNull(usersContact.deletedAt),
          ),
        )
        .returning();

      if (!row) {
        throw new NotFoundError(
          "Contato do usuario nao encontrado",
          "USER_CONTACT_NOT_FOUND",
        );
      }

      await recordSoftDeleteAudit({
        entityType: EntityTypes.USERS_CONTACT,
        entityId: contactId,
        before: existing,
        after: row,
        ctx: withEnterpriseAuditContext(audit, enterpriseId),
      });
      return row;
    }

    const effectiveType = input.type ?? existing.type;

    if (effectiveType === "PRINCIPAL") {
      const conflict = await db
        .select({ id: usersContact.id })
        .from(usersContact)
        .where(
          and(
            eq(usersContact.userId, userId),
            eq(usersContact.type, "PRINCIPAL"),
            isNull(usersContact.deletedAt),
            ne(usersContact.id, contactId),
          ),
        )
        .limit(1);

      if (conflict[0]) {
        throw new ConflictError(
          "Contato principal ja cadastrado",
          "USER_CONTACT_PRINCIPAL_ALREADY_EXISTS",
        );
      }
    }

    const [row] = await db
      .update(usersContact)
      .set({
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...touchUpdatedAt(now),
      })
      .where(
        and(
          eq(usersContact.id, contactId),
          eq(usersContact.userId, userId),
          isNull(usersContact.deletedAt),
        ),
      )
      .returning();

    if (!row) {
      throw new NotFoundError(
        "Contato do usuario nao encontrado",
        "USER_CONTACT_NOT_FOUND",
      );
    }

    await recordEntityAudit({
      entityType: EntityTypes.USERS_CONTACT,
      entityId: contactId,
      action: "UPDATE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: withEnterpriseAuditContext(audit, enterpriseId),
    });
    return row;
  }

  public async createRelationships(
    enterpriseId: string,
    userId: string,
    input: UsersRelationshipsCreateInput,
    audit: EntityAuditContext,
  ) {
    await this.assertUserInEnterprise(userId, enterpriseId);

    return db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: usersRelationships.id })
        .from(usersRelationships)
        .where(
          and(
            eq(usersRelationships.userId, userId),
            isNull(usersRelationships.deletedAt),
          ),
        )
        .limit(1);

      if (existing[0]) {
        throw new ConflictError(
          "Relacionamentos ja cadastrados",
          "USER_RELATIONSHIPS_ALREADY_EXISTS",
        );
      }

      const [row] = await tx
        .insert(usersRelationships)
        .values({
          userId,
          maritalStatus: input.maritalStatus,
          spouseName: input.spouseName,
          housingType: input.housingType,
          rentalPeriod: input.rentalPeriod,
          motherName: input.motherName,
          fatherName: input.fatherName,
          profession: input.profession,
          professionDescription: input.professionDescription,
          professionTime: input.professionTime,
          income: decimalToString(input.income),
          linkWithSeller: input.linkWithSeller,
          toWarmUp: input.toWarmUp,
        })
        .returning();

      if (!row) {
        throw new InternalServerError(
          "Falha ao criar relacionamentos do usuario",
        );
      }

      await recordCreateAudit({
        entityType: EntityTypes.USERS_RELATIONSHIPS,
        entityId: row.id,
        after: row,
        ctx: withEnterpriseAuditContext(audit, enterpriseId),
        tx,
      });

      return row;
    });
  }

  public async patchRelationships(
    enterpriseId: string,
    userId: string,
    input: UsersRelationshipsPatchInput,
    audit: EntityAuditContext,
  ) {
    await this.assertUserInEnterprise(userId, enterpriseId);

    const rows = await db
      .select()
      .from(usersRelationships)
      .where(
        and(
          eq(usersRelationships.userId, userId),
          isNull(usersRelationships.deletedAt),
        ),
      )
      .limit(1);

    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "Relacionamentos do usuario nao encontrados",
        "USER_RELATIONSHIPS_NOT_FOUND",
      );
    }

    const now = new Date();

    const [row] = await db
      .update(usersRelationships)
      .set({
        ...(input.maritalStatus !== undefined
          ? { maritalStatus: input.maritalStatus }
          : {}),
        ...(input.spouseName !== undefined
          ? { spouseName: input.spouseName }
          : {}),
        ...(input.housingType !== undefined
          ? { housingType: input.housingType }
          : {}),
        ...(input.rentalPeriod !== undefined
          ? { rentalPeriod: input.rentalPeriod }
          : {}),
        ...(input.motherName !== undefined
          ? { motherName: input.motherName }
          : {}),
        ...(input.fatherName !== undefined
          ? { fatherName: input.fatherName }
          : {}),
        ...(input.profession !== undefined
          ? { profession: input.profession }
          : {}),
        ...(input.professionDescription !== undefined
          ? { professionDescription: input.professionDescription }
          : {}),
        ...(input.professionTime !== undefined
          ? { professionTime: input.professionTime }
          : {}),
        ...(input.income !== undefined
          ? { income: decimalToString(input.income) }
          : {}),
        ...(input.linkWithSeller !== undefined
          ? { linkWithSeller: input.linkWithSeller }
          : {}),
        ...(input.toWarmUp !== undefined ? { toWarmUp: input.toWarmUp } : {}),
        ...touchUpdatedAt(now),
      })
      .where(
        and(
          eq(usersRelationships.userId, userId),
          isNull(usersRelationships.deletedAt),
        ),
      )
      .returning();

    if (!row) {
      throw new NotFoundError(
        "Relacionamentos do usuario nao encontrados",
        "USER_RELATIONSHIPS_NOT_FOUND",
      );
    }

    await recordEntityAudit({
      entityType: EntityTypes.USERS_RELATIONSHIPS,
      entityId: row.id,
      action: "UPDATE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: withEnterpriseAuditContext(audit, enterpriseId),
    });
    return row;
  }

  public async createTaxInfos(
    enterpriseId: string,
    userId: string,
    input: UsersTaxInfosCreateInput,
    audit: EntityAuditContext,
  ) {
    await this.assertUserInEnterprise(userId, enterpriseId);

    return db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: usersTaxInfos.id })
        .from(usersTaxInfos)
        .where(
          and(
            eq(usersTaxInfos.userId, userId),
            isNull(usersTaxInfos.deletedAt),
          ),
        )
        .limit(1);

      if (existing[0]) {
        throw new ConflictError(
          "Informacoes fiscais ja cadastradas",
          "USER_TAX_INFOS_ALREADY_EXISTS",
        );
      }

      const [row] = await tx
        .insert(usersTaxInfos)
        .values({
          userId,
          renegotiation: input.renegotiation,
          spc_registration: input.spc_registration,
          spc_registry_date: input.spc_registry_date
            ? parseIsoDateOnly(input.spc_registry_date)
            : undefined,
          stateRegistration: input.stateRegistration,
          municipalRegistration: input.municipalRegistration,
          suframa_registration: input.suframa_registration,
          userLegalName: input.userLegalName,
          r3_code: input.r3_code,
          sefaz_Date: input.sefaz_Date
            ? parseIsoDateOnly(input.sefaz_Date)
            : undefined,
          governmentEntity: input.governmentEntity,
          benefitCode: input.benefitCode,
        })
        .returning();

      if (!row) {
        throw new InternalServerError(
          "Falha ao criar informacoes fiscais do usuario",
        );
      }

      await recordCreateAudit({
        entityType: EntityTypes.USERS_TAX_INFOS,
        entityId: row.id,
        after: row,
        ctx: withEnterpriseAuditContext(audit, enterpriseId),
        tx,
      });

      return row;
    });
  }

  public async patchTaxInfos(
    enterpriseId: string,
    userId: string,
    input: UsersTaxInfosPatchInput,
    audit: EntityAuditContext,
  ) {
    await this.assertUserInEnterprise(userId, enterpriseId);

    const rows = await db
      .select()
      .from(usersTaxInfos)
      .where(
        and(eq(usersTaxInfos.userId, userId), isNull(usersTaxInfos.deletedAt)),
      )
      .limit(1);

    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "Informacoes fiscais do usuario nao encontradas",
        "USER_TAX_INFOS_NOT_FOUND",
      );
    }

    const now = new Date();

    const [row] = await db
      .update(usersTaxInfos)
      .set({
        ...(input.renegotiation !== undefined
          ? { renegotiation: input.renegotiation }
          : {}),
        ...(input.spc_registration !== undefined
          ? { spc_registration: input.spc_registration }
          : {}),
        ...(input.spc_registry_date !== undefined
          ? { spc_registry_date: parseIsoDateOnly(input.spc_registry_date) }
          : {}),
        ...(input.stateRegistration !== undefined
          ? { stateRegistration: input.stateRegistration }
          : {}),
        ...(input.municipalRegistration !== undefined
          ? { municipalRegistration: input.municipalRegistration }
          : {}),
        ...(input.suframa_registration !== undefined
          ? { suframa_registration: input.suframa_registration }
          : {}),
        ...(input.userLegalName !== undefined
          ? { userLegalName: input.userLegalName }
          : {}),
        ...(input.r3_code !== undefined ? { r3_code: input.r3_code } : {}),
        ...(input.sefaz_Date !== undefined
          ? { sefaz_Date: parseIsoDateOnly(input.sefaz_Date) }
          : {}),
        ...(input.governmentEntity !== undefined
          ? { governmentEntity: input.governmentEntity }
          : {}),
        ...(input.benefitCode !== undefined
          ? { benefitCode: input.benefitCode }
          : {}),
        ...touchUpdatedAt(now),
      })
      .where(
        and(eq(usersTaxInfos.userId, userId), isNull(usersTaxInfos.deletedAt)),
      )
      .returning();

    if (!row) {
      throw new NotFoundError(
        "Informacoes fiscais do usuario nao encontradas",
        "USER_TAX_INFOS_NOT_FOUND",
      );
    }

    await recordEntityAudit({
      entityType: EntityTypes.USERS_TAX_INFOS,
      entityId: row.id,
      action: "UPDATE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: withEnterpriseAuditContext(audit, enterpriseId),
    });
    return row;
  }

  public async createFinancialInfo(
    enterpriseId: string,
    userId: string,
    input: UsersFinancialInfoCreateInput,
    audit: EntityAuditContext,
  ) {
    await this.assertUserInEnterprise(userId, enterpriseId);

    return db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: usersFinancialInfo.id })
        .from(usersFinancialInfo)
        .where(
          and(
            eq(usersFinancialInfo.userId, userId),
            isNull(usersFinancialInfo.deletedAt),
          ),
        )
        .limit(1);

      if (existing[0]) {
        throw new ConflictError(
          "Informacoes financeiras ja cadastradas",
          "USER_FINANCIAL_INFO_ALREADY_EXISTS",
        );
      }

      const [row] = await tx
        .insert(usersFinancialInfo)
        .values({
          userId,
          ICMSReduction: decimalToString(input.ICMSReduction),
          discountLimit: decimalToString(input.discountLimit),
          discoutArrangement: input.discoutArrangement,
          creditType: input.creditType,
          requestAmount: decimalToString(input.requestAmount),
          budgetPrice: decimalToString(input.budgetPrice),
          taxRegime: input.taxRegime,
          purchaseOrder: input.purchaseOrder,
          prevRate: decimalToString(input.prevRate),
          ratTax: decimalToString(input.ratTax),
          reductionRate: decimalToString(input.reductionRate),
          senarTax: decimalToString(input.senarTax),
          low: input.low,
          sale_discount: decimalToString(input.sale_discount),
          doSt: input.doSt,
          sendNF: input.sendNF,
        })
        .returning();

      if (!row) {
        throw new InternalServerError(
          "Falha ao criar informacoes financeiras do usuario",
        );
      }

      await recordCreateAudit({
        entityType: EntityTypes.USERS_FINANCIAL_INFO,
        entityId: row.id,
        after: row,
        ctx: withEnterpriseAuditContext(audit, enterpriseId),
        tx,
      });

      return row;
    });
  }

  public async patchFinancialInfo(
    enterpriseId: string,
    userId: string,
    input: UsersFinancialInfoPatchInput,
    audit: EntityAuditContext,
  ) {
    await this.assertUserInEnterprise(userId, enterpriseId);

    const rows = await db
      .select()
      .from(usersFinancialInfo)
      .where(
        and(
          eq(usersFinancialInfo.userId, userId),
          isNull(usersFinancialInfo.deletedAt),
        ),
      )
      .limit(1);

    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "Informacoes financeiras do usuario nao encontradas",
        "USER_FINANCIAL_INFO_NOT_FOUND",
      );
    }

    const now = new Date();

    const [row] = await db
      .update(usersFinancialInfo)
      .set({
        ...(input.ICMSReduction !== undefined
          ? { ICMSReduction: decimalToString(input.ICMSReduction) }
          : {}),
        ...(input.discountLimit !== undefined
          ? { discountLimit: decimalToString(input.discountLimit) }
          : {}),
        ...(input.discoutArrangement !== undefined
          ? { discoutArrangement: input.discoutArrangement }
          : {}),
        ...(input.creditType !== undefined
          ? { creditType: input.creditType }
          : {}),
        ...(input.requestAmount !== undefined
          ? { requestAmount: decimalToString(input.requestAmount) }
          : {}),
        ...(input.budgetPrice !== undefined
          ? { budgetPrice: decimalToString(input.budgetPrice) }
          : {}),
        ...(input.taxRegime !== undefined
          ? { taxRegime: input.taxRegime }
          : {}),
        ...(input.purchaseOrder !== undefined
          ? { purchaseOrder: input.purchaseOrder }
          : {}),
        ...(input.prevRate !== undefined
          ? { prevRate: decimalToString(input.prevRate) }
          : {}),
        ...(input.ratTax !== undefined
          ? { ratTax: decimalToString(input.ratTax) }
          : {}),
        ...(input.reductionRate !== undefined
          ? { reductionRate: decimalToString(input.reductionRate) }
          : {}),
        ...(input.senarTax !== undefined
          ? { senarTax: decimalToString(input.senarTax) }
          : {}),
        ...(input.low !== undefined ? { low: input.low } : {}),
        ...(input.sale_discount !== undefined
          ? { sale_discount: decimalToString(input.sale_discount) }
          : {}),
        ...(input.doSt !== undefined ? { doSt: input.doSt } : {}),
        ...(input.sendNF !== undefined ? { sendNF: input.sendNF } : {}),
        ...touchUpdatedAt(now),
      })
      .where(
        and(
          eq(usersFinancialInfo.userId, userId),
          isNull(usersFinancialInfo.deletedAt),
        ),
      )
      .returning();

    if (!row) {
      throw new NotFoundError(
        "Informacoes financeiras do usuario nao encontradas",
        "USER_FINANCIAL_INFO_NOT_FOUND",
      );
    }

    await recordEntityAudit({
      entityType: EntityTypes.USERS_FINANCIAL_INFO,
      entityId: row.id,
      action: "UPDATE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: withEnterpriseAuditContext(audit, enterpriseId),
    });
    return row;
  }
}

export const usersOnboardingService = new UsersOnboardingService();
