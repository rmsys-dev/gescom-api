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
