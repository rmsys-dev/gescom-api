import { Router } from "express";
import { addressesCepsRouter } from "./ceps/routes.js";
import { addressesCitiesRouter } from "./cities/routes.js";
import { addressesCountriesRouter } from "./countries/routes.js";
import { addressesStatesRouter } from "./states/routes.js";

const addressesRouter = Router();

addressesRouter.use("/countries", addressesCountriesRouter);
addressesRouter.use("/states", addressesStatesRouter);
addressesRouter.use("/cities", addressesCitiesRouter);
addressesRouter.use("/ceps", addressesCepsRouter);

export { addressesRouter };
