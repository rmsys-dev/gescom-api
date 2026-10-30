import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requireSelfOrPermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { resolveUserReadAccess } from "../../../shared/middleware/user-read-access-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { usersOnboardingController } from "./controller.js";
import {
  personalInfoCreateSchema,
  personalInfoPatchSchema,
  usersAddressCreateSchema,
  usersAddressParamsSchema,
  usersAddressPatchSchema,
  usersContactCreateSchema,
  usersContactParamsSchema,
  usersContactPatchSchema,
  usersFinancialInfoCreateSchema,
  usersFinancialInfoPatchSchema,
  usersRelationshipsCreateSchema,
  usersRelationshipsPatchSchema,
  usersTaxInfosCreateSchema,
  usersTaxInfosPatchSchema,
  userDetailsParamsSchema,
} from "./schema.js";

const usersOnboardingRouter = Router({ mergeParams: true });

// Detalhe agregado (GET)
usersOnboardingRouter.get(
  "/details",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("consultar_usuarios"),
  resolveUserReadAccess,
  validateSchema({
    params: userDetailsParamsSchema,
    query: emptyQuerySchema,
  }),
  usersOnboardingController.getUsersWithDetails,
);

// Personal info (POST/PATCH)
usersOnboardingRouter.post(
  "/personal-info",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: userDetailsParamsSchema,
    body: personalInfoCreateSchema,
  }),
  usersOnboardingController.createPersonalInfo,
);

usersOnboardingRouter.patch(
  "/personal-info",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: userDetailsParamsSchema,
    body: personalInfoPatchSchema,
  }),
  usersOnboardingController.patchPersonalInfo,
);

// Addresses (POST/PATCH)
usersOnboardingRouter.post(
  "/addresses",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: userDetailsParamsSchema,
    body: usersAddressCreateSchema,
  }),
  usersOnboardingController.createAddress,
);

usersOnboardingRouter.patch(
  "/addresses/:addressId",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: usersAddressParamsSchema,
    body: usersAddressPatchSchema,
  }),
  usersOnboardingController.patchAddress,
);

// Contacts (POST/PATCH)
usersOnboardingRouter.post(
  "/contacts",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: userDetailsParamsSchema,
    body: usersContactCreateSchema,
  }),
  usersOnboardingController.createContact,
);

usersOnboardingRouter.patch(
  "/contacts/:contactId",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: usersContactParamsSchema,
    body: usersContactPatchSchema,
  }),
  usersOnboardingController.patchContact,
);

// Relationships (POST/PATCH)
usersOnboardingRouter.post(
  "/relationships",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: userDetailsParamsSchema,
    body: usersRelationshipsCreateSchema,
  }),
  usersOnboardingController.createRelationships,
);

usersOnboardingRouter.patch(
  "/relationships",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: userDetailsParamsSchema,
    body: usersRelationshipsPatchSchema,
  }),
  usersOnboardingController.patchRelationships,
);

// Tax infos (POST/PATCH)
usersOnboardingRouter.post(
  "/tax-infos",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: userDetailsParamsSchema,
    body: usersTaxInfosCreateSchema,
  }),
  usersOnboardingController.createTaxInfos,
);

usersOnboardingRouter.patch(
  "/tax-infos",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: userDetailsParamsSchema,
    body: usersTaxInfosPatchSchema,
  }),
  usersOnboardingController.patchTaxInfos,
);

// Financial info (POST/PATCH)
usersOnboardingRouter.post(
  "/financial-info",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: userDetailsParamsSchema,
    body: usersFinancialInfoCreateSchema,
  }),
  usersOnboardingController.createFinancialInfo,
);

usersOnboardingRouter.patch(
  "/financial-info",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: userDetailsParamsSchema,
    body: usersFinancialInfoPatchSchema,
  }),
  usersOnboardingController.patchFinancialInfo,
);

export { usersOnboardingRouter };
