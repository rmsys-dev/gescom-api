import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../errors/app-error.js";
import { mapZodIssuesToDetails } from "../errors/map-zod-issues.js";

type RequestSegment = "body" | "params" | "query";

type ValidationConfig = {
  body?: ZodType<unknown>;
  params?: ZodType<unknown>;
  query?: ZodType<unknown>;
};

export type RequestWithValidatedQuery<TQuery> = Request & {
  validatedQuery: TQuery;
};

const isValidationConfig = (
  value: ZodType<unknown> | ValidationConfig,
): value is ValidationConfig => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return !("safeParse" in value) || typeof value.safeParse !== "function";
};

const runValidation = (
  req: Request,
  config: ValidationConfig,
): ReturnType<typeof mapZodIssuesToDetails> => {
  const issues: ReturnType<typeof mapZodIssuesToDetails> = [];

  if (config.body) {
    const parsed = config.body.safeParse(req.body);
    if (!parsed.success) {
      issues.push(...mapZodIssuesToDetails(parsed.error.issues, "body"));
    } else {
      req.body = parsed.data;
    }
  }

  if (config.params) {
    const parsed = config.params.safeParse(req.params);
    if (!parsed.success) {
      issues.push(...mapZodIssuesToDetails(parsed.error.issues, "params"));
    } else {
      req.params = parsed.data as Request["params"];
    }
  }

  if (config.query) {
    const parsed = config.query.safeParse(req.query);
    if (!parsed.success) {
      issues.push(...mapZodIssuesToDetails(parsed.error.issues, "query"));
    } else {
      (req as Request & { validatedQuery: unknown }).validatedQuery =
        parsed.data;
    }
  }

  return issues;
};

//Esse arquivo e responsavel por validar os segmentos da requisicao (body, params, query)
//Aceita um schema unico (validacao de body, retrocompativel) ou um objeto { body?, params?, query? }
//Quando invalido, lanca uma ValidationError padronizada (422) com lista de issues por path
//Query validada e exposta em req.validatedQuery (req.query e read-only no Express 5)

export function validateSchema<TBody>(
  schema: ZodType<TBody>,
): (req: Request, res: Response, next: NextFunction) => void;
export function validateSchema(
  config: ValidationConfig,
): (req: Request, res: Response, next: NextFunction) => void;
export function validateSchema(
  schemaOrConfig: ZodType<unknown> | ValidationConfig,
) {
  const config: ValidationConfig = isValidationConfig(schemaOrConfig)
    ? schemaOrConfig
    : { body: schemaOrConfig };

  return (req: Request, _res: Response, next: NextFunction): void => {
    const issues = runValidation(req, config);

    if (issues.length > 0) {
      next(new ValidationError(issues));
      return;
    }

    next();
  };
}
