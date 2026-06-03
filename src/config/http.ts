import cors, { type CorsOptions } from "cors";
import { env } from "./env.js";

const csvToOrigins = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

const corsOrigins = csvToOrigins(env.CORS_ORIGINS);

if (corsOrigins.length === 0) {
  throw new Error("CORS_ORIGINS must contain at least one allowed origin");
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, false);
      return;
    }

    callback(null, corsOrigins.includes(origin));
  },
};

const JSON_BODY_LIMIT = "100kb";

export const corsMiddleware = cors(corsOptions);
export const jsonBodyParser = { limit: JSON_BODY_LIMIT };
