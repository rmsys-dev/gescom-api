import path from "node:path";
import express from "express";
import compression from "compression";
import helmet from "helmet";
import { appInfo } from "./config/app-info.js";
import { env } from "./config/env.js";
import { corsMiddleware, jsonBodyParser } from "./config/http.js";
import { sql } from "./db/index.js";
import { createApiErrorResponse } from "./shared/errors/api-error-response.js";
import { errorHandler } from "./shared/errors/error-handler.js";
import { notFoundHandler } from "./shared/errors/not-found-handler.js";
import { apiRateLimit } from "./shared/middleware/api-rate-limit.js";
import { requestId, type RequestWithId } from "./shared/middleware/request-id.js";
import { requestLogger } from "./shared/middleware/request-logger.js";
import { HttpStatus } from "./shared/http/http-status.js";
import { sendSuccessResponse } from "./shared/responses/send-success-response.js";
import { apiRouter } from "./routes/index.js";

const READY_CHECK_TIMEOUT_MS = 2_000;

const app = express();

app.set("trust proxy", 1);

app.use(compression());
app.use(helmet());
app.use(corsMiddleware);
app.use(express.json(jsonBodyParser));
app.use(requestId);
app.use(requestLogger);

app.get("/health", (_req, res) => {
  sendSuccessResponse(res, HttpStatus.OK, {
    message: "Servidor operacional.",
    data: {
      status: "Servidor rodando!",
      timestamp: new Date().toISOString(),
      version: appInfo.version,
    },
  });
});

app.get("/ready", async (req, res) => {
  const request = req as RequestWithId;
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      sql`SELECT 1`,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`ready check timed out after ${READY_CHECK_TIMEOUT_MS}ms`));
        }, READY_CHECK_TIMEOUT_MS);
      }),
    ]);

    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Servico pronto.",
      data: {
        status: "ready",
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    res.status(503).json(
      createApiErrorResponse({
        requestId: request.requestId ?? null,
        code: "SERVICE_UNAVAILABLE",
        message: "Banco de dados indisponivel.",
      }),
    );
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
});

app.use(
  "/fotos",
  helmet.crossOriginResourcePolicy({ policy: "cross-origin" }),
  express.static(path.resolve(env.PHOTOS_DIR), { maxAge: "1d", index: false }),
);

app.use("/api", apiRateLimit, apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
