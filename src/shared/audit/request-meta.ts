import type { Request } from "express";
import type { AuthContext } from "../../modules/auth/types.js";
import type { RequestWithAuth } from "../middleware/auth-middleware.js";
import type { RequestWithId } from "../middleware/request-id.js";
import type { EntityAuditContext } from "./entity-audit.js";

export type RequestAuditMeta = {
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
};

export const auditMetaFromRequest = (req: Request): RequestAuditMeta => ({
  ipAddress: req.ip ?? null,
  userAgent: req.header("user-agent") ?? null,
  requestId: (req as RequestWithId).requestId ?? null,
});

/** Prefixa a origem da auditoria para rotas HTTP POST. */
export const withPostAuditSource = (source: string): string => `POST ${source}`;

export type PostRouteAuditOverrides = Partial<
  Pick<EntityAuditContext, "enterpriseId" | "reason">
>;

export const auditContextFromAuth = (
  auth: AuthContext,
  meta: RequestAuditMeta,
  source: string,
  overrides?: Partial<Pick<EntityAuditContext, "enterpriseId" | "reason">>,
): EntityAuditContext => ({
  actorUserId: auth.userId,
  actorMemberId: auth.memberId ?? null,
  enterpriseId: overrides?.enterpriseId ?? auth.enterpriseId ?? null,
  requestId: meta.requestId,
  ipAddress: meta.ipAddress,
  userAgent: meta.userAgent,
  source,
  reason: overrides?.reason ?? null,
});

/** Monta contexto a partir do request (auth opcional em rotas maintainer). */
export const auditContextFromRequest = (
  req: Request,
  source: string,
  overrides?: PostRouteAuditOverrides,
): EntityAuditContext => {
  const meta = auditMetaFromRequest(req);
  const auth = (req as RequestWithAuth).auth;
  if (auth) {
    return auditContextFromAuth(auth, meta, source, overrides);
  }
  return {
    actorUserId: null,
    actorMemberId: null,
    enterpriseId: overrides?.enterpriseId ?? null,
    requestId: meta.requestId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    source,
    reason: overrides?.reason ?? null,
  };
};

/** Contexto de auditoria para handlers de rotas POST (com auth). */
export const auditContextFromPostAuth = (
  auth: AuthContext,
  req: Request,
  source: string,
  overrides?: PostRouteAuditOverrides,
): EntityAuditContext =>
  auditContextFromAuth(
    auth,
    auditMetaFromRequest(req),
    withPostAuditSource(source),
    overrides,
  );

/** Contexto de auditoria para handlers de rotas POST (auth opcional). */
export const auditContextFromPostRequest = (
  req: Request,
  source: string,
  overrides?: PostRouteAuditOverrides,
): EntityAuditContext =>
  auditContextFromRequest(req, withPostAuditSource(source), overrides);

/** Prefixa a origem da auditoria para rotas HTTP PATCH. */
export const withPatchAuditSource = (source: string): string => `PATCH ${source}`;

/** Prefixa a origem da auditoria para rotas HTTP DELETE. */
export const withDeleteAuditSource = (source: string): string => `DELETE ${source}`;

/** Contexto de auditoria para handlers de rotas PATCH (com auth). */
export const auditContextFromPatchAuth = (
  auth: AuthContext,
  req: Request,
  source: string,
  overrides?: PostRouteAuditOverrides,
): EntityAuditContext =>
  auditContextFromAuth(
    auth,
    auditMetaFromRequest(req),
    withPatchAuditSource(source),
    overrides,
  );

/** Contexto de auditoria para handlers de rotas DELETE (com auth). */
export const auditContextFromDeleteAuth = (
  auth: AuthContext,
  req: Request,
  source: string,
  overrides?: PostRouteAuditOverrides,
): EntityAuditContext =>
  auditContextFromAuth(
    auth,
    auditMetaFromRequest(req),
    withDeleteAuditSource(source),
    overrides,
  );
