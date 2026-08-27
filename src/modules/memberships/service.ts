import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  isNull,
} from "drizzle-orm";
import { db, typeNetworks, typeSupplierCustomers } from "../../db/schema.js";
import {
  ceps,
  cities,
  enterprises,
  enterprisesMembers,
  memberModules,
  modulePermissions,
  modules,
  users,
  usersAddress,
} from "../../db/schema.js";
import { env } from "../../config/env.js";
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/app-error.js";
import { addMinutesFromNow } from "../../shared/time/duration.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import {
  sendFirstAccessCode,
  sendMembershipInviteCode,
} from "../../shared/notifications/email-sender.js";
import { writeAudit } from "../auth/audit.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  recordSoftDeleteAudit,
  withEnterpriseAuditContext,
  type EntityAuditContext,
} from "../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../shared/audit/entity-types.js";
import {
  memberModuleSoftDeleteValues,
  membershipSoftDeleteValues,
  touchUpdatedAt,
} from "../../shared/db/record-lifecycle.js";
import { isPostgresUniqueViolation } from "../../shared/db/postgres-errors.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  findUserByRegistration,
} from "../auth/repository.js";
import { listAllowed, resolvePermissionsBatch } from "../auth/permissions.js";
import {
  createInvitationRow,
  generateNumericInviteCode,
  invalidatePendingInvites,
  userHasAnyActiveCredential,
} from "../auth/invitations-repository.js";
import { hashPassword } from "../auth/password.js";
import type {
  AddMemberModuleInput,
  CreateMembershipInput,
  CreateOnboardMembershipInput,
  ListMembersQuery,
  PatchMemberModuleInput,
  PatchMembershipInput,
} from "./schema.js";
import type { AccessLevel } from "../auth/default-permissions.js";
import {
  isAccessLevel,
  isModuleReference,
} from "../auth/default-permissions.js";
import {
  applyAccessLevelChange,
  assertNotSelfPermissionMutation,
  insertMemberModuleWithPermissions,
} from "./member-module-ops.js";
import type { AuthContext } from "../auth/types.js";
import { mapUserToApiSummary } from "../../shared/responses/user-public-profile.js";
import { normalizeMemberListFilters } from "./repository.js";
import { normalizeUserContactInput } from "../../shared/users/normalize-user-contact.js";

type AuthMeta = {
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
};

type MemberUserSummary = {
  id: string;
  userName: string;
  userRegistration: string | null;
  userEmail: string | null;
  userPhone: string | null;
  addressLine?: string | null;
  cityName?: string | null;
};

type MemberWithUserRow = {
  member: typeof enterprisesMembers.$inferSelect;
  user: MemberUserSummary;
  typeSupplierCustomer?: typeof typeSupplierCustomers.$inferSelect | null;
  typeNetwork?: typeof typeNetworks.$inferSelect | null;
};

const formatAddressLine = (street: string, number: string): string => {
  const parts = [street.trim(), number.trim()].filter(
    (part) => part.length > 0,
  );
  return parts.join(", ");
};

const loadPrincipalAddressSummariesByUserId = async (
  userIds: string[],
): Promise<
  Map<string, { addressLine: string | null; cityName: string | null }>
> => {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      userId: usersAddress.userId,
      street: ceps.address,
      number: usersAddress.number,
      cityName: cities.citieName,
    })
    .from(usersAddress)
    .innerJoin(ceps, eq(usersAddress.cepId, ceps.id))
    .innerJoin(cities, eq(ceps.cityId, cities.id))
    .where(
      and(
        inArray(usersAddress.userId, uniqueUserIds),
        eq(usersAddress.adressType, "PRINCIPAL"),
        isNull(usersAddress.deletedAt),
        isNull(ceps.deletedAt),
        isNull(cities.deletedAt),
      ),
    );

  const byUserId = new Map<
    string,
    { addressLine: string | null; cityName: string | null }
  >();
  for (const row of rows) {
    if (byUserId.has(row.userId)) continue;
    const addressLine = formatAddressLine(row.street, row.number);
    byUserId.set(row.userId, {
      addressLine: addressLine || null,
      cityName: row.cityName?.trim() || null,
    });
  }
  return byUserId;
};

const formatMembershipPercentage = (value: number) =>
  Math.round(value * 100) / 100;

const mapMembershipSalesFieldsToInsert = (
  input: Pick<
    CreateMembershipInput,
    | "saleLimit"
    | "exceedDiscountSale"
    | "receiptLimitDiscount"
    | "comissionOnSight"
    | "comissionToTerms"
    | "comissionPartial"
    | "notifyMaturity"
  >,
): Partial<typeof enterprisesMembers.$inferInsert> => ({
  ...(input.saleLimit !== undefined
    ? { saleLimit: formatMembershipPercentage(input.saleLimit).toFixed(2) }
    : {}),
  ...(input.exceedDiscountSale !== undefined
    ? { exceedDiscountSale: input.exceedDiscountSale }
    : {}),
  ...(input.receiptLimitDiscount !== undefined
    ? {
        receiptLimitDiscount: formatMembershipPercentage(
          input.receiptLimitDiscount,
        ).toFixed(2),
      }
    : {}),
  ...(input.comissionOnSight !== undefined
    ? {
        comissionOnSight: formatMembershipPercentage(
          input.comissionOnSight,
        ).toFixed(2),
      }
    : {}),
  ...(input.comissionToTerms !== undefined
    ? {
        comissionToTerms: formatMembershipPercentage(
          input.comissionToTerms,
        ).toFixed(2),
      }
    : {}),
  ...(input.comissionPartial !== undefined
    ? {
        comissionPartial: formatMembershipPercentage(
          input.comissionPartial,
        ).toFixed(2),
      }
    : {}),
  ...(input.notifyMaturity !== undefined
    ? { notifyMaturity: input.notifyMaturity }
    : {}),
});

const mapMembershipSalesFieldsToPatch = (
  input: PatchMembershipInput,
): Partial<typeof enterprisesMembers.$inferInsert> => ({
  ...mapMembershipSalesFieldsToInsert(input),
  ...(input.observations !== undefined
    ? { observations: input.observations.trim() }
    : {}),
  ...(input.comissionService !== undefined
    ? {
        comissionService: formatMembershipPercentage(
          input.comissionService,
        ).toFixed(2),
      }
    : {}),
  ...(input.typeSupplierCustomerId !== undefined
    ? { typeSupplierCustomerId: input.typeSupplierCustomerId }
    : {}),
  ...(input.typeNetworkId !== undefined
    ? { typeNetworkId: input.typeNetworkId }
    : {}),
});

const mapMemberWithUser = ({
  member,
  user,
  typeSupplierCustomer,
  typeNetwork,
}: MemberWithUserRow) => ({
  id: member.id,
  code: member.code,
  status: member.status,
  postSalesStatus: member.postSalesStatus,
  userId: member.userId,
  enterpriseId: member.enterpriseId,
  class: member.class,
  observations: member.observations,
  saleLimit: member.saleLimit,
  exceedDiscountSale: member.exceedDiscountSale,
  receiptLimitDiscount: member.receiptLimitDiscount,
  comissionOnSight: member.comissionOnSight,
  comissionToTerms: member.comissionToTerms,
  comissionPartial: member.comissionPartial,
  comissionService: member.comissionService,
  notifyMaturity: member.notifyMaturity,
  includedBy: member.includedBy,
  registeredOn: member.registeredOn,
  approvedAt: member.approvedAt,
  approvedBy: member.approvedBy,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt,
  typeSupplierCustomer: typeSupplierCustomer ?? null,
  typeNetwork: typeNetwork ?? null,
  user,
});

export class MembershipsService {
  /** Lista vínculos membro-empresa (não excluídos) com resumo do utilizador. */
  public async list(enterpriseId: string, query: ListMembersQuery) {
    await this.assertEnterpriseExists(enterpriseId);

    const { limit, offset } = resolveListPagination(query);
    const filters = normalizeMemberListFilters(query);

    const memberFilters = [
      eq(enterprisesMembers.enterpriseId, enterpriseId),
      isNull(enterprisesMembers.deletedAt),
      isNull(users.deletedAt),
    ];

    if (filters.userId !== undefined) {
      memberFilters.push(eq(enterprisesMembers.userId, filters.userId));
    }
    if (filters.code !== undefined) {
      memberFilters.push(eq(enterprisesMembers.code, filters.code));
    }
    if (filters.class !== undefined) {
      memberFilters.push(eq(enterprisesMembers.class, filters.class));
    }
    if (filters.status !== undefined) {
      memberFilters.push(eq(enterprisesMembers.status, filters.status));
    }
    if (filters.postSalesStatus !== undefined) {
      memberFilters.push(
        eq(enterprisesMembers.postSalesStatus, filters.postSalesStatus),
      );
    }
    if (filters.name !== undefined) {
      memberFilters.push(ilike(users.userName, `%${filters.name}%`));
    }
    if (filters.registration !== undefined) {
      memberFilters.push(eq(users.userRegistration, filters.registration));
    }
    if (filters.email !== undefined) {
      memberFilters.push(eq(users.userEmail, filters.email));
    }
    if (filters.phone !== undefined) {
      memberFilters.push(eq(users.userPhone, filters.phone));
    }

    const whereClause = and(...memberFilters);

    const [idPage, totalResult] = await Promise.all([
      db
        .select({ id: enterprisesMembers.id })
        .from(enterprisesMembers)
        .innerJoin(users, eq(users.id, enterprisesMembers.userId))
        .where(whereClause)
        .orderBy(asc(users.userName), asc(enterprisesMembers.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(enterprisesMembers)
        .innerJoin(users, eq(users.id, enterprisesMembers.userId))
        .where(whereClause),
    ]);

    const total = Number(totalResult[0]?.c ?? 0);
    if (idPage.length === 0) {
      return { items: [], total, limit, offset };
    }

    const memberIds = idPage.map((row) => row.id);
    const rows = await db.query.enterprisesMembers.findMany({
      where: inArray(enterprisesMembers.id, memberIds),
      with: {
        user: true,
        typeSupplierCustomer: true,
        typeNetwork: true,
      },
    });

    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const userIds = idPage.flatMap((row) => {
      const memberRow = rowsById.get(row.id);
      return memberRow?.user?.id ? [memberRow.user.id] : [];
    });
    const addressByUserId =
      await loadPrincipalAddressSummariesByUserId(userIds);

    const items = memberIds.flatMap((memberId) => {
      const row = rowsById.get(memberId);
      if (!row?.user || row.user.deletedAt != null) {
        return [];
      }

      const address = addressByUserId.get(row.user.id);

      return [
        mapMemberWithUser({
          member: row,
          user: {
            id: row.user.id,
            userName: row.user.userName,
            userRegistration: row.user.userRegistration,
            userEmail: row.user.userEmail,
            userPhone: row.user.userPhone,
            addressLine: address?.addressLine ?? null,
            cityName: address?.cityName ?? null,
          },
          typeSupplierCustomer: row.typeSupplierCustomer ?? null,
          typeNetwork: row.typeNetwork ?? null,
        }),
      ];
    });

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  /** Detalhe do vínculo membro-empresa com utilizador e módulos ativos. */
  public async getById(enterpriseId: string, memberId: string) {
    await this.assertEnterpriseExists(enterpriseId);

    const row = await db.query.enterprisesMembers.findFirst({
      where: and(
        eq(enterprisesMembers.id, memberId),
        eq(enterprisesMembers.enterpriseId, enterpriseId),
        isNull(enterprisesMembers.deletedAt),
      ),
      with: {
        user: true,
        typeSupplierCustomer: true,
        typeNetwork: true,
        modules: {
          where: and(
            eq(memberModules.status, "ATIVO"),
            isNull(memberModules.deletedAt),
          ),
          orderBy: [asc(memberModules.id)],
          with: {
            module: true,
            permissions: true,
          },
        },
      },
    });

    if (!row?.user || row.user.deletedAt != null) {
      throw new NotFoundError("Membro nao encontrado", "MEMBERSHIP_NOT_FOUND");
    }

    const permissionsByMember = await resolvePermissionsBatch([row.id]);

    const modulesPayload = row.modules.map((link) => ({
      id: link.id,
      moduleId: link.moduleId,
      name: link.module?.name ?? null,
      reference: link.module?.reference ?? null,
      accessLevel: link.accessLevel,
      status: link.status,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      permissions: link.permissions.map(({ id, permission, status }) => ({
        id,
        permission,
        status,
      })),
    }));

    return {
      ...mapMemberWithUser({
        member: row,
        user: {
          id: row.user.id,
          userName: row.user.userName,
          userRegistration: row.user.userRegistration,
          userEmail: row.user.userEmail,
          userPhone: row.user.userPhone,
        },
        typeSupplierCustomer: row.typeSupplierCustomer ?? null,
        typeNetwork: row.typeNetwork ?? null,
      }),
      modules: modulesPayload,
      permissions: listAllowed(permissionsByMember.get(row.id) ?? new Map()),
    };
  }

  /** Detalhe do vínculo membro-empresa por código interno. */
  public async getByCode(enterpriseId: string, code: number) {
    await this.assertEnterpriseExists(enterpriseId);

    const match = await db.query.enterprisesMembers.findFirst({
      where: and(
        eq(enterprisesMembers.enterpriseId, enterpriseId),
        eq(enterprisesMembers.code, code),
        isNull(enterprisesMembers.deletedAt),
      ),
      columns: { id: true },
    });

    if (!match) {
      throw new NotFoundError("Membro nao encontrado", "MEMBERSHIP_NOT_FOUND");
    }

    return this.getById(enterpriseId, match.id);
  }

  //Verifica se a empresa existe
  private async assertEnterpriseExists(enterpriseId: string) {
    const entRows = await db
      .select()
      .from(enterprises)
      .where(
        and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)),
      )
      .limit(1);
    const enterprise = entRows[0];
    if (!enterprise) {
      throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    }
    return enterprise;
  }

  //Verifica se os tipos de fornecedor/cliente e de rede informados existem
  private async assertMembershipTypeReferences(input: {
    typeSupplierCustomerId?: string | undefined;
    typeNetworkId?: string | undefined;
  }): Promise<void> {
    if (input.typeSupplierCustomerId !== undefined) {
      const [type] = await db
        .select({ id: typeSupplierCustomers.id })
        .from(typeSupplierCustomers)
        .where(eq(typeSupplierCustomers.id, input.typeSupplierCustomerId))
        .limit(1);

      if (!type) {
        throw new NotFoundError(
          "Tipo de fornecedor/cliente nao encontrado",
          "TYPE_SUPPLIER_CUSTOMER_NOT_FOUND",
        );
      }
    }

    if (input.typeNetworkId !== undefined) {
      const [type] = await db
        .select({ id: typeNetworks.id })
        .from(typeNetworks)
        .where(eq(typeNetworks.id, input.typeNetworkId))
        .limit(1);

      if (!type) {
        throw new NotFoundError(
          "Tipo de rede nao encontrado",
          "TYPE_NETWORK_NOT_FOUND",
        );
      }
    }
  }

  private async assertModulesExistAndActive(
    modulesInput: { moduleId: string; accessLevel: AccessLevel }[],
  ): Promise<void> {
    if (modulesInput.length === 0) {
      return;
    }

    const moduleIds = modulesInput.map((item) => item.moduleId);
    const seen = new Set<string>();
    const duplicated = moduleIds.find((moduleId) => {
      if (seen.has(moduleId)) {
        return true;
      }
      seen.add(moduleId);
      return false;
    });

    if (duplicated) {
      throw new ConflictError(
        `Modulo duplicado: ${duplicated}`,
        "MODULE_DUPLICATED",
      );
    }

    const uniqueIds = [...seen];
    const rows = await db
      .select({ id: modules.id })
      .from(modules)
      .where(
        and(
          inArray(modules.id, uniqueIds),
          eq(modules.status, "ATIVO"),
          isNull(modules.deletedAt),
        ),
      );

    const validIds = new Set(rows.map((row) => row.id));
    const invalidId = uniqueIds.find((moduleId) => !validIds.has(moduleId));

    if (invalidId) {
      throw new NotFoundError(
        `Modulo invalido: ${invalidId}`,
        "MODULE_NOT_FOUND",
      );
    }
  }

  //Verifica se o membro não existe
  private async assertMembershipNotExists(
    enterpriseId: string,
    userId: string,
    memberClass: typeof enterprisesMembers.$inferInsert.class,
  ): Promise<void> {
    const dup = await db
      .select({ id: enterprisesMembers.id })
      .from(enterprisesMembers)
      .where(
        and(
          eq(enterprisesMembers.userId, userId),
          eq(enterprisesMembers.enterpriseId, enterpriseId),
          eq(enterprisesMembers.class, memberClass),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .limit(1);

    if (dup.length > 0) {
      throw new ConflictError(
        "Usuario ja vinculado a esta empresa",
        "MEMBERSHIP_EXISTS",
      );
    }
  }

  //Cria a estrutura de membro (vínculo + módulos com snapshot de permissões no save)
  private async createMembershipStructure(
    input: {
      enterpriseId: string;
      userId: string;
      actorUserId: string;
      code?: number;
      class: typeof enterprisesMembers.$inferInsert.class;
      status: "ATIVO" | "PENDENTE";
      modules: CreateMembershipInput["modules"];
      approvedAt: Date | null;
      approvedBy?: string | null;
      salesFields?: Pick<
        CreateMembershipInput,
        | "saleLimit"
        | "exceedDiscountSale"
        | "receiptLimitDiscount"
        | "comissionOnSight"
        | "comissionToTerms"
        | "comissionPartial"
        | "notifyMaturity"
      >;
    },
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ) {
    const [member] = await tx
      .insert(enterprisesMembers)
      .values({
        code: input.code ?? null,
        userId: input.userId,
        enterpriseId: input.enterpriseId,
        class: input.class,
        includedBy: input.actorUserId,
        approvedAt: input.approvedAt,
        approvedBy: input.approvedBy ?? null,
        status: input.status,
        ...(input.salesFields
          ? mapMembershipSalesFieldsToInsert(input.salesFields)
          : {}),
      })
      .returning();

    if (!member) {
      throw new InternalServerError(
        "Falha ao criar vinculo membro-empresa",
        "INTERNAL_ERROR",
      );
    }

    for (const item of input.modules) {
      await insertMemberModuleWithPermissions(tx, {
        memberId: member.id,
        moduleId: item.moduleId,
        accessLevel: item.accessLevel,
      });
    }

    return member;
  }

  /**
   * Vínculo a utilizador já existente (POST /members).
   * Membro fica PENDENTE; permissões dos módulos já são gravadas no save.
   * E-mails (FIRST_ACCESS / MEMBERSHIP_ACCEPT) só na aprovação — excepto classe CLIENTE.
   */
  public async createMembership(
    enterpriseId: string,
    input: CreateMembershipInput,
    actorUserId: string,
    audit: EntityAuditContext,
  ) {
    await this.assertEnterpriseExists(enterpriseId);
    await this.assertModulesExistAndActive(input.modules);
    await this.assertMembershipTypeReferences(input);

    const targetUser = await findUserById(input.userId);
    if (!targetUser) {
      throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
    }

    await this.assertMembershipNotExists(
      enterpriseId,
      input.userId,
      input.class,
    );

    const auditCtx = withEnterpriseAuditContext(
      {
        ...audit,
        actorUserId: audit.actorUserId ?? actorUserId,
      },
      enterpriseId,
    );

    const member = await db.transaction(async (tx) => {
      const m = await this.createMembershipStructure(
        {
          enterpriseId,
          userId: input.userId,
          actorUserId,
          code: input.code,
          class: input.class,
          status: "PENDENTE",
          modules: input.modules,
          approvedAt: null,
          approvedBy: null,
          salesFields: input,
        },
        tx,
      );

      await recordCreateAudit({
        entityType: EntityTypes.ENTERPRISES_MEMBERS,
        entityId: m.id,
        after: m,
        ctx: auditCtx,
        tx,
      });

      return m;
    });

    return { memberId: member.id, userId: input.userId, member };
  }

  /**
   * Convite FIRST_ACCESS + e-mail após aprovação de cadastro.
   * Membros da classe CLIENTE não passam por este fluxo.
   */
  private async queueFirstAccessInviteAfterApprove(params: {
    userId: string;
    userEmail: string;
    userName: string;
    memberId: string;
    enterpriseId: string;
    actorUserId: string;
    meta: AuthMeta;
  }): Promise<void> {
    const {
      userId,
      userEmail,
      userName,
      memberId,
      enterpriseId,
      actorUserId,
      meta,
    } = params;

    try {
      const plainCode = generateNumericInviteCode();
      const codeHash = await hashPassword(plainCode);
      const expiresAt = addMinutesFromNow(env.INVITATION_CODE_TTL_MINUTES);

      await db.transaction(async (tx) => {
        await invalidatePendingInvites(
          {
            userId,
            purpose: "FIRST_ACCESS",
            memberId,
          },
          tx,
        );

        await createInvitationRow(
          {
            userId,
            purpose: "FIRST_ACCESS",
            memberId,
            codeHash,
            channel: "EMAIL",
            sentTo: userEmail,
            maxAttempts: env.INVITATION_MAX_ATTEMPTS,
            expiresAt,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
          },
          tx,
        );
      });

      await sendFirstAccessCode({
        to: userEmail,
        code: plainCode,
        userName,
      });

      await writeAudit({
        event: "FIRST_ACCESS_REQUESTED",
        userId,
        loginAttempt: userEmail,
        loginType: "EMAIL",
        enterpriseId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        reason: "First access disparado via aprovacao de membro",
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Falha ao criar convite";

      await writeAudit({
        event: "FIRST_ACCESS_FAILED",
        userId,
        loginAttempt: userEmail,
        loginType: "EMAIL",
        enterpriseId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        reason,
      });

      throw new InternalServerError(
        "Nao foi possivel enviar o e-mail de primeiro acesso",
        "EMAIL_DELIVERY_FAILED",
        [{ path: "email", message: reason }],
      );
    }

    await writeAudit({
      event: "INVITE_CREATED",
      userId: actorUserId,
      enterpriseId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      requestId: meta.requestId,
      reason: `Aprovacao ${memberId} com first-access para ${userId}`,
    });
  }

  /**
   * Convite MEMBERSHIP_ACCEPT + e-mail após aprovação (utilizador com credenciais).
   * Membros da classe CLIENTE não passam por este fluxo.
   */
  private async queueMembershipInviteAfterApprove(params: {
    userId: string;
    userEmail: string;
    userName: string;
    memberId: string;
    enterpriseId: string;
    enterpriseTradeName: string;
    actorUserId: string;
    meta: AuthMeta;
  }): Promise<void> {
    const {
      userId,
      userEmail,
      userName,
      memberId,
      enterpriseId,
      enterpriseTradeName,
      actorUserId,
      meta,
    } = params;

    try {
      const plainCode = generateNumericInviteCode();
      const codeHash = await hashPassword(plainCode);
      const expiresAt = addMinutesFromNow(env.INVITATION_CODE_TTL_MINUTES);

      await db.transaction(async (tx) => {
        await invalidatePendingInvites(
          {
            userId,
            purpose: "MEMBERSHIP_ACCEPT",
            memberId,
          },
          tx,
        );

        await createInvitationRow(
          {
            userId,
            purpose: "MEMBERSHIP_ACCEPT",
            memberId,
            codeHash,
            channel: "EMAIL",
            sentTo: userEmail,
            maxAttempts: env.INVITATION_MAX_ATTEMPTS,
            expiresAt,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
          },
          tx,
        );
      });

      await sendMembershipInviteCode({
        to: userEmail,
        code: plainCode,
        userName,
        enterpriseTradeName,
      });

      await writeAudit({
        event: "INVITE_CREATED",
        userId: actorUserId,
        enterpriseId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        reason: `Convite membro ${memberId} disparado via aprovacao`,
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Falha ao criar convite";

      throw new InternalServerError(
        "Nao foi possivel enviar o e-mail de convite",
        "EMAIL_DELIVERY_FAILED",
        [{ path: "email", message: reason }],
      );
    }
  }

  /**
   * create-with-user: cria utilizador + vínculo PENDENTE.
   * Se CPF/e-mail/telefone já existirem no mesmo utilizador, apenas cria o
   * vínculo (equivalente a POST /members) com linkedExistingUser=true.
   * E-mails de primeiro acesso / convite só na aprovação (excepto CLIENTE).
   */
  public async createWithNewUser(
    enterpriseId: string,
    input: CreateOnboardMembershipInput,
    actorUserId: string,
    audit: EntityAuditContext,
  ) {
    await this.assertEnterpriseExists(enterpriseId);
    await this.assertModulesExistAndActive(input.member.modules);
    await this.assertMembershipTypeReferences(input.member);

    const {
      userRegistration: registrationNormalized,
      userEmail: emailNormalized,
      userPhone: phone,
    } = normalizeUserContactInput(input.user);

    const [byReg, byEmail, byPhone] = await Promise.all([
      registrationNormalized
        ? findUserByRegistration(registrationNormalized)
        : Promise.resolve(null),
      emailNormalized
        ? findUserByEmail(emailNormalized)
        : Promise.resolve(null),
      phone ? findUserByPhone(phone) : Promise.resolve(null),
    ]);

    const matchedUsers = [byReg, byEmail, byPhone].filter(
      (row): row is NonNullable<typeof row> => row !== null,
    );
    const uniqueMatchedIds = [...new Set(matchedUsers.map((u) => u.id))];

    if (uniqueMatchedIds.length > 1) {
      throw new ConflictError(
        "CPF/CNPJ, e-mail ou telefone pertencem a usuarios diferentes",
        "USER_CONTACT_CONFLICT",
      );
    }

    const existingUser = matchedUsers[0] ?? null;

    if (existingUser) {
      const linked = await this.createMembership(
        enterpriseId,
        {
          userId: existingUser.id,
          ...input.member,
        },
        actorUserId,
        audit,
      );

      return {
        user: mapUserToApiSummary(existingUser),
        member: linked.member,
        linkedExistingUser: true as const,
      };
    }

    const auditCtx = withEnterpriseAuditContext(
      {
        ...audit,
        actorUserId: audit.actorUserId ?? actorUserId,
      },
      enterpriseId,
    );

    const result = await db.transaction(async (tx) => {
      const createdUser = await createUser(
        {
          userName: input.user.userName.trim(),
          userRegistration: registrationNormalized,
          userEmail: emailNormalized,
          userPhone: phone,
        },
        tx,
      );

      await recordCreateAudit({
        entityType: EntityTypes.USERS,
        entityId: createdUser.id,
        after: createdUser,
        ctx: auditCtx,
        tx,
      });

      await this.assertMembershipNotExists(
        enterpriseId,
        createdUser.id,
        input.member.class,
      );

      const member = await this.createMembershipStructure(
        {
          enterpriseId,
          userId: createdUser.id,
          actorUserId,
          code: input.member.code,
          class: input.member.class,
          status: "PENDENTE",
          modules: input.member.modules,
          approvedAt: null,
          approvedBy: null,
          salesFields: input.member,
        },
        tx,
      );

      await recordCreateAudit({
        entityType: EntityTypes.ENTERPRISES_MEMBERS,
        entityId: member.id,
        after: member,
        ctx: auditCtx,
        tx,
      });

      return {
        user: mapUserToApiSummary(createdUser),
        member,
        linkedExistingUser: false as const,
      };
    });

    return result;
  }

  /**
   * Aprovação de cadastro (qualquer classe): status ATIVO, approvedAt e approvedBy.
   * Se houver departamentos PENDENTE (ex.: create-with-user / POST members), activa-os e faz snapshot de permissões.
   * Após activar, envia FIRST_ACCESS (sem credenciais) ou MEMBERSHIP_ACCEPT (com credenciais),
   * excepto classe CLIENTE.
   */
  public async approveMembership(
    enterpriseId: string,
    memberId: string,
    actorUserId: string,
    meta: AuthMeta,
    audit: EntityAuditContext,
  ) {
    const enterprise = await this.assertEnterpriseExists(enterpriseId);

    const [existingMember] = await db
      .select()
      .from(enterprisesMembers)
      .where(
        and(
          eq(enterprisesMembers.id, memberId),
          eq(enterprisesMembers.enterpriseId, enterpriseId),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .limit(1);

    if (!existingMember) {
      throw new NotFoundError("Membro nao encontrado", "MEMBERSHIP_NOT_FOUND");
    }

    if (existingMember.status === "ATIVO") {
      throw new ConflictError(
        "Membro ja esta ativo",
        "MEMBERSHIP_ALREADY_ACTIVE",
      );
    }

    if (existingMember.status !== "PENDENTE") {
      throw new ConflictError(
        "Apenas membros PENDENTE podem ser aprovados",
        "MEMBERSHIP_INVALID_STATUS",
      );
    }

    const [memberUser] = await db
      .select({
        id: users.id,
        userName: users.userName,
        userEmail: users.userEmail,
      })
      .from(users)
      .where(
        and(eq(users.id, existingMember.userId), isNull(users.deletedAt)),
      )
      .limit(1);

    if (!memberUser) {
      throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
    }

    const isCliente = existingMember.class === "CLIENTE";
    const hasCredentials = await userHasAnyActiveCredential(memberUser.id);

    if (!isCliente && !memberUser.userEmail) {
      throw new ValidationError(
        [
          {
            path: "userEmail",
            message:
              "E-mail do usuario e obrigatorio para envio apos aprovacao",
          },
        ],
        "E-mail do usuario e obrigatorio para envio apos aprovacao",
      );
    }

    const auditCtx = withEnterpriseAuditContext(
      {
        ...audit,
        actorUserId: audit.actorUserId ?? actorUserId,
      },
      enterpriseId,
    );

    const now = new Date();

    const approved = await db.transaction(async (tx) => {
      await invalidatePendingInvites(
        {
          userId: existingMember.userId,
          purpose: "MEMBERSHIP_ACCEPT",
          memberId,
        },
        tx,
      );

      const [memberRow] = await tx
        .update(enterprisesMembers)
        .set({
          status: "ATIVO",
          approvedAt: now,
          approvedBy: actorUserId,
          ...touchUpdatedAt(now),
        })
        .where(
          and(
            eq(enterprisesMembers.id, memberId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            isNull(enterprisesMembers.deletedAt),
          ),
        )
        .returning();

      if (!memberRow) {
        throw new NotFoundError(
          "Membro nao encontrado",
          "MEMBERSHIP_NOT_FOUND",
        );
      }

      await recordEntityAudit({
        entityType: EntityTypes.ENTERPRISES_MEMBERS,
        entityId: memberId,
        action: "UPDATE",
        before: toAuditRecord(existingMember),
        after: toAuditRecord(memberRow),
        ctx: auditCtx,
        tx,
      });

      return memberRow;
    });

    let emailSent: "FIRST_ACCESS" | "MEMBERSHIP_ACCEPT" | null = null;

    if (!isCliente && memberUser.userEmail) {
      if (!hasCredentials) {
        await this.queueFirstAccessInviteAfterApprove({
          userId: memberUser.id,
          userEmail: memberUser.userEmail,
          userName: memberUser.userName,
          memberId,
          enterpriseId,
          actorUserId,
          meta,
        });
        emailSent = "FIRST_ACCESS";
      } else {
        await this.queueMembershipInviteAfterApprove({
          userId: memberUser.id,
          userEmail: memberUser.userEmail,
          userName: memberUser.userName,
          memberId,
          enterpriseId,
          enterpriseTradeName: enterprise.tradeName,
          actorUserId,
          meta,
        });
        emailSent = "MEMBERSHIP_ACCEPT";
      }
    }

    return { member: approved, emailSent };
  }

  //Altera um membro vinculado à empresa; com `softDelete` true, inativa vínculos a módulos
  //e remove as permissões associadas na mesma transação do soft delete do membro-empresa.
  public async patch(
    enterpriseId: string,
    memberId: string,
    input: PatchMembershipInput,
    actorAuth: AuthContext,
    audit: EntityAuditContext,
  ) {
    await this.assertEnterpriseExists(enterpriseId);

    const [existingMember] = await db
      .select()
      .from(enterprisesMembers)
      .where(
        and(
          eq(enterprisesMembers.id, memberId),
          eq(enterprisesMembers.enterpriseId, enterpriseId),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .limit(1);

    if (!existingMember) {
      throw new NotFoundError("Membro nao encontrado", "MEMBERSHIP_NOT_FOUND");
    }

    await this.assertMembershipTypeReferences(input);

    const auditCtx: EntityAuditContext = {
      ...audit,
      actorUserId: audit.actorUserId ?? actorAuth.userId,
      actorMemberId: audit.actorMemberId ?? actorAuth.memberId ?? null,
      enterpriseId: audit.enterpriseId ?? enterpriseId,
    };

    const now = new Date();
    const isDeleteOperation = input.softDelete === true;

    const setValues: Partial<typeof enterprisesMembers.$inferInsert> = {
      updatedAt: now,
    };

    if (input.class !== undefined) setValues.class = input.class;
    if (input.code !== undefined) setValues.code = input.code;
    if (input.postSalesStatus !== undefined) {
      setValues.postSalesStatus = input.postSalesStatus;
    }
    Object.assign(setValues, mapMembershipSalesFieldsToPatch(input));

    if (isDeleteOperation) {
      Object.assign(setValues, membershipSoftDeleteValues(now));
    } else {
      if (input.status !== undefined) {
        setValues.status = input.status;

        if (input.status === "ATIVO") {
          setValues.approvedAt = now;
          setValues.approvedBy = actorAuth.userId;
        } else {
          setValues.approvedAt = null;
          setValues.approvedBy = null;
        }
      }
    }

    if (isDeleteOperation) {
      const row = await db.transaction(async (tx) => {
        const activeModuleLinks = await tx
          .select({ id: memberModules.id })
          .from(memberModules)
          .where(
            and(
              eq(memberModules.memberId, memberId),
              isNull(memberModules.deletedAt),
            ),
          );

        const mmIds = activeModuleLinks.map((r) => r.id);

        if (mmIds.length > 0) {
          await tx
            .delete(modulePermissions)
            .where(inArray(modulePermissions.memberModuleId, mmIds));

          await tx
            .update(memberModules)
            .set(memberModuleSoftDeleteValues(now))
            .where(
              and(
                inArray(memberModules.id, mmIds),
                isNull(memberModules.deletedAt),
              ),
            );
        }

        const [memberRow] = await tx
          .update(enterprisesMembers)
          .set(setValues)
          .where(
            and(
              eq(enterprisesMembers.id, memberId),
              eq(enterprisesMembers.enterpriseId, enterpriseId),
              isNull(enterprisesMembers.deletedAt),
            ),
          )
          .returning();

        if (!memberRow) {
          throw new NotFoundError(
            "Membro nao encontrado",
            "MEMBERSHIP_NOT_FOUND",
          );
        }

        await recordSoftDeleteAudit({
          entityType: EntityTypes.ENTERPRISES_MEMBERS,
          entityId: memberId,
          before: existingMember,
          after: memberRow,
          ctx: auditCtx,
          tx,
        });

        return memberRow;
      });

      return row;
    }

    const [row] = await db
      .update(enterprisesMembers)
      .set(setValues)
      .where(
        and(
          eq(enterprisesMembers.id, memberId),
          eq(enterprisesMembers.enterpriseId, enterpriseId),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .returning();

    if (!row) {
      throw new NotFoundError("Membro nao encontrado", "MEMBERSHIP_NOT_FOUND");
    }

    await recordEntityAudit({
      entityType: EntityTypes.ENTERPRISES_MEMBERS,
      entityId: memberId,
      action: "UPDATE",
      before: toAuditRecord(existingMember),
      after: toAuditRecord(row),
      ctx: auditCtx,
    });

    return row;
  }

  private async assertMemberInEnterprise(
    enterpriseId: string,
    memberId: string,
  ): Promise<void> {
    const [member] = await db
      .select({ id: enterprisesMembers.id, class: enterprisesMembers.class })
      .from(enterprisesMembers)
      .where(
        and(
          eq(enterprisesMembers.id, memberId),
          eq(enterprisesMembers.enterpriseId, enterpriseId),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .limit(1);

    if (!member) {
      throw new NotFoundError("Membro nao encontrado", "MEMBERSHIP_NOT_FOUND");
    }
  }

  private async assertMemberClassAllowsModules(memberId: string): Promise<void> {
    const [member] = await db
      .select({ class: enterprisesMembers.class })
      .from(enterprisesMembers)
      .where(
        and(
          eq(enterprisesMembers.id, memberId),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .limit(1);

    if (member?.class === "CLIENTE") {
      throw new ValidationError(
        [
          {
            path: "modules",
            message: "Membros da classe CLIENTE nao devem ter vinculo com modulos",
          },
        ],
        "Membros da classe CLIENTE nao devem ter vinculo com modulos",
      );
    }
  }

  private async loadMemberModuleOrThrow(
    memberId: string,
    memberModuleId: string,
  ) {
    const [row] = await db
      .select()
      .from(memberModules)
      .where(
        and(
          eq(memberModules.id, memberModuleId),
          eq(memberModules.memberId, memberId),
          isNull(memberModules.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundError(
        "Vinculo membro-modulo nao encontrado",
        "MEMBER_MODULE_NOT_FOUND",
      );
    }

    return row;
  }

  public async addModuleToMember(
    enterpriseId: string,
    memberId: string,
    input: AddMemberModuleInput,
    actorMemberId: string | null,
    audit: EntityAuditContext,
  ) {
    assertNotSelfPermissionMutation(actorMemberId, memberId);
    await this.assertEnterpriseExists(enterpriseId);
    await this.assertMemberInEnterprise(enterpriseId, memberId);
    await this.assertMemberClassAllowsModules(memberId);

    const auditCtx = withEnterpriseAuditContext(audit, enterpriseId);

    try {
      const created = await db.transaction(async (tx) => {
        const link = await insertMemberModuleWithPermissions(tx, {
          memberId,
          moduleId: input.moduleId,
          accessLevel: input.accessLevel,
        });

        await recordCreateAudit({
          entityType: EntityTypes.MEMBER_MODULES,
          entityId: link.id,
          after: link,
          ctx: auditCtx,
          tx,
        });

        return link;
      });

      return created;
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ConflictError(
          "Membro ja vinculado a este modulo",
          "MEMBER_MODULE_EXISTS",
        );
      }
      throw error;
    }
  }

  public async patchMemberModule(
    enterpriseId: string,
    memberId: string,
    memberModuleId: string,
    input: PatchMemberModuleInput,
    actorMemberId: string | null,
    audit: EntityAuditContext,
  ) {
    assertNotSelfPermissionMutation(actorMemberId, memberId);
    await this.assertEnterpriseExists(enterpriseId);
    await this.assertMemberInEnterprise(enterpriseId, memberId);

    const existing = await this.loadMemberModuleOrThrow(memberId, memberModuleId);
    const auditCtx: EntityAuditContext = {
      ...audit,
      enterpriseId: audit.enterpriseId ?? enterpriseId,
    };
    const now = new Date();
    const isDeleteOperation = input.softDelete === true;

    const updated = await db.transaction(async (tx) => {
      if (isDeleteOperation) {
        await tx
          .delete(modulePermissions)
          .where(eq(modulePermissions.memberModuleId, memberModuleId));

        const [row] = await tx
          .update(memberModules)
          .set(memberModuleSoftDeleteValues(now))
          .where(
            and(
              eq(memberModules.id, memberModuleId),
              isNull(memberModules.deletedAt),
            ),
          )
          .returning();

        if (!row) {
          throw new NotFoundError(
            "Vinculo membro-modulo nao encontrado",
            "MEMBER_MODULE_NOT_FOUND",
          );
        }

        await recordSoftDeleteAudit({
          entityType: EntityTypes.MEMBER_MODULES,
          entityId: memberModuleId,
          before: existing,
          after: row,
          ctx: auditCtx,
          tx,
        });

        return row;
      }

      const setValues: Partial<typeof memberModules.$inferInsert> = {
        updatedAt: now,
      };

      if (input.accessLevel !== undefined && input.accessLevel !== existing.accessLevel) {
        if (!isAccessLevel(existing.accessLevel)) {
          throw new ConflictError(
            "Nivel de acesso atual invalido",
            "ACCESS_LEVEL_INVALID",
          );
        }

        const catalog = await tx
          .select({ reference: modules.reference })
          .from(modules)
          .where(eq(modules.id, existing.moduleId))
          .limit(1)
          .then((rows) => rows[0]);

        if (!catalog || !isModuleReference(catalog.reference)) {
          throw new NotFoundError("Modulo invalido", "MODULE_NOT_FOUND");
        }

        await applyAccessLevelChange(tx, {
          memberModuleId,
          reference: catalog.reference,
          from: existing.accessLevel,
          to: input.accessLevel,
        });
        setValues.accessLevel = input.accessLevel;
      }

      if (input.status !== undefined) {
        setValues.status = input.status;
      }

      const [row] = await tx
        .update(memberModules)
        .set(setValues)
        .where(
          and(
            eq(memberModules.id, memberModuleId),
            isNull(memberModules.deletedAt),
          ),
        )
        .returning();

      if (!row) {
        throw new NotFoundError(
          "Vinculo membro-modulo nao encontrado",
          "MEMBER_MODULE_NOT_FOUND",
        );
      }

      await recordEntityAudit({
        entityType: EntityTypes.MEMBER_MODULES,
        entityId: memberModuleId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: auditCtx,
        tx,
      });

      return row;
    });

    return updated;
  }

  public async patchMemberModulePermission(
    enterpriseId: string,
    memberId: string,
    memberModuleId: string,
    permission: string,
    status: "ATIVO" | "INATIVO",
    actorMemberId: string | null,
    audit: EntityAuditContext,
  ) {
    assertNotSelfPermissionMutation(actorMemberId, memberId);
    await this.assertEnterpriseExists(enterpriseId);
    await this.assertMemberInEnterprise(enterpriseId, memberId);
    await this.loadMemberModuleOrThrow(memberId, memberModuleId);

    const [existing] = await db
      .select()
      .from(modulePermissions)
      .where(
        and(
          eq(modulePermissions.memberModuleId, memberModuleId),
          eq(modulePermissions.permission, permission),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError(
        "Permissao do membro nao encontrada",
        "MEMBER_PERMISSION_NOT_FOUND",
      );
    }

    const [updated] = await db
      .update(modulePermissions)
      .set({ status, updatedAt: new Date() })
      .where(eq(modulePermissions.id, existing.id))
      .returning();

    if (!updated) {
      throw new NotFoundError(
        "Permissao do membro nao encontrada",
        "MEMBER_PERMISSION_NOT_FOUND",
      );
    }

    await recordEntityAudit({
      entityType: EntityTypes.MODULE_PERMISSIONS,
      entityId: existing.id,
      action: "UPDATE",
      before: toAuditRecord(existing),
      after: toAuditRecord(updated),
      ctx: {
        ...audit,
        enterpriseId: audit.enterpriseId ?? enterpriseId,
      },
    });

    return updated;
  }

}

export const membershipsService = new MembershipsService();
