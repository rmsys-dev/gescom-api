import { Router } from "express";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { requireMaintainerApiKey } from "../require-maintainer-api-key.js";
import { maintainerDepartmentsController } from "./controller.js";
import {
  createDepartmentSchema,
  departmentParamsSchema,
  patchDepartmentSchema,
} from "./schema.js";

const maintainerDepartmentsRouter = Router();

maintainerDepartmentsRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createDepartmentSchema }),
  maintainerDepartmentsController.create,
);

maintainerDepartmentsRouter.patch(
  "/:departmentId",
  requireMaintainerApiKey,
  validateSchema({
    params: departmentParamsSchema,
    body: patchDepartmentSchema,
  }),
  maintainerDepartmentsController.patch,
);

export { maintainerDepartmentsRouter };
