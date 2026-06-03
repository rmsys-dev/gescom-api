import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import {
  memberExtraPermissions,
  memberPermissionsDefault,
} from "../../db/schema.js";

export type PermissionStatus = "ALLOW" | "DENIED";

export type ResolvedPermissions = Map<string, PermissionStatus>;

export const resolvePermissions = async (
  memberDepartmentId: string,
): Promise<ResolvedPermissions> => {
  const [defaults, extras] = await Promise.all([
    db
      .select({
        permission: memberPermissionsDefault.permission,
        status: memberPermissionsDefault.status,
      })
      .from(memberPermissionsDefault)
      .where(
        and(
          eq(memberPermissionsDefault.memberDepartmentId, memberDepartmentId),
          isNull(memberPermissionsDefault.deletedAt),
        ),
      ),
    db
      .select({
        permission: memberExtraPermissions.permission,
        status: memberExtraPermissions.status,
      })
      .from(memberExtraPermissions)
      .where(
        and(
          eq(memberExtraPermissions.memberDepartmentId, memberDepartmentId),
          isNull(memberExtraPermissions.deletedAt),
        ),
      ),
  ]);

  const resolved: ResolvedPermissions = new Map();

  for (const row of defaults) {
    resolved.set(row.permission, row.status);
  }

  // extras sobrescrevem defaults
  for (const row of extras) {
    resolved.set(row.permission, row.status);
  }

  return resolved;
};

export const resolvePermissionsBatch = async (
  memberDepartmentIds: string[],
): Promise<Map<string, ResolvedPermissions>> => {
  const uniqueIds = [...new Set(memberDepartmentIds)];
  const result = new Map<string, ResolvedPermissions>();

  for (const id of uniqueIds) {
    result.set(id, new Map());
  }

  if (uniqueIds.length === 0) {
    return result;
  }

  const [defaults, extras] = await Promise.all([
    db
      .select({
        memberDepartmentId: memberPermissionsDefault.memberDepartmentId,
        permission: memberPermissionsDefault.permission,
        status: memberPermissionsDefault.status,
      })
      .from(memberPermissionsDefault)
      .where(
        and(
          inArray(memberPermissionsDefault.memberDepartmentId, uniqueIds),
          isNull(memberPermissionsDefault.deletedAt),
        ),
      ),
    db
      .select({
        memberDepartmentId: memberExtraPermissions.memberDepartmentId,
        permission: memberExtraPermissions.permission,
        status: memberExtraPermissions.status,
      })
      .from(memberExtraPermissions)
      .where(
        and(
          inArray(memberExtraPermissions.memberDepartmentId, uniqueIds),
          isNull(memberExtraPermissions.deletedAt),
        ),
      ),
  ]);

  for (const row of defaults) {
    result.get(row.memberDepartmentId)?.set(row.permission, row.status);
  }

  for (const row of extras) {
    result.get(row.memberDepartmentId)?.set(row.permission, row.status);
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
