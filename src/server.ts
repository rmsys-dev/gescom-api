import { app } from "./app.js";
import { env } from "./config/env.js";
import { LogEvents } from "./shared/logging/log-events.js";
import { logError, logInfo } from "./shared/logging/logger.js";

const server = app.listen(env.PORT, () => {
  logInfo({
    event: LogEvents.SERVER_STARTED,
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
  });
});

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

const gracefulShutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logInfo({
    event: LogEvents.SHUTDOWN_SIGNAL_RECEIVED,
    signal,
  });

  server.close((error?: Error) => {
    if (error) {
      logError({
        event: LogEvents.HTTP_SERVER_CLOSE_ERROR,
        message: error.message,
      });
      process.exit(1);
    }

    process.exit(0);
  });
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void gracefulShutdown(signal);
  });
}
