import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerDocumentModelsController } from "./controller.js";
import {
  createDocumentModelSchema,
  documentModelParamsSchema,
  patchDocumentModelSchema,
} from "./schema.js";

const maintainerDocumentModelsRouter = Router();

maintainerDocumentModelsRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createDocumentModelSchema }),
  maintainerDocumentModelsController.create,
);

maintainerDocumentModelsRouter.patch(
  "/:documentModelId",
  requireMaintainerApiKey,
  validateSchema({ params: documentModelParamsSchema, body: patchDocumentModelSchema }),
  maintainerDocumentModelsController.patch,
);

maintainerDocumentModelsRouter.delete(
  "/:documentModelId",
  requireMaintainerApiKey,
  validateSchema({
    params: documentModelParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerDocumentModelsController.remove,
);

export { maintainerDocumentModelsRouter };
