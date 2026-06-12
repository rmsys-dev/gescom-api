import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../../shared/validation/common-schemas.js";
import { typeSupplierCustomersController } from "./controller.js";
import {
  createTypeSupplierCustomerSchema,
  listTypeSupplierCustomersQuerySchema,
  patchTypeSupplierCustomerSchema,
  typeSupplierCustomerParamsSchema,
} from "./schema.js";

const typeSupplierCustomersRouter = Router();

typeSupplierCustomersRouter.get(
  "/",
  authMiddleware,
  requirePermission("consultar_tipos_fornecedor_cliente"),
  validateSchema({ query: listTypeSupplierCustomersQuerySchema }),
  typeSupplierCustomersController.list,
);

typeSupplierCustomersRouter.get(
  "/:typeSupplierCustomerId",
  authMiddleware,
  requirePermission("consultar_tipos_fornecedor_cliente"),
  validateSchema({
    params: typeSupplierCustomerParamsSchema,
    query: emptyQuerySchema,
  }),
  typeSupplierCustomersController.getById,
);

typeSupplierCustomersRouter.post(
  "/",
  authMiddleware,
  requirePermission("incluir_tipos_fornecedor_cliente"),
  validateSchema({ body: createTypeSupplierCustomerSchema }),
  typeSupplierCustomersController.create,
);

typeSupplierCustomersRouter.patch(
  "/:typeSupplierCustomerId",
  authMiddleware,
  requirePermission("alterar_tipos_fornecedor_cliente"),
  validateSchema({
    params: typeSupplierCustomerParamsSchema,
    body: patchTypeSupplierCustomerSchema,
  }),
  typeSupplierCustomersController.patch,
);

typeSupplierCustomersRouter.delete(
  "/:typeSupplierCustomerId",
  authMiddleware,
  requirePermission("excluir_tipos_fornecedor_cliente"),
  validateSchema({
    params: typeSupplierCustomerParamsSchema,
    query: emptyQuerySchema,
  }),
  typeSupplierCustomersController.delete,
);

export { typeSupplierCustomersRouter };
