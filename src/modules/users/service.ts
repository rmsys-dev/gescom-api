import { and, asc, eq, isNull } from "drizzle-orm";
import {
  db,
  users,
} from "../../db/schema.js";
import { ConflictError, NotFoundError } from "../../shared/errors/app-error.js";
import type { UserGetByIdReadMode } from "../../shared/middleware/user-read-access-middleware.js";
import {
  createUser,
  findActiveCredentialsByUserId,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  findUserByRegistration,
  updateCredentialLogin,
  updateUserById,
  type UserPatchColumns,
} from "../auth/repository.js";
import type {
  CreateUserBody,
  ListUsersQuery,
  PatchUserBody,
} from "./schema.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import {
  normalizeCpfCnpj,
  normalizeEmail,
  normalizePhone,
} from "../../shared/validation/data-normalizers.js";
import { mapUserToApiSummary } from "../../shared/responses/user-public-profile.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  withEnterpriseAuditContext,
  type EntityAuditContext,
} from "../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../shared/audit/entity-types.js";
import {
  activeMembershipForEnterprise,
  hasActiveTenantMembership,
} from "../../shared/db/tenant-predicates.js";
import { countRowsWhere } from "../../shared/db/relational-list.js";
import { findUserByIdScoped } from "./repository.js";
import {
  normalizeUserContactInput,
  normalizeUserEmail,
  normalizeUserPhone,
  normalizeUserRegistration,
  resolveUserContactField,
} from "../../shared/users/normalize-user-contact.js";

type UserScalarRow = {
  userName: string;
  userRegistration: string | null;
  userEmail: string | null;
  userPhone: string | null;
};

function buildUserPatch(
  existing: UserScalarRow,
  next: UserScalarRow,
): UserPatchColumns {
  const patch: UserPatchColumns = {};
  if (next.userName !== existing.userName) {
    patch.userName = next.userName;
  }
  if (next.userRegistration !== existing.userRegistration) {
    patch.userRegistration = next.userRegistration;
  }
  if (next.userEmail !== existing.userEmail) {
    patch.userEmail = next.userEmail;
  }
  if (next.userPhone !== existing.userPhone) {
    patch.userPhone = next.userPhone;
  }
  return patch;
}

export type UserGetByIdAccessMode = "self" | "directory";

type UserPublicProfile = {
  id: string;
  userName: string;
  userPhone: string | null;
  userEmail: string | null;
  accessMode: UserGetByIdAccessMode;
};

function mapFullProfile(
  row: {
    id: string;
    userName: string;
    userPhone: string | null;
    userEmail: string | null;
  },
  accessMode: UserGetByIdAccessMode,
): UserPublicProfile {
  return {
    id: row.id,
    userName: row.userName,
    userPhone: row.userPhone,
    userEmail: row.userEmail,
    accessMode,
  };
}

//**SERVICOS DE USUÁRIOS**
export class UsersService {
  //Cria um usuário
  public async createUser(
    input: CreateUserBody,
    enterpriseId: string,
    audit: EntityAuditContext,
  ) {
    const {
      userRegistration: registrationNormalized,
      userEmail: emailNormalized,
      userPhone: phone,
    } = normalizeUserContactInput(input);

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
        "CPF/CNPJ já cadastrado",
        "REGISTRATION_ALREADY_EXISTS",
      );
    }
    if (byEmail) {
      throw new ConflictError("Email já cadastrado", "EMAIL_ALREADY_EXISTS");
    }
    if (byPhone) {
      throw new ConflictError("Telefone já cadastrado", "PHONE_ALREADY_EXISTS");
    }

    const created = await createUser({
      userName: input.userName.trim(),
      userRegistration: registrationNormalized,
      userEmail: emailNormalized,
      userPhone: phone,
    });

    await recordCreateAudit({
      entityType: EntityTypes.USERS,
      entityId: created.id,
      after: created,
      ctx: withEnterpriseAuditContext(audit, enterpriseId),
    });

    return mapUserToApiSummary(created);
  }

  //Lista todos os usuários ativos; filtros opcionais refinam o conjunto (sem escopo por empresa)
  public async findMany(query: ListUsersQuery) {
    const { limit, offset } = resolveListPagination(query);
    const registration = query.registration
      ? normalizeCpfCnpj(query.registration)
      : undefined;
    const email = query.email ? normalizeEmail(query.email) : undefined;
    const phone = query.phone ? normalizePhone(query.phone) : undefined;

    const filters = [isNull(users.deletedAt)];
    if (registration !== undefined) {
      filters.push(eq(users.userRegistration, registration));
    }
    if (email !== undefined) {
      filters.push(eq(users.userEmail, email));
    }
    if (phone !== undefined) {
      filters.push(eq(users.userPhone, phone));
    }
    const whereClause = and(...filters);

    const [items, total] = await Promise.all([
      db.query.users.findMany({
        where: whereClause,
        orderBy: [asc(users.userName), asc(users.id)],
        limit,
        offset,
      }),
      countRowsWhere(users, whereClause),
    ]);

    return {
      items: items.map((row) => mapFullProfile(row, "directory")),
      total,
      limit,
      offset,
    };
  }

  //Busca um usuário pelo ID: modo de leitura já resolvido pelo middleware `resolveUserReadAccess`
  public async getByIdForRequester(
    id: string,
    readMode: UserGetByIdReadMode,
    enterpriseId: string,
  ): Promise<UserPublicProfile> {
    if (readMode === "self") {
      const row = await db.query.users.findFirst({
        where: and(eq(users.id, id), isNull(users.deletedAt)),
      });
      if (!row) {
        throw new NotFoundError("Usuário não encontrado", "USER_NOT_FOUND");
      }
      return mapFullProfile(row, "self");
    }

    const row = await db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
      with: {
        memberships: {
          where: activeMembershipForEnterprise(enterpriseId),
          with: {
            enterprise: true,
          },
        },
      },
    });

    if (!row || !hasActiveTenantMembership(row.memberships)) {
      throw new NotFoundError("Usuário não encontrado", "USER_NOT_FOUND");
    }

    return mapFullProfile(row, "directory");
  }

  //Altera parcialmente um usuário
  public async patchUser(
    id: string,
    body: PatchUserBody,
    enterpriseId: string,
    audit: EntityAuditContext,
  ) {
    const existing = await findUserByIdScoped(id, enterpriseId);
    if (!existing) {
      throw new NotFoundError("Usuário não encontrado", "USER_NOT_FOUND");
    }

    const nextName =
      body.userName !== undefined ? body.userName.trim() : existing.userName;
    const nextRegistration = resolveUserContactField(
      body.userRegistration,
      existing.userRegistration,
      normalizeUserRegistration,
    );
    const nextEmail = resolveUserContactField(
      body.userEmail,
      existing.userEmail,
      normalizeUserEmail,
    );
    const nextPhone = resolveUserContactField(
      body.userPhone,
      existing.userPhone,
      normalizeUserPhone,
    );

    const [hitReg, hitEmail, hitPhone] = await Promise.all([
      nextRegistration !== existing.userRegistration && nextRegistration
        ? findUserByRegistration(nextRegistration)
        : Promise.resolve(null),
      nextEmail !== existing.userEmail && nextEmail
        ? findUserByEmail(nextEmail)
        : Promise.resolve(null),
      nextPhone !== existing.userPhone && nextPhone
        ? findUserByPhone(nextPhone)
        : Promise.resolve(null),
    ]);

    if (hitReg && hitReg.id !== id) {
      throw new ConflictError(
        "CPF/CNPJ já cadastrado",
        "REGISTRATION_ALREADY_EXISTS",
      );
    }
    if (hitEmail && hitEmail.id !== id) {
      throw new ConflictError("Email já cadastrado", "EMAIL_ALREADY_EXISTS");
    }
    if (hitPhone && hitPhone.id !== id) {
      throw new ConflictError("Telefone já cadastrado", "PHONE_ALREADY_EXISTS");
    }

    const userPatch = buildUserPatch(existing, {
      userName: nextName,
      userRegistration: nextRegistration,
      userEmail: nextEmail,
      userPhone: nextPhone,
    });

    const emailChanged = nextEmail !== existing.userEmail;
    const regChanged = nextRegistration !== existing.userRegistration;
    const needsCredentialSync =
      (emailChanged && nextEmail !== null) || (regChanged && nextRegistration !== null);
    const needsUserUpdate = Object.keys(userPatch).length > 0;

    if (!needsUserUpdate && !needsCredentialSync) {
      return {
        id: existing.id,
        userName: nextName,
        userPhone: nextPhone,
        userEmail: nextEmail,
      };
    }

    let persistedUser: Awaited<ReturnType<typeof updateUserById>> = null;

    await db.transaction(async (tx) => {
      if (needsUserUpdate) {
        persistedUser = await updateUserById(id, userPatch, tx);
        if (!persistedUser) {
          throw new NotFoundError("Usuário não encontrado", "USER_NOT_FOUND");
        }
      }
      if (needsCredentialSync) {
        const creds = await findActiveCredentialsByUserId(id, tx);
        const credentialUpdates: Promise<void>[] = [];
        for (const c of creds) {
          if (c.loginType === "EMAIL" && emailChanged && nextEmail) {
            credentialUpdates.push(
              updateCredentialLogin(
                c.id,
                { login: nextEmail, loginNormalized: nextEmail },
                tx,
              ),
            );
          }
          if (c.loginType === "CPF" && regChanged && nextRegistration) {
            credentialUpdates.push(
              updateCredentialLogin(
                c.id,
                {
                  login: nextRegistration,
                  loginNormalized: nextRegistration,
                },
                tx,
              ),
            );
          }
        }
        await Promise.all(credentialUpdates);
      }
    });

    const row = persistedUser ?? (await findUserById(id));
    if (!row) {
      throw new NotFoundError("Usuário não encontrado", "USER_NOT_FOUND");
    }

    await recordEntityAudit({
      entityType: EntityTypes.USERS,
      entityId: id,
      action: "UPDATE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: { ...audit, enterpriseId: audit.enterpriseId ?? enterpriseId },
    });

    return {
      id: row.id,
      userName: row.userName,
      userPhone: row.userPhone,
      userEmail: row.userEmail,
    };
  }
}

export const usersService = new UsersService();
