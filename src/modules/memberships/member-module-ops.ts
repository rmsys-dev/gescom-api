import { and, eq, inArray } from "drizzle-orm";
import { memberModules, modulePermissions, modules } from "../../db/schema.js";
import type {
  AccessLevel,
  ModuleReference,
} from "../auth/default-permissions.js";
import {
  getPermissionsForAccessLevel,
  isAccessLevel,
  isModuleReference,
  slugsAddedOnLevelChange,
  slugsRemovedOnLevelChange,
} from "../auth/default-permissions.js";
import {
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "../../shared/errors/app-error.js";

type Tx = Parameters<
  Parameters<typeof import("../../db/schema.js").db.transaction>[0]
>[0];

export const assertNotSelfPermissionMutation = (
  actorMemberId: string | null | undefined,
  targetMemberId: string,
): void => {
  if (actorMemberId && actorMemberId === targetMemberId) {
    throw new ForbiddenError(
      "Não é permitido alterar as próprias permissões. Solicite a outro membro autorizado.",
      "SELF_PERMISSION_CHANGE_FORBIDDEN",
    );
  }
};

export const loadActiveModuleOrThrow = async (
  tx: Tx,
  moduleId: string,
): Promise<{ id: string; reference: ModuleReference }> => {
  const [row] = await tx
    .select({
      id: modules.id,
      reference: modules.reference,
      status: modules.status,
      deletedAt: modules.deletedAt,
    })
    .from(modules)
    .where(eq(modules.id, moduleId))
    .limit(1);

  if (!row || row.deletedAt != null || row.status !== "ATIVO") {
    throw new NotFoundError("Modulo invalido", "MODULE_NOT_FOUND");
  }
  if (!isModuleReference(row.reference)) {
    throw new InternalServerError(
      "Referência de módulo não catalogada",
      "MODULE_REFERENCE_INVALID",
    );
  }
  return { id: row.id, reference: row.reference };
};

export const insertMemberModuleWithPermissions = async (
  tx: Tx,
  input: {
    memberId: string;
    moduleId: string;
    accessLevel: AccessLevel;
  },
) => {
  const catalog = await loadActiveModuleOrThrow(tx, input.moduleId);
  const [link] = await tx
    .insert(memberModules)
    .values({
      memberId: input.memberId,
      moduleId: catalog.id,
      accessLevel: input.accessLevel,
      status: "ATIVO",
    })
    .returning();

  if (!link) {
    throw new InternalServerError(
      "Falha ao criar vínculo membro-módulo",
      "INTERNAL_ERROR",
    );
  }

  const perms = getPermissionsForAccessLevel(
    catalog.reference,
    input.accessLevel,
  );
  if (perms.length > 0) {
    await tx.insert(modulePermissions).values(
      perms.map((permission) => ({
        memberModuleId: link.id,
        permission,
        status: "ATIVO" as const,
      })),
    );
  }

  return link;
};

export const applyAccessLevelChange = async (
  tx: Tx,
  input: {
    memberModuleId: string;
    reference: ModuleReference;
    from: AccessLevel;
    to: AccessLevel;
  },
): Promise<void> => {
  if (input.from === input.to) {
    return;
  }
  if (!isAccessLevel(input.from) || !isAccessLevel(input.to)) {
    throw new ConflictError("Nível de acesso inválido", "ACCESS_LEVEL_INVALID");
  }

  const toAdd = slugsAddedOnLevelChange(input.reference, input.from, input.to);
  const toRemove = slugsRemovedOnLevelChange(
    input.reference,
    input.from,
    input.to,
  );

  if (toRemove.length > 0) {
    await tx
      .delete(modulePermissions)
      .where(
        and(
          eq(modulePermissions.memberModuleId, input.memberModuleId),
          inArray(modulePermissions.permission, [...toRemove]),
        ),
      );
  }

  if (toAdd.length > 0) {
    const existing = await tx
      .select({
        id: modulePermissions.id,
        permission: modulePermissions.permission,
        status: modulePermissions.status,
      })
      .from(modulePermissions)
      .where(eq(modulePermissions.memberModuleId, input.memberModuleId));
    const existingBySlug = new Map(
      existing.map((row) => [row.permission, row] as const),
    );
    const fresh: (typeof toAdd)[number][] = [];
    const reactivateIds: string[] = [];

    for (const slug of toAdd) {
      const row = existingBySlug.get(slug);
      if (!row) {
        fresh.push(slug);
        continue;
      }
      if (row.status !== "ATIVO") {
        reactivateIds.push(row.id);
      }
    }

    if (reactivateIds.length > 0) {
      await tx
        .update(modulePermissions)
        .set({ status: "ATIVO", updatedAt: new Date() })
        .where(inArray(modulePermissions.id, reactivateIds));
    }

    if (fresh.length > 0) {
      await tx.insert(modulePermissions).values(
        fresh.map((permission) => ({
          memberModuleId: input.memberModuleId,
          permission,
          status: "ATIVO" as const,
        })),
      );
    }
  }
};
