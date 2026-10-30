import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerBenefitCodesController } from "./controller.js";
import {
  benefitCodeParamsSchema,
  compatibleCstParamsSchema,
  createBenefitCodeSchema,
  linkCompatibleCstSchema,
  patchBenefitCodeSchema,
} from "./schema.js";

const maintainerBenefitCodesRouter = Router();

maintainerBenefitCodesRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createBenefitCodeSchema }),
  maintainerBenefitCodesController.create,
);

maintainerBenefitCodesRouter.patch(
  "/:benefitCodeId",
  requireMaintainerApiKey,
  validateSchema({
    params: benefitCodeParamsSchema,
    body: patchBenefitCodeSchema,
  }),
  maintainerBenefitCodesController.patch,
);

maintainerBenefitCodesRouter.delete(
  "/:benefitCodeId",
  requireMaintainerApiKey,
  validateSchema({
    params: benefitCodeParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerBenefitCodesController.remove,
);

maintainerBenefitCodesRouter.post(
  "/:benefitCodeId/compatible-cst",
  requireMaintainerApiKey,
  validateSchema({
    params: benefitCodeParamsSchema,
    body: linkCompatibleCstSchema,
  }),
  maintainerBenefitCodesController.linkCst,
);

maintainerBenefitCodesRouter.delete(
  "/compatible-cst/:linkId",
  requireMaintainerApiKey,
  validateSchema({
    params: compatibleCstParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerBenefitCodesController.unlinkCst,
);

export { maintainerBenefitCodesRouter };
