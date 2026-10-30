import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export type RequestWithId = Request & { requestId: string };

const REQUEST_ID_HEADER = "x-request-id";

//Esse arquivo é responsável por gerar um ID de requisição
//Ela recebe uma requisição e gera um ID de requisição
//O ID de requisição é usado para identificar a requisição

export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const incoming = req.header(REQUEST_ID_HEADER);
  const id = incoming && incoming.trim().length > 0 ? incoming : randomUUID();

  (req as RequestWithId).requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);

  next();
};
