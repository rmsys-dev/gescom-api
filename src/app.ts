import express from "express";
import compression from "compression";
import helmet from "helmet";
import { appInfo } from "./config/app-info.js";
import { corsMiddleware, jsonBodyParser } from "./config/http.js";
import { errorHandler } from "./shared/errors/error-handler.js";
import { notFoundHandler } from "./shared/errors/not-found-handler.js";
import { apiRateLimit } from "./shared/middleware/api-rate-limit.js";
import { requestId } from "./shared/middleware/request-id.js";
import { requestLogger } from "./shared/middleware/request-logger.js";
import { HttpStatus } from "./shared/http/http-status.js";
import { sendSuccessResponse } from "./shared/responses/send-success-response.js";
import { apiRouter } from "./routes/index.js";

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
      status: "Servidor rodando! 🟢",
      timestamp: new Date().toISOString(),
      version: appInfo.version,
    },
  });
});

app.use("/api", apiRateLimit, apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
