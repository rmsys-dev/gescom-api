import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import {
  requirePermission,
  requireSelfOrPermission,
} from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { resolveUserReadAccess } from "../../shared/middleware/user-read-access-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { usersController } from "./controller.js";
import { usersOnboardingRouter } from "./onboarding/routes.js";
import {
  createUserBodySchema,
  listUsersQuerySchema,
  patchUserBodySchema,
  userEnterpriseAndIdParamsSchema,
  usersEnterpriseParamsSchema,
} from "./schema.js";

const usersRouter = Router({ mergeParams: true });

//Criação de usuário
usersRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_usuarios"),
  validateSchema({
    params: usersEnterpriseParamsSchema,
    body: createUserBodySchema,
  }),
  usersController.create,
);

//Listagem de usuários (cadastro global; acesso controlado por permissão)
usersRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_usuarios"),
  validateSchema({
    params: usersEnterpriseParamsSchema,
    query: listUsersQuerySchema,
  }),
  usersController.list,
);

//Busca um usuário pelo ID: modo de leitura resolvido no middleware `resolveUserReadAccess`
usersRouter.get(
  "/:userId",
  authMiddleware,
  tenantMiddleware,
  resolveUserReadAccess,
  validateSchema({ params: userEnterpriseAndIdParamsSchema }),
  usersController.getById,
);

//Alteração parcial de usuário
usersRouter.patch(
  "/:userId",
  authMiddleware,
  tenantMiddleware,
  requireSelfOrPermission("alterar_usuarios"),
  validateSchema({
    params: userEnterpriseAndIdParamsSchema,
    body: patchUserBodySchema,
  }),
  usersController.patch,
);

// Onboarding de usuário (GET agregado + POST/PATCH por seção)
usersRouter.use("/:userId", usersOnboardingRouter);

export { usersRouter };
