import { Router } from "express";
import { API_VERSION } from "../config/api-version.js";
import { v1Router } from "./v1/index.js";

const apiRouter = Router();

apiRouter.use(`/${API_VERSION}`, v1Router);

export { apiRouter };
