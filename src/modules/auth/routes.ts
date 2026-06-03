import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { authRateLimit } from "../../shared/middleware/auth-rate-limit.js";
import { firstAccessRateLimit } from "../../shared/middleware/first-access-rate-limit.js";
import { passwordResetRateLimit } from "../../shared/middleware/password-reset-rate-limit.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../shared/validation/common-schemas.js";
import { AuthController } from "./controller.js";
import { FirstAccessController } from "./first-access.controller.js";
import { MembershipInvitationsController } from "./invitations.controller.js";
import { PasswordResetController } from "./password-reset.controller.js";
import {
  firstAccessLookupSchema,
  firstAccessResendSchema,
  firstAccessVerifySchema,
  invitationAcceptPublicSchema,
  invitationDeclineSchema,
  loginSchema,
  memberIdParamsSchema,
  passwordResetRequestSchema,
  passwordResetResendSchema,
  passwordResetVerifySchema,
  refreshSchema,
  switchEnterpriseSchema,
} from "./schema.js";
import { authService } from "./service.js";

const authRouter = Router();
const authController = new AuthController(authService);
const firstAccessController = new FirstAccessController();
const membershipInvitationsController = new MembershipInvitationsController();
const passwordResetController = new PasswordResetController();

authRouter.post(
  "/login",
  authRateLimit,
  validateSchema({ body: loginSchema }),
  authController.login,
);

authRouter.post(
  "/refresh",
  authRateLimit,
  validateSchema({ body: refreshSchema }),
  authController.refresh,
);

authRouter.post(
  "/logout",
  authMiddleware,
  validateSchema({ body: emptyBodySchema, query: emptyQuerySchema }),
  authController.logout,
);

authRouter.post(
  "/switch-enterprise",
  authMiddleware,
  validateSchema({ body: switchEnterpriseSchema }),
  authController.switchEnterprise,
);

authRouter.get(
  "/me",
  authMiddleware,
  validateSchema({ query: emptyQuerySchema }),
  authController.me,
);

authRouter.post(
  "/first-access/lookup",
  firstAccessRateLimit,
  validateSchema({ body: firstAccessLookupSchema }),
  firstAccessController.lookup,
);

authRouter.post(
  "/first-access/verify",
  firstAccessRateLimit,
  validateSchema({ body: firstAccessVerifySchema }),
  firstAccessController.verify,
);

authRouter.post(
  "/first-access/resend",
  firstAccessRateLimit,
  validateSchema({ body: firstAccessResendSchema }),
  firstAccessController.resend,
);

authRouter.post(
  "/password-reset/request",
  passwordResetRateLimit,
  validateSchema({ body: passwordResetRequestSchema }),
  passwordResetController.request,
);

authRouter.post(
  "/password-reset/verify",
  passwordResetRateLimit,
  validateSchema({ body: passwordResetVerifySchema }),
  passwordResetController.verify,
);

authRouter.post(
  "/password-reset/resend",
  passwordResetRateLimit,
  validateSchema({ body: passwordResetResendSchema }),
  passwordResetController.resend,
);

authRouter.post(
  "/invitations/:memberId/accept",
  authRateLimit,
  validateSchema({
    params: memberIdParamsSchema,
    body: invitationAcceptPublicSchema,
  }),
  membershipInvitationsController.accept,
);

authRouter.post(
  "/invitations/:memberId/decline",
  authMiddleware,
  tenantMiddleware,
  validateSchema({
    params: memberIdParamsSchema,
    body: invitationDeclineSchema,
  }),
  membershipInvitationsController.decline,
);

authRouter.post(
  "/invitations/:memberId/resend",
  authMiddleware,
  tenantMiddleware,
  validateSchema({
    params: memberIdParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  membershipInvitationsController.resend,
);

export { authRouter };
