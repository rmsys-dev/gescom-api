export const auditMetaFromRequest = (req) => ({
    ipAddress: req.ip ?? null,
    userAgent: req.header("user-agent") ?? null,
    requestId: req.requestId ?? null,
});
/** Prefixa a origem da auditoria para rotas HTTP POST. */
export const withPostAuditSource = (source) => `POST ${source}`;
export const auditContextFromAuth = (auth, meta, source, overrides) => ({
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
export const auditContextFromRequest = (req, source, overrides) => {
    const meta = auditMetaFromRequest(req);
    const auth = req.auth;
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
export const auditContextFromPostAuth = (auth, req, source, overrides) => auditContextFromAuth(auth, auditMetaFromRequest(req), withPostAuditSource(source), overrides);
/** Contexto de auditoria para handlers de rotas POST (auth opcional). */
export const auditContextFromPostRequest = (req, source, overrides) => auditContextFromRequest(req, withPostAuditSource(source), overrides);
/** Prefixa a origem da auditoria para rotas HTTP PATCH. */
export const withPatchAuditSource = (source) => `PATCH ${source}`;
/** Prefixa a origem da auditoria para rotas HTTP DELETE. */
export const withDeleteAuditSource = (source) => `DELETE ${source}`;
/** Contexto de auditoria para handlers de rotas PATCH (com auth). */
export const auditContextFromPatchAuth = (auth, req, source, overrides) => auditContextFromAuth(auth, auditMetaFromRequest(req), withPatchAuditSource(source), overrides);
/** Contexto de auditoria para handlers de rotas DELETE (com auth). */
export const auditContextFromDeleteAuth = (auth, req, source, overrides) => auditContextFromAuth(auth, auditMetaFromRequest(req), withDeleteAuditSource(source), overrides);
