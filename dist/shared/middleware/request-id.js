import { randomUUID } from "node:crypto";
const REQUEST_ID_HEADER = "x-request-id";
//Esse arquivo é responsável por gerar um ID de requisição
//Ela recebe uma requisição e gera um ID de requisição
//O ID de requisição é usado para identificar a requisição
export const requestId = (req, res, next) => {
    const incoming = req.header(REQUEST_ID_HEADER);
    const id = incoming && incoming.trim().length > 0 ? incoming : randomUUID();
    req.requestId = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
};
