import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import { memberModules, modulePermissions } from "../../db/schema.js";

export type PermissionStatus = "ALLOW" | "DENIED";

export type ResolvedPermissions = Map<string, PermissionStatus>;

const toResolved = (
  rows: Array<{ permission: string }>,
): ResolvedPermissions => {
  const resolved: ResolvedPermissions = new Map();
  for (const row of rows) {
    resolved.set(row.permission, "ALLOW");
  }
  return resolved;
};

export const resolvePermissions = async (
  memberId: string,
): Promise<ResolvedPermissions> => {
  const rows = await db
    .select({ permission: modulePermissions.permission })
    .from(modulePermissions)
    .innerJoin(
      memberModules,
      eq(modulePermissions.memberModuleId, memberModules.id),
    )
    .where(
      and(
        eq(memberModules.memberId, memberId),
        eq(memberModules.status, "ATIVO"),
        isNull(memberModules.deletedAt),
        eq(modulePermissions.status, "ALLOW"),
      ),
    );

  return toResolved(rows);
};

export const resolvePermissionsBatch = async (
  memberIds: string[],
): Promise<Map<string, ResolvedPermissions>> => {
  const uniqueIds = [...new Set(memberIds)];
  const result = new Map<string, ResolvedPermissions>();

  for (const id of uniqueIds) {
    result.set(id, new Map());
  }

  if (uniqueIds.length === 0) {
    return result;
  }

  const rows = await db
    .select({
      memberId: memberModules.memberId,
      permission: modulePermissions.permission,
    })
    .from(modulePermissions)
    .innerJoin(
      memberModules,
      eq(modulePermissions.memberModuleId, memberModules.id),
    )
    .where(
      and(
        inArray(memberModules.memberId, uniqueIds),
        eq(memberModules.status, "ATIVO"),
        isNull(memberModules.deletedAt),
        eq(modulePermissions.status, "ALLOW"),
      ),
    );

  for (const row of rows) {
    result.get(row.memberId)?.set(row.permission, "ALLOW");
  }

  return result;
};

export const isAllowed = (
  resolved: ResolvedPermissions,
  permission: string,
): boolean => resolved.get(permission) === "ALLOW";

export const listAllowed = (resolved: ResolvedPermissions): string[] => {
  const allowed: string[] = [];
  for (const [permission, status] of resolved.entries()) {
    if (status === "ALLOW") {
      allowed.push(permission);
    }
  }
  return allowed;
};
