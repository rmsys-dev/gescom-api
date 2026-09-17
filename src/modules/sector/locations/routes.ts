import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { locationsController } from "./controller.js";
import {
  createLocationSchema,
  listLocationsQuerySchema,
  patchLocationSchema,
  locationParamsSchema,
} from "./schema.js";

const locationsRouter = Router();

locationsRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_locacoes"),
  validateSchema({ query: listLocationsQuerySchema }),
  locationsController.list,
);

locationsRouter.get(
  "/:locationId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_locacoes"),
  validateSchema({ params: locationParamsSchema, query: emptyQuerySchema }),
  locationsController.getById,
);

locationsRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_locacoes"),
  validateSchema({ body: createLocationSchema }),
  locationsController.create,
);

locationsRouter.patch(
  "/:locationId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_locacoes"),
  validateSchema({
    params: locationParamsSchema,
    body: patchLocationSchema,
  }),
  locationsController.patch,
);

locationsRouter.delete(
  "/:locationId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("excluir_locacoes"),
  validateSchema({ params: locationParamsSchema, query: emptyQuerySchema }),
  locationsController.delete,
);

export { locationsRouter };
