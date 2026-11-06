import { LogEvents } from "../shared/logging/log-events.js";
import { logInfo, logWarn } from "../shared/logging/logger.js";
import { DB_APPLICATION_NAME, DB_POOL_MAX, sql } from "./schema.js";

const POOL_METRICS_INTERVAL_MS = 45_000;

type PoolActivityRow = {
  total: number;
  active: number;
  idle: number;
  idle_in_transaction: number;
};

let timer: NodeJS.Timeout | null = null;

const readPoolActivity = async (): Promise<PoolActivityRow> => {
  const rows = await sql<PoolActivityRow[]>`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE state = 'active')::int AS active,
      count(*) FILTER (WHERE state = 'idle')::int AS idle,
      count(*) FILTER (WHERE state = 'idle in transaction')::int AS idle_in_transaction
    FROM pg_stat_activity
    WHERE application_name = ${DB_APPLICATION_NAME}
  `;

  return (
    rows[0] ?? {
      total: 0,
      active: 0,
      idle: 0,
      idle_in_transaction: 0,
    }
  );
};

const emitPoolMetrics = async (): Promise<void> => {
  try {
    const activity = await readPoolActivity();
    logInfo({
      event: LogEvents.DB_POOL_STATS,
      poolMax: DB_POOL_MAX,
      totalCount: activity.total,
      activeCount: activity.active,
      idleCount: activity.idle,
      idleInTransactionCount: activity.idle_in_transaction,
      // postgres.js não expõe waitingCount como o node-pg; saturação aparece
      // quando totalCount se aproxima de poolMax com activeCount alto.
    });
  } catch (error) {
    logWarn({
      event: LogEvents.DB_POOL_STATS_FAILED,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao coletar metricas do pool.",
    });
  }
};

export const startPoolMetricsLogging = (): void => {
  if (timer) {
    return;
  }

  timer = setInterval(() => {
    void emitPoolMetrics();
  }, POOL_METRICS_INTERVAL_MS);
  timer.unref();
};

export const stopPoolMetricsLogging = (): void => {
  if (!timer) {
    return;
  }

  clearInterval(timer);
  timer = null;
};
