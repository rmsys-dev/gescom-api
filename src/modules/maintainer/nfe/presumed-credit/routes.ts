import { Router } from "express";
import { validateSchema } from "../../../../shared/middleware/validate-schema.js";
import {
  emptyBodySchema,
  emptyQuerySchema,
} from "../../../../shared/validation/common-schemas.js";
import { requireMaintainerApiKey } from "../../require-maintainer-api-key.js";
import { maintainerPresumedCreditController } from "./controller.js";
import {
  createPresumedCreditSchema,
  patchPresumedCreditSchema,
  presumedCreditParamsSchema,
} from "./schema.js";

const maintainerPresumedCreditRouter = Router();

maintainerPresumedCreditRouter.post(
  "/",
  requireMaintainerApiKey,
  validateSchema({ body: createPresumedCreditSchema }),
  maintainerPresumedCreditController.create,
);

maintainerPresumedCreditRouter.patch(
  "/:presumedCreditId",
  requireMaintainerApiKey,
  validateSchema({
    params: presumedCreditParamsSchema,
    body: patchPresumedCreditSchema,
  }),
  maintainerPresumedCreditController.patch,
);

maintainerPresumedCreditRouter.delete(
  "/:presumedCreditId",
  requireMaintainerApiKey,
  validateSchema({
    params: presumedCreditParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  maintainerPresumedCreditController.remove,
);

export { maintainerPresumedCreditRouter };
