import { app } from "./app.js";
import { env } from "./config/env.js";
import { sql } from "./db/index.js";
import {
  startPoolMetricsLogging,
  stopPoolMetricsLogging,
} from "./db/pool-metrics.js";
import { LogEvents } from "./shared/logging/log-events.js";
import { logError, logInfo } from "./shared/logging/logger.js";

const SHUTDOWN_TIMEOUT_MS = 15_000;
const DB_POOL_END_TIMEOUT_SEC = 10;
/** Distribuição SEFAZ usa no mínimo 60s; NFE_TIMEOUT_MS pode ir até 120s. */
const HTTP_REQUEST_TIMEOUT_MS = Math.max(env.NFE_TIMEOUT_MS, 60_000) + 5_000;
const HTTP_HEADERS_TIMEOUT_MS = HTTP_REQUEST_TIMEOUT_MS + 5_000;
const HTTP_KEEP_ALIVE_TIMEOUT_MS = 5_000;

const server = app.listen(env.PORT, () => {
  logInfo({
    event: LogEvents.SERVER_STARTED,
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
  });
  startPoolMetricsLogging();
});

server.requestTimeout = HTTP_REQUEST_TIMEOUT_MS;
server.headersTimeout = HTTP_HEADERS_TIMEOUT_MS;
server.keepAliveTimeout = HTTP_KEEP_ALIVE_TIMEOUT_MS;

server.on("error", (error: NodeJS.ErrnoException) => {
  const portInUse = error.code === "EADDRINUSE";

  logError({
    event: LogEvents.SERVER_LISTEN_ERROR,
    message: portInUse
      ? `Porta ${env.PORT} ja esta em uso. Encerre o processo anterior ou altere PORT no .env.`
      : error.message,
    port: env.PORT,
    code: error.code ?? null,
  });

  process.exit(1);
});

let shuttingDown = false;

const gracefulShutdown = async (signal: NodeJS.Signals): Promise<void> => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logInfo({
    event: LogEvents.SHUTDOWN_SIGNAL_RECEIVED,
    signal,
  });

  stopPoolMetricsLogging();

  const forceExit = setTimeout(() => {
    logError({
      event: LogEvents.SHUTDOWN_TIMEOUT,
      message: `Encerramento nao concluiu em ${SHUTDOWN_TIMEOUT_MS}ms.`,
    });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close((error?: Error) => {
    void (async () => {
      if (error) {
        logError({
          event: LogEvents.HTTP_SERVER_CLOSE_ERROR,
          message: error.message,
        });
        clearTimeout(forceExit);
        process.exit(1);
        return;
      }

      try {
        await sql.end({ timeout: DB_POOL_END_TIMEOUT_SEC });
      } catch (endError) {
        logError({
          event: LogEvents.DB_POOL_END_ERROR,
          message:
            endError instanceof Error ? endError.message : "Falha ao encerrar o pool.",
        });
      }

      clearTimeout(forceExit);
      process.exit(0);
    })();
  });
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void gracefulShutdown(signal);
  });
}
