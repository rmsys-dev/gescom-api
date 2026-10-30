import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../require-maintainer-api-key.js";
import { maintainerEnterpriseGroupsController } from "./controller.js";
import {
  createEnterpriseGroupSchema,
  enterpriseGroupParamsSchema,
  patchEnterpriseGroupSchema,
} from "./schema.js";

const maintainerEnterpriseGroupsRouter = Router();

maintainerEnterpriseGroupsRouter.get(
  "/",
  requireMaintainerApiKey,
  validateSchema({ query: emptyQuerySchema }),
  maintainerEnterpriseGroupsController.list,
);

maintainerEnterpriseGroupsRouter.get(
  "/:groupId",
  requireMaintainerApiKey,
  validateSchema({ params: enterpriseGroupParamsSchema, query: emptyQuerySchema }),
  maintainerEnterpriseGroupsController.getById,
);

maintainerEnterpriseGroupsRouter.post(
  "/",
  requireMaintainerApiKey,
  authMiddleware,
  validateSchema({ body: createEnterpriseGroupSchema, query: emptyQuerySchema }),
  maintainerEnterpriseGroupsController.create,
);

maintainerEnterpriseGroupsRouter.patch(
  "/:groupId",
  requireMaintainerApiKey,
  authMiddleware,
  validateSchema({
    params: enterpriseGroupParamsSchema,
    body: patchEnterpriseGroupSchema,
    query: emptyQuerySchema,
  }),
  maintainerEnterpriseGroupsController.patch,
);

maintainerEnterpriseGroupsRouter.delete(
  "/:groupId",
  requireMaintainerApiKey,
  authMiddleware,
  validateSchema({
    params: enterpriseGroupParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerEnterpriseGroupsController.remove,
);

export { maintainerEnterpriseGroupsRouter };
