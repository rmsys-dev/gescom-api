import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requireParameter } from "../../../shared/middleware/parameter-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { vehiclesController } from "./controller.js";
import {
  createVehicleSchema,
  listVehiclesQuerySchema,
  patchVehicleSchema,
  vehicleParamsSchema,
} from "./schema.js";

const vehiclesRouter = Router();
const requireOs = requireParameter("trabalha_os");

vehiclesRouter.get(
  "/",
  authMiddleware,
  requireOs,
  requirePermission("consultar_veiculos"),
  validateSchema({ query: listVehiclesQuerySchema }),
  vehiclesController.list,
);

vehiclesRouter.get(
  "/:vehicleId",
  authMiddleware,
  requireOs,
  requirePermission("consultar_veiculos"),
  validateSchema({ params: vehicleParamsSchema, query: emptyQuerySchema }),
  vehiclesController.getById,
);

vehiclesRouter.post(
  "/",
  authMiddleware,
  requireOs,
  requirePermission("incluir_veiculos"),
  validateSchema({ body: createVehicleSchema }),
  vehiclesController.create,
);

vehiclesRouter.patch(
  "/:vehicleId",
  authMiddleware,
  requireOs,
  requirePermission("alterar_veiculos"),
  validateSchema({
    params: vehicleParamsSchema,
    body: patchVehicleSchema,
  }),
  vehiclesController.patch,
);

vehiclesRouter.delete(
  "/:vehicleId",
  authMiddleware,
  requireOs,
  requirePermission("excluir_veiculos"),
  validateSchema({ params: vehicleParamsSchema, query: emptyQuerySchema }),
  vehiclesController.delete,
);

export { vehiclesRouter };
