import { and, asc, count, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "../../db/schema.js";
import {
  ceps,
  cities,
  departments,
  departmentDefaultPermissions,
  enterprises,
  enterprisesMembers,
  memberExtraPermissions,
  memberPermissionsDefault,
  membersDepartments,
  users,
  membersAddress,
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
  memberDepartmentSoftDeleteValues,
  membershipSoftDeleteValues,
  softDeleteValues,
} from "../../shared/db/record-lifecycle.js";
import {
  createUser,
  findUserByEmail,
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
import {
  normalizeCpfCnpj,
  normalizeEmail,
  normalizePhone,
} from "../../shared/validation/data-normalizers.js";
import type {
  AddMemberDepartmentInput,
  CreateMembershipInput,
  CreateOnboardMembershipInput,
  InviteMembershipBody,
  ListMembersQuery,
  PatchMemberDepartmentInput,
  PatchMemberDepartmentPermissionInput,
  PatchMembershipInput,
} from "./schema.js";
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
};

const formatAddressLine = (street: string, number: string): string => {
  const parts = [street.trim(), number.trim()].filter(
    (part) => part.length > 0,
  );
  return parts.join(", ");
};

const loadPrincipalAddressSummariesByMemberId = async (
  memberIds: string[],
): Promise<
  Map<string, { addressLine: string | null; cityName: string | null }>
> => {
  const uniqueMemberIds = [...new Set(memberIds)];
  if (uniqueMemberIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      memberId: membersAddress.memberId,
      street: ceps.address,
      number: membersAddress.number,
      cityName: cities.citieName,
    })
    .from(membersAddress)
    .innerJoin(ceps, eq(membersAddress.cepId, ceps.id))
    .innerJoin(cities, eq(ceps.cityId, cities.id))
    .where(
      and(
        inArray(membersAddress.memberId, uniqueMemberIds),
        eq(membersAddress.adressType, "PRINCIPAL"),
        isNull(membersAddress.deletedAt),
        isNull(ceps.deletedAt),
        isNull(cities.deletedAt),
      ),
    );

  const byMemberId = new Map<
    string,
    { addressLine: string | null; cityName: string | null }
  >();
  for (const row of rows) {
    if (byMemberId.has(row.memberId)) continue;
    const addressLine = formatAddressLine(row.street, row.number);
    byMemberId.set(row.memberId, {
      addressLine: addressLine || null,
      cityName: row.cityName?.trim() || null,
    });
  }
  return byMemberId;
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
});

const mapMembershipSalesFieldsToPatch = (
  input: PatchMembershipInput,
): Partial<typeof enterprisesMembers.$inferInsert> =>
  mapMembershipSalesFieldsToInsert(input);

const mapMemberWithUser = ({ member, user }: MemberWithUserRow) => ({
  id: member.id,
  code: member.code,
  status: member.status,
  userId: member.userId,
  enterpriseId: member.enterpriseId,
  class: member.class,
  saleLimit: member.saleLimit,
  exceedDiscountSale: member.exceedDiscountSale,
  receiptLimitDiscount: member.receiptLimitDiscount,
  comissionOnSight: member.comissionOnSight,
  comissionToTerms: member.comissionToTerms,
  comissionPartial: member.comissionPartial,
  includedBy: member.includedBy,
  registeredOn: member.registeredOn,
  approvedAt: member.approvedAt,
  createdAt: member.createdAt,
  updatedAt: member.updatedAt,
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
    if (filters.registration !== undefined) {
      memberFilters.push(eq(users.userRegistration, filters.registration));
    }
    if (filters.code !== undefined) {
      memberFilters.push(eq(enterprisesMembers.code, filters.code));
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
      with: { user: true },
    });

    const rowsById = new Map(rows.map((row) => [row.id, row]));
    const addressByMemberId =
      await loadPrincipalAddressSummariesByMemberId(memberIds);

    const items = memberIds.flatMap((memberId) => {
      const row = rowsById.get(memberId);
      if (!row?.user || row.user.deletedAt != null) {
        return [];
      }

      const address = addressByMemberId.get(memberId);

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

  /** Detalhe do vínculo membro-empresa com utilizador e departamentos ativos. */
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
        departments: {
          where: and(
            eq(membersDepartments.status, "ATIVO"),
            isNull(membersDepartments.deletedAt),
          ),
          orderBy: [
            desc(membersDepartments.mainDepartment),
            asc(membersDepartments.id),
          ],
          with: {
            department: true,
            permissionsDefault: {
              where: isNull(memberPermissionsDefault.deletedAt),
            },
            extraPermissions: {
              where: isNull(memberExtraPermissions.deletedAt),
            },
          },
        },
      },
    });

    if (!row?.user || row.user.deletedAt != null) {
      throw new NotFoundError("Membro nao encontrado", "MEMBERSHIP_NOT_FOUND");
    }

    const permissionsByMemberDepartment = await resolvePermissionsBatch(
      row.departments.map((department) => department.id),
    );

    const departments = row.departments.map((department) => ({
      id: department.id,
      departmentId: department.departmentId,
      name: department.department?.name ?? null,
      mainDepartment: department.mainDepartment,
      status: department.status,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
      permissionsDefault: department.permissionsDefault.map(
        ({ id, permission, status }) => ({
          id,
          permission,
          status,
        }),
      ),
      extraPermissions: department.extraPermissions.map(
        ({ id, permission, status }) => ({
          id,
          permission,
          status,
        }),
      ),
      permissions: listAllowed(
        permissionsByMemberDepartment.get(department.id) ?? new Map(),
      ),
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
      }),
      departments,
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

  //Verifica se os departamentos existem no catálogo global e estão ativos
  private async assertDepartmentsExistAndActive(
    departmentsInput: { departmentId: string; mainDepartment: boolean }[],
  ): Promise<void> {
    if (departmentsInput.length === 0) {
      return;
    }

    const departmentIds = departmentsInput.map((d) => d.departmentId);
    const seenDepartmentIds = new Set<string>();
    const duplicatedDepartmentId = departmentIds.find((departmentId) => {
      if (seenDepartmentIds.has(departmentId)) {
        return true;
      }

      seenDepartmentIds.add(departmentId);
      return false;
    });

    if (duplicatedDepartmentId) {
      throw new ConflictError(
        `Departamento duplicado: ${duplicatedDepartmentId}`,
        "DEPARTMENT_DUPLICATED",
      );
    }

    const uniqueDepartmentIds = [...seenDepartmentIds];
    const deptRows = await db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          inArray(departments.id, uniqueDepartmentIds),
          eq(departments.status, "ATIVO"),
          isNull(departments.deletedAt),
        ),
      );

    const validDepartmentIds = new Set(deptRows.map((dept) => dept.id));
    const invalidDepartmentId = uniqueDepartmentIds.find(
      (departmentId) => !validDepartmentIds.has(departmentId),
    );

    if (invalidDepartmentId) {
      throw new NotFoundError(
        `Departamento invalido: ${invalidDepartmentId}`,
        "DEPARTMENT_NOT_FOUND",
      );
    }
  }

  //Verifica se o membro não existe
  private async assertMembershipNotExists(
    enterpriseId: string,
    userId: string,
  ): Promise<void> {
    const dup = await db
      .select({ id: enterprisesMembers.id })
      .from(enterprisesMembers)
      .where(
        and(
          eq(enterprisesMembers.userId, userId),
          eq(enterprisesMembers.enterpriseId, enterpriseId),
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

  //Cria a estrutura de membro (vínculo + departamentos; permissões opcionais conforme fluxo)
  private async createMembershipStructure(
    input: {
      enterpriseId: string;
      userId: string;
      actorUserId: string;
      code?: number;
      class: typeof enterprisesMembers.$inferInsert.class;
      status: "ATIVO" | "PENDENTE";
      departments: CreateMembershipInput["departments"];
      approvedAt: Date | null;
      memberDepartmentStatus: "ATIVO" | "PENDENTE";
      skipPermissionSnapshot: boolean;
      salesFields?: Pick<
        CreateMembershipInput,
        | "saleLimit"
        | "exceedDiscountSale"
        | "receiptLimitDiscount"
        | "comissionOnSight"
        | "comissionToTerms"
        | "comissionPartial"
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

    if (input.departments.length > 0) {
      const memberDepartmentsRows = await tx
        .insert(membersDepartments)
        .values(
          input.departments.map((d) => ({
            memberId: member.id,
            departmentId: d.departmentId,
            mainDepartment: d.mainDepartment,
            status: input.memberDepartmentStatus,
          })),
        )
        .returning({
          id: membersDepartments.id,
          departmentId: membersDepartments.departmentId,
        });

      if (memberDepartmentsRows.length !== input.departments.length) {
        throw new InternalServerError(
          "Falha ao criar departamento do membro",
          "INTERNAL_ERROR",
        );
      }

      if (!input.skipPermissionSnapshot) {
        const memberDepartmentIdByDepartmentId = new Map(
          memberDepartmentsRows.map((md) => [md.departmentId, md.id]),
        );

        const departmentIds = input.departments.map((d) => d.departmentId);
        const snapshotPermissions = await tx
          .select({
            departmentId: departmentDefaultPermissions.departmentId,
            permission: departmentDefaultPermissions.permission,
            status: departmentDefaultPermissions.status,
          })
          .from(departmentDefaultPermissions)
          .where(
            and(
              inArray(departmentDefaultPermissions.departmentId, departmentIds),
              isNull(departmentDefaultPermissions.deletedAt),
            ),
          );

        const memberPermissions = snapshotPermissions.map((perm) => {
          const memberDepartmentId = memberDepartmentIdByDepartmentId.get(
            perm.departmentId,
          );

          if (!memberDepartmentId) {
            throw new InternalServerError(
              "Falha ao associar permissoes do departamento",
              "INTERNAL_ERROR",
            );
          }

          return {
            memberDepartmentId,
            permission: perm.permission,
            status: perm.status,
          };
        });

        if (memberPermissions.length > 0) {
          await tx.insert(memberPermissionsDefault).values(memberPermissions);
        }
      }
    }

    return member;
  }

  //Cria um membro com usuário
  public async create(
    enterpriseId: string,
    input: CreateMembershipInput,
    actorUserId: string,
    meta: AuthMeta,
    audit: EntityAuditContext,
  ) {
    await this.assertEnterpriseExists(enterpriseId);

    const targetRows = await db
      .select()
      .from(users)
      .where(and(eq(users.id, input.userId), isNull(users.deletedAt)))
      .limit(1);
    const targetUser = targetRows[0];
    if (!targetUser) {
      throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
    }

    await this.assertMembershipNotExists(enterpriseId, input.userId);
    await this.assertDepartmentsExistAndActive(input.departments);

    const hasCredentials = await userHasAnyActiveCredential(input.userId);
    const isCliente = input.class === "CLIENTE";
    if (hasCredentials && !isCliente) {
      throw new ConflictError(
        "Para convidar utilizador com credenciais utilize POST /enterprises/:enterpriseId/members/invite",
        "USE_MEMBERSHIP_INVITE",
      );
    }

    const now = new Date();
    const auditCtx = withEnterpriseAuditContext(
      {
        ...audit,
        actorUserId: audit.actorUserId ?? actorUserId,
      },
      enterpriseId,
    );

    const memberRow = await db.transaction(async (tx) => {
      const member = await this.createMembershipStructure(
        {
          enterpriseId,
          userId: input.userId,
          actorUserId,
          code: input.code,
          class: input.class,
          status: "ATIVO",
          departments: input.departments,
          approvedAt: now,
          memberDepartmentStatus: "ATIVO",
          skipPermissionSnapshot: false,
          salesFields: input,
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

      return member;
    });

    return memberRow;
  }

  /** Convite de vínculo: membro e departamentos PENDENTE; permissões após aceite. */
  public async inviteMembership(
    enterpriseId: string,
    input: InviteMembershipBody,
    actorUserId: string,
    meta: AuthMeta,
    audit: EntityAuditContext,
  ) {
    const enterprise = await this.assertEnterpriseExists(enterpriseId);

    const emailPart = input.inviteEmail
      ? await findUserByEmail(normalizeEmail(input.inviteEmail))
      : null;
    const phonePart = input.invitePhone
      ? await findUserByPhone(normalizePhone(input.invitePhone))
      : null;

    if (emailPart && phonePart && emailPart.id !== phonePart.id) {
      throw new ConflictError(
        "Email e telefone correspondem a utilizadores diferentes",
        "INVITE_USER_MISMATCH",
      );
    }

    const targetUser = emailPart ?? phonePart;
    if (!targetUser) {
      throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
    }

    await this.assertMembershipNotExists(enterpriseId, targetUser.id);
    await this.assertDepartmentsExistAndActive(input.member.departments);

    const auditCtx = withEnterpriseAuditContext(
      {
        ...audit,
        actorUserId: audit.actorUserId ?? actorUserId,
      },
      enterpriseId,
    );

    let plainCode: string | undefined;
    let codeHash: string | undefined;
    let expiresAt: Date | undefined;
    let channel: "EMAIL" | "SMS" | undefined;
    let sentTo: string | undefined;

    if (input.sendEmail === true) {
      plainCode = generateNumericInviteCode();
      codeHash = await hashPassword(plainCode);
      expiresAt = addMinutesFromNow(env.INVITATION_CODE_TTL_MINUTES);

      const useEmail = Boolean(input.inviteEmail);
      channel = useEmail ? "EMAIL" : "SMS";
      sentTo = useEmail
        ? normalizeEmail(input.inviteEmail!)
        : normalizePhone(input.invitePhone!);
    }

    const member = await db.transaction(async (tx) => {
      const m = await this.createMembershipStructure(
        {
          enterpriseId,
          userId: targetUser.id,
          actorUserId,
          code: input.member.code,
          class: input.member.class,
          status: "PENDENTE",
          departments: input.member.departments,
          approvedAt: null,
          memberDepartmentStatus: "PENDENTE",
          skipPermissionSnapshot: true,
          salesFields: input.member,
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

      if (input.sendEmail === true) {
        await invalidatePendingInvites(
          {
            userId: targetUser.id,
            purpose: "MEMBERSHIP_ACCEPT",
            memberId: m.id,
          },
          tx,
        );

        await createInvitationRow(
          {
            userId: targetUser.id,
            purpose: "MEMBERSHIP_ACCEPT",
            memberId: m.id,
            codeHash: codeHash!,
            channel: channel!,
            sentTo: sentTo!,
            maxAttempts: env.INVITATION_MAX_ATTEMPTS,
            expiresAt: expiresAt!,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
          },
          tx,
        );
      }

      return m;
    });

    if (input.sendEmail === true) {
      if (channel === "EMAIL") {
        await sendMembershipInviteCode({
          to: sentTo!,
          code: plainCode!,
          userName: targetUser.userName,
          enterpriseTradeName: enterprise.tradeName,
        });
      }

      await writeAudit({
        event: "INVITE_CREATED",
        userId: actorUserId,
        enterpriseId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
        reason:
          channel === "EMAIL"
            ? `Convite membro ${member.id}`
            : `Convite membro ${member.id} (canal SMS sem envio automatico)`,
      });
    }

    return { memberId: member.id };
  }

  /**
   * Convite FIRST_ACCESS + e-mail após POST create-with-user.
   * Membros da classe CLIENTE não passam por este fluxo (sem convite nem envio).
   */
  private async queueFirstAccessInviteAfterOnboard(params: {
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
        reason: "First access disparado via create-with-user",
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
      reason: `Create-with-user ${userId} com vinculo ${memberId}`,
    });
  }

  //Cria um membro com usuário e verifica se ele tem acesso à empresa
  public async createWithNewUser(
    enterpriseId: string,
    input: CreateOnboardMembershipInput,
    actorUserId: string,
    meta: AuthMeta,
    audit: EntityAuditContext,
  ) {
    await this.assertEnterpriseExists(enterpriseId);
    await this.assertDepartmentsExistAndActive(input.member.departments);

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

    if (byReg) {
      throw new ConflictError(
        "CPF/CNPJ ja cadastrado",
        "REGISTRATION_ALREADY_EXISTS",
      );
    }
    if (byEmail) {
      throw new ConflictError("Email ja cadastrado", "EMAIL_ALREADY_EXISTS");
    }
    if (byPhone) {
      throw new ConflictError("Telefone ja cadastrado", "PHONE_ALREADY_EXISTS");
    }

    const now = new Date();

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

      await this.assertMembershipNotExists(enterpriseId, createdUser.id);

      const member = await this.createMembershipStructure(
        {
          enterpriseId,
          userId: createdUser.id,
          actorUserId,
          code: input.member.code,
          class: input.member.class,
          status: "ATIVO",
          departments: input.member.departments,
          approvedAt: now,
          memberDepartmentStatus: "ATIVO",
          skipPermissionSnapshot: false,
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
      };
    });

    if (input.member.class !== "CLIENTE" && input.sendEmail === true) {
      if (!result.user.userEmail) {
        throw new ValidationError(
          [
            {
              path: "user.userEmail",
              message:
                "E-mail do usuario e obrigatorio para envio de convite de primeiro acesso",
            },
          ],
          "E-mail do usuario e obrigatorio para envio de convite de primeiro acesso",
        );
      }
      await this.queueFirstAccessInviteAfterOnboard({
        userId: result.user.id,
        userEmail: result.user.userEmail,
        userName: result.user.userName,
        memberId: result.member.id,
        enterpriseId,
        actorUserId,
        meta,
      });
    }

    return result;
  }

  //Altera um membro vinculado à empresa; com `softDelete` true, inativa vínculos a departamentos
  //e permissões associadas na mesma transação do soft delete do membro-empresa.
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
    Object.assign(setValues, mapMembershipSalesFieldsToPatch(input));

    if (isDeleteOperation) {
      Object.assign(setValues, membershipSoftDeleteValues(now));
    } else {
      if (input.status !== undefined) {
        setValues.status = input.status;

        if (input.status === "ATIVO") {
          setValues.approvedAt = now;
        } else {
          setValues.approvedAt = null;
        }
      }
    }

    if (isDeleteOperation) {
      const row = await db.transaction(async (tx) => {
        const activeDeptLinks = await tx
          .select({ id: membersDepartments.id })
          .from(membersDepartments)
          .where(
            and(
              eq(membersDepartments.memberId, memberId),
              isNull(membersDepartments.deletedAt),
            ),
          );

        const mdIds = activeDeptLinks.map((r) => r.id);

        if (mdIds.length > 0) {
          await tx
            .update(memberExtraPermissions)
            .set(softDeleteValues(now))
            .where(
              and(
                inArray(memberExtraPermissions.memberDepartmentId, mdIds),
                isNull(memberExtraPermissions.deletedAt),
              ),
            );

          await tx
            .update(memberPermissionsDefault)
            .set(softDeleteValues(now))
            .where(
              and(
                inArray(memberPermissionsDefault.memberDepartmentId, mdIds),
                isNull(memberPermissionsDefault.deletedAt),
              ),
            );

          await tx
            .update(membersDepartments)
            .set(memberDepartmentSoftDeleteValues(now))
            .where(
              and(
                inArray(membersDepartments.id, mdIds),
                isNull(membersDepartments.deletedAt),
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

  private async assertMemberDepartmentInEnterprise(
    enterpriseId: string,
    memberId: string,
    departmentId: string,
  ): Promise<{ memberDepartmentId: string }> {
    const [row] = await db
      .select({
        mdId: membersDepartments.id,
        emId: enterprisesMembers.id,
        deptId: departments.id,
      })
      .from(enterprises)
      .leftJoin(
        enterprisesMembers,
        and(
          eq(enterprisesMembers.enterpriseId, enterprises.id),
          eq(enterprisesMembers.id, memberId),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .leftJoin(
        membersDepartments,
        and(
          eq(membersDepartments.memberId, enterprisesMembers.id),
          eq(membersDepartments.departmentId, departmentId),
          isNull(membersDepartments.deletedAt),
        ),
      )
      .leftJoin(
        departments,
        and(
          eq(departments.id, departmentId),
          eq(departments.status, "ATIVO"),
          isNull(departments.deletedAt),
        ),
      )
      .where(
        and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    }
    if (!row.emId) {
      throw new NotFoundError("Membro nao encontrado", "MEMBERSHIP_NOT_FOUND");
    }
    if (!row.mdId || !row.deptId) {
      throw new NotFoundError(
        "Vinculo membro-departamento nao encontrado",
        "MEMBER_DEPARTMENT_NOT_FOUND",
      );
    }

    return { memberDepartmentId: row.mdId };
  }

  private async patchMemberDepartmentPermissionByVariant(
    variant: "default" | "extra",
    enterpriseId: string,
    memberId: string,
    departmentId: string,
    input: PatchMemberDepartmentPermissionInput,
    audit: EntityAuditContext,
  ) {
    const { memberDepartmentId } =
      await this.assertMemberDepartmentInEnterprise(
        enterpriseId,
        memberId,
        departmentId,
      );

    const isSoftDelete = input.softDelete === true;
    const now = new Date();
    const auditCtx: EntityAuditContext = {
      ...audit,
      enterpriseId: audit.enterpriseId ?? enterpriseId,
    };

    if (variant === "default") {
      const [existing] = await db
        .select()
        .from(memberPermissionsDefault)
        .where(
          and(
            eq(memberPermissionsDefault.memberDepartmentId, memberDepartmentId),
            eq(memberPermissionsDefault.permission, input.permission),
            isNull(memberPermissionsDefault.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundError(
          "Permissao padrao do membro nao encontrada",
          "MEMBER_PERMISSION_NOT_FOUND",
        );
      }

      const [updated] = await db
        .update(memberPermissionsDefault)
        .set(
          isSoftDelete
            ? softDeleteValues(now)
            : {
                status: input.status as NonNullable<typeof input.status>,
                updatedAt: now,
              },
        )
        .where(
          and(
            eq(memberPermissionsDefault.id, existing.id),
            isNull(memberPermissionsDefault.deletedAt),
          ),
        )
        .returning();

      if (!updated) {
        throw new NotFoundError(
          "Permissao padrao do membro nao encontrada",
          "MEMBER_PERMISSION_NOT_FOUND",
        );
      }

      if (isSoftDelete) {
        await recordSoftDeleteAudit({
          entityType: EntityTypes.MEMBER_PERMISSIONS_DEFAULT,
          entityId: existing.id,
          before: existing,
          after: updated,
          ctx: auditCtx,
        });
      } else {
        await recordEntityAudit({
          entityType: EntityTypes.MEMBER_PERMISSIONS_DEFAULT,
          entityId: existing.id,
          action: "UPDATE",
          before: toAuditRecord(existing),
          after: toAuditRecord(updated),
          ctx: auditCtx,
        });
      }

      return updated;
    }

    const [existing] = await db
      .select()
      .from(memberExtraPermissions)
      .where(
        and(
          eq(memberExtraPermissions.memberDepartmentId, memberDepartmentId),
          eq(memberExtraPermissions.permission, input.permission),
          isNull(memberExtraPermissions.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundError(
        "Permissao extra do membro nao encontrada",
        "MEMBER_EXTRA_PERMISSION_NOT_FOUND",
      );
    }

    const [updated] = await db
      .update(memberExtraPermissions)
      .set(
        isSoftDelete
          ? softDeleteValues(now)
          : {
              status: input.status as NonNullable<typeof input.status>,
              updatedAt: now,
            },
      )
      .where(
        and(
          eq(memberExtraPermissions.id, existing.id),
          isNull(memberExtraPermissions.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw new NotFoundError(
        "Permissao extra do membro nao encontrada",
        "MEMBER_EXTRA_PERMISSION_NOT_FOUND",
      );
    }

    if (isSoftDelete) {
      await recordSoftDeleteAudit({
        entityType: EntityTypes.MEMBER_EXTRA_PERMISSIONS,
        entityId: existing.id,
        before: existing,
        after: updated,
        ctx: auditCtx,
      });
    } else {
      await recordEntityAudit({
        entityType: EntityTypes.MEMBER_EXTRA_PERMISSIONS,
        entityId: existing.id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(updated),
        ctx: auditCtx,
      });
    }

    return updated;
  }

  public async patchMemberDepartmentPermissionDefault(
    enterpriseId: string,
    memberId: string,
    departmentId: string,
    input: PatchMemberDepartmentPermissionInput,
    audit: EntityAuditContext,
  ) {
    return this.patchMemberDepartmentPermissionByVariant(
      "default",
      enterpriseId,
      memberId,
      departmentId,
      input,
      audit,
    );
  }

  public async patchMemberDepartmentPermissionExtra(
    enterpriseId: string,
    memberId: string,
    departmentId: string,
    input: PatchMemberDepartmentPermissionInput,
    audit: EntityAuditContext,
  ) {
    return this.patchMemberDepartmentPermissionByVariant(
      "extra",
      enterpriseId,
      memberId,
      departmentId,
      input,
      audit,
    );
  }

  //Verifica se o membro existe e pertence à empresa (ativo)
  private async assertMemberInEnterprise(
    enterpriseId: string,
    memberId: string,
  ): Promise<void> {
    const [member] = await db
      .select({ id: enterprisesMembers.id })
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

  //Verifica se o departamento existe no catálogo global e está ativo
  private async assertDepartmentExistsAndActive(
    departmentId: string,
  ): Promise<void> {
    const [dept] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          eq(departments.id, departmentId),
          eq(departments.status, "ATIVO"),
          isNull(departments.deletedAt),
        ),
      )
      .limit(1);

    if (!dept) {
      throw new NotFoundError(
        `Departamento invalido: ${departmentId}`,
        "DEPARTMENT_NOT_FOUND",
      );
    }
  }

  //Vincula um membro existente a um novo departamento.
  //O snapshot de permissões é gravado em `member_extra_permissions` (diferente do fluxo inicial em
  //`createMembershipStructure`, que usa `member_permissions_default`).
  public async addDepartmentToMember(
    enterpriseId: string,
    memberId: string,
    input: AddMemberDepartmentInput,
    audit: EntityAuditContext,
  ) {
    await this.assertEnterpriseExists(enterpriseId);
    await this.assertMemberInEnterprise(enterpriseId, memberId);
    await this.assertDepartmentExistsAndActive(input.departmentId);

    const [duplicated] = await db
      .select({ id: membersDepartments.id })
      .from(membersDepartments)
      .where(
        and(
          eq(membersDepartments.memberId, memberId),
          eq(membersDepartments.departmentId, input.departmentId),
          isNull(membersDepartments.deletedAt) &&
            eq(membersDepartments.status, "ATIVO"),
        ),
      )
      .limit(1);

    if (duplicated) {
      throw new ConflictError(
        "Membro ja vinculado a este departamento",
        "MEMBER_DEPARTMENT_EXISTS",
      );
    }

    const now = new Date();

    const created = await db.transaction(async (tx) => {
      if (input.mainDepartment) {
        await tx
          .update(membersDepartments)
          .set({ mainDepartment: false, updatedAt: now })
          .where(
            and(
              eq(membersDepartments.memberId, memberId),
              eq(membersDepartments.mainDepartment, true),
              isNull(membersDepartments.deletedAt) &&
                eq(membersDepartments.status, "ATIVO"),
            ),
          );
      }

      const [memberDepartment] = await tx
        .insert(membersDepartments)
        .values({
          memberId,
          departmentId: input.departmentId,
          mainDepartment: input.mainDepartment,
        })
        .returning();

      if (!memberDepartment) {
        throw new InternalServerError(
          "Falha ao criar vinculo membro-departamento",
          "INTERNAL_ERROR",
        );
      }

      const snapshotPermissions = await tx
        .select({
          permission: departmentDefaultPermissions.permission,
          status: departmentDefaultPermissions.status,
        })
        .from(departmentDefaultPermissions)
        .where(
          and(
            eq(departmentDefaultPermissions.departmentId, input.departmentId),
            isNull(departmentDefaultPermissions.deletedAt),
          ),
        );

      if (snapshotPermissions.length > 0) {
        await tx.insert(memberExtraPermissions).values(
          snapshotPermissions.map((perm) => ({
            memberDepartmentId: memberDepartment.id,
            permission: perm.permission,
            status: perm.status,
          })),
        );
      }

      await recordCreateAudit({
        entityType: EntityTypes.MEMBERS_DEPARTMENTS,
        entityId: memberDepartment.id,
        after: memberDepartment,
        ctx: withEnterpriseAuditContext(audit, enterpriseId),
        tx,
      });

      return memberDepartment;
    });

    return created;
  }

  //Altera um vínculo membro-departamento (ou realiza soft delete quando `softDelete` é true).
  //Ao trocar o departamento, o snapshot de permissões em `member_extra_permissions` é regerado
  //com base em `department_default_permissions` do novo departamento; as `member_permissions_default`
  //do vínculo original permanecem intactas para fins de auditoria.
  public async patchMemberDepartment(
    enterpriseId: string,
    memberId: string,
    memberDepartmentId: string,
    input: PatchMemberDepartmentInput,
    audit: EntityAuditContext,
  ) {
    await this.assertEnterpriseExists(enterpriseId);
    await this.assertMemberInEnterprise(enterpriseId, memberId);

    const auditCtx: EntityAuditContext = {
      ...audit,
      enterpriseId: audit.enterpriseId ?? enterpriseId,
    };

    const [memberDepartment] = await db
      .select()
      .from(membersDepartments)
      .where(
        and(
          eq(membersDepartments.id, memberDepartmentId),
          eq(membersDepartments.memberId, memberId),
          isNull(membersDepartments.deletedAt),
        ),
      )
      .limit(1);

    if (!memberDepartment) {
      throw new NotFoundError(
        "Vinculo membro-departamento nao encontrado",
        "MEMBER_DEPARTMENT_NOT_FOUND",
      );
    }

    const isDeleteOperation = input.softDelete === true;
    const now = new Date();

    if (
      !isDeleteOperation &&
      input.departmentId !== undefined &&
      input.departmentId !== memberDepartment.departmentId
    ) {
      await this.assertDepartmentExistsAndActive(input.departmentId);

      const [duplicated] = await db
        .select({ id: membersDepartments.id })
        .from(membersDepartments)
        .where(
          and(
            eq(membersDepartments.memberId, memberId),
            eq(membersDepartments.departmentId, input.departmentId),
            ne(membersDepartments.id, memberDepartmentId),
            isNull(membersDepartments.deletedAt),
          ),
        )
        .limit(1);

      if (duplicated) {
        throw new ConflictError(
          "Membro ja vinculado a este departamento",
          "MEMBER_DEPARTMENT_EXISTS",
        );
      }
    }

    const updated = await db.transaction(async (tx) => {
      if (isDeleteOperation) {
        await tx
          .update(memberExtraPermissions)
          .set(softDeleteValues(now))
          .where(
            and(
              eq(memberExtraPermissions.memberDepartmentId, memberDepartmentId),
              isNull(memberExtraPermissions.deletedAt),
            ),
          );

        await tx
          .update(memberPermissionsDefault)
          .set(softDeleteValues(now))
          .where(
            and(
              eq(
                memberPermissionsDefault.memberDepartmentId,
                memberDepartmentId,
              ),
              isNull(memberPermissionsDefault.deletedAt),
            ),
          );

        const [row] = await tx
          .update(membersDepartments)
          .set(memberDepartmentSoftDeleteValues(now))
          .where(
            and(
              eq(membersDepartments.id, memberDepartmentId),
              isNull(membersDepartments.deletedAt),
            ),
          )
          .returning();

        if (!row) {
          throw new NotFoundError(
            "Vinculo membro-departamento nao encontrado",
            "MEMBER_DEPARTMENT_NOT_FOUND",
          );
        }

        await recordSoftDeleteAudit({
          entityType: EntityTypes.MEMBERS_DEPARTMENTS,
          entityId: memberDepartmentId,
          before: memberDepartment,
          after: row,
          ctx: auditCtx,
          tx,
        });

        return row;
      }

      const setValues: Partial<typeof membersDepartments.$inferInsert> = {
        updatedAt: now,
      };

      if (
        input.departmentId !== undefined &&
        input.departmentId !== memberDepartment.departmentId
      ) {
        setValues.departmentId = input.departmentId;

        await tx
          .update(memberExtraPermissions)
          .set(softDeleteValues(now))
          .where(
            and(
              eq(memberExtraPermissions.memberDepartmentId, memberDepartmentId),
              isNull(memberExtraPermissions.deletedAt),
            ),
          );

        const snapshotPermissions = await tx
          .select({
            permission: departmentDefaultPermissions.permission,
            status: departmentDefaultPermissions.status,
          })
          .from(departmentDefaultPermissions)
          .where(
            and(
              eq(departmentDefaultPermissions.departmentId, input.departmentId),
              isNull(departmentDefaultPermissions.deletedAt),
            ),
          );

        if (snapshotPermissions.length > 0) {
          await tx.insert(memberExtraPermissions).values(
            snapshotPermissions.map((perm) => ({
              memberDepartmentId,
              permission: perm.permission,
              status: perm.status,
            })),
          );
        }
      }

      if (input.mainDepartment === true) {
        await tx
          .update(membersDepartments)
          .set({ mainDepartment: false, updatedAt: now })
          .where(
            and(
              eq(membersDepartments.memberId, memberId),
              ne(membersDepartments.id, memberDepartmentId),
              eq(membersDepartments.mainDepartment, true),
              isNull(membersDepartments.deletedAt),
            ),
          );
        setValues.mainDepartment = true;
      } else if (input.mainDepartment === false) {
        setValues.mainDepartment = false;
      }

      if (input.status !== undefined) {
        setValues.status = input.status;
      }

      const [row] = await tx
        .update(membersDepartments)
        .set(setValues)
        .where(
          and(
            eq(membersDepartments.id, memberDepartmentId),
            isNull(membersDepartments.deletedAt),
          ),
        )
        .returning();

      if (!row) {
        throw new NotFoundError(
          "Vinculo membro-departamento nao encontrado",
          "MEMBER_DEPARTMENT_NOT_FOUND",
        );
      }

      await recordEntityAudit({
        entityType: EntityTypes.MEMBERS_DEPARTMENTS,
        entityId: memberDepartmentId,
        action: "UPDATE",
        before: toAuditRecord(memberDepartment),
        after: toAuditRecord(row),
        ctx: auditCtx,
        tx,
      });

      return row;
    });

    return updated;
  }
}

export const membershipsService = new MembershipsService();
