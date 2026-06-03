import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { addressesStatesController } from "./controller.js";
import { listStatesQuerySchema } from "./schema.js";

const addressesStatesRouter = Router();

addressesStatesRouter.get(
  "/",
  authMiddleware,
  validateSchema({ query: listStatesQuerySchema }),
  addressesStatesController.list,
);

export { addressesStatesRouter };
