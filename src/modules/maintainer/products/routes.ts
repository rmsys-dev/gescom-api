import { Router } from "express";
import { maintainerIcmsTaxationRouter } from "./icms-taxation/routes.js";
import { maintainerPisCofinsSituationRouter } from "./pis-cofins-situation/routes.js";
import { maintainerProductsAnpRouter } from "./products-anp/routes.js";
import { maintainerProductsCestRouter } from "./products-cest/routes.js";
import { maintainerProductsNbsRouter } from "./products-nbs/routes.js";
import { maintainerProductsNcmRouter } from "./products-ncm/routes.js";
import { maintainerUnitsRouter } from "./units/routes.js";

const maintainerProductsRouter = Router();

maintainerProductsRouter.use("/units", maintainerUnitsRouter);
maintainerProductsRouter.use("/products-ncm", maintainerProductsNcmRouter);
maintainerProductsRouter.use("/products-cest", maintainerProductsCestRouter);
maintainerProductsRouter.use("/products-anp", maintainerProductsAnpRouter);
maintainerProductsRouter.use("/products-nbs", maintainerProductsNbsRouter);
maintainerProductsRouter.use("/icms-taxation", maintainerIcmsTaxationRouter);
maintainerProductsRouter.use(
  "/pis-cofins-situation",
  maintainerPisCofinsSituationRouter,
);

export { maintainerProductsRouter };
