import type { RequestHandler } from "express";
import { NotFoundError } from "./app-error.js";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError("Rota nao encontrada", "ROUTE_NOT_FOUND"));
};
