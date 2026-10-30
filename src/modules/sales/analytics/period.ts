import { sql } from "drizzle-orm";
import type {
  AnalyticsPeriodQuery,
  CompareMode,
  PeriodPreset,
} from "./schema.js";

/** Periodo resolvido com fuso horario. */
export type ResolvedPeriod = {
  from: string;
  to: string;
  timezone: string;
};

/** Padding de numeros. */
const pad = (n: number) => String(n).padStart(2, "0");

/** Formata uma data apenas com ano, mes e dia. */
export const formatDateOnly = (y: number, m: number, d: number) =>
  `${y}-${pad(m)}-${pad(d)}`;

/** Obtem as partes de uma data com fuso horario. */
export const getZonedDateParts = (
  date: Date,
  timeZone: string,
): { y: number; m: number; d: number } => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  const d = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  return { y, m, d };
};

/** Dias no mes. */
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Inicio da semana em lunes. */
const startOfWeekMonday = (y: number, m: number, d: number) => {
  const utc = new Date(Date.UTC(y, m - 1, d));
  const day = utc.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  utc.setUTCDate(utc.getUTCDate() - diff);
  return {
    y: utc.getUTCFullYear(),
    m: utc.getUTCMonth() + 1,
    d: utc.getUTCDate(),
  };
};

/** Meso inicial do trimestre. */
const quarterStartMonth = (m: number) => Math.floor((m - 1) / 3) * 3 + 1;

/** Resolve o periodo com base na pre-definicao. */
export const resolvePresetPeriod = (
  preset: PeriodPreset,
  timezone: string,
  now = new Date(),
): ResolvedPeriod => {
  const { y, m, d } = getZonedDateParts(now, timezone);

  switch (preset) {
    case "today":
      return { from: formatDateOnly(y, m, d), to: formatDateOnly(y, m, d), timezone };
    case "yesterday": {
      const prev = new Date(Date.UTC(y, m - 1, d - 1));
      return {
        from: formatDateOnly(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate()),
        to: formatDateOnly(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate()),
        timezone,
      };
    }
    case "this_week": {
      const start = startOfWeekMonday(y, m, d);
      return {
        from: formatDateOnly(start.y, start.m, start.d),
        to: formatDateOnly(y, m, d),
        timezone,
      };
    }
    case "last_week": {
      const thisWeekStart = startOfWeekMonday(y, m, d);
      const end = new Date(Date.UTC(thisWeekStart.y, thisWeekStart.m - 1, thisWeekStart.d - 1));
      const start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 6);
      return {
        from: formatDateOnly(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()),
        to: formatDateOnly(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate()),
        timezone,
      };
    }
    case "this_month":
      return {
        from: formatDateOnly(y, m, 1),
        to: formatDateOnly(y, m, d),
        timezone,
      };
    case "last_month": {
      const prevM = m === 1 ? 12 : m - 1;
      const prevY = m === 1 ? y - 1 : y;
      const lastDay = daysInMonth(prevY, prevM);
      return {
        from: formatDateOnly(prevY, prevM, 1),
        to: formatDateOnly(prevY, prevM, lastDay),
        timezone,
      };
    }
    case "this_quarter": {
      const qm = quarterStartMonth(m);
      return {
        from: formatDateOnly(y, qm, 1),
        to: formatDateOnly(y, m, d),
        timezone,
      };
    }
    case "last_quarter": {
      const qm = quarterStartMonth(m);
      const endPrev = new Date(Date.UTC(y, qm - 1, 0));
      const startQm = quarterStartMonth(endPrev.getUTCMonth() + 1);
      return {
        from: formatDateOnly(endPrev.getUTCFullYear(), startQm, 1),
        to: formatDateOnly(
          endPrev.getUTCFullYear(),
          endPrev.getUTCMonth() + 1,
          endPrev.getUTCDate(),
        ),
        timezone,
      };
    }
    case "this_year":
      return {
        from: formatDateOnly(y, 1, 1),
        to: formatDateOnly(y, m, d),
        timezone,
      };
    case "last_year":
      return {
        from: formatDateOnly(y - 1, 1, 1),
        to: formatDateOnly(y - 1, 12, 31),
        timezone,
      };
    default:
      return { from: formatDateOnly(y, m, d), to: formatDateOnly(y, m, d), timezone };
  }
};
    
/** Resolve o periodo da consulta de analytics. */
export const resolveAnalyticsPeriod = (
  query: Pick<
    AnalyticsPeriodQuery,
    "dateFrom" | "dateTo" | "periodPreset" | "timezone"
  >,
): ResolvedPeriod => {
  const timezone = query.timezone ?? "America/Sao_Paulo";
  if (query.periodPreset) {
    return resolvePresetPeriod(query.periodPreset, timezone);
  }
  return {
    from: query.dateFrom!,
    to: query.dateTo!,
    timezone,
  };
};

/** Converte uma data ISO para Date. */
const parseDateOnly = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
};

/** Resolve o periodo de comparacao. */
export const resolveComparisonPeriod = (
  period: ResolvedPeriod,
  compareMode: CompareMode,
): ResolvedPeriod | null => {
  if (compareMode === "none") return null;

  const fromDate = parseDateOnly(period.from);
  const toDate = parseDateOnly(period.to);

  if (compareMode === "previous_year") {
    const cmpFrom = new Date(fromDate);
    cmpFrom.setUTCFullYear(cmpFrom.getUTCFullYear() - 1);
    const cmpTo = new Date(toDate);
    cmpTo.setUTCFullYear(cmpTo.getUTCFullYear() - 1);
    return {
      from: formatDateOnly(
        cmpFrom.getUTCFullYear(),
        cmpFrom.getUTCMonth() + 1,
        cmpFrom.getUTCDate(),
      ),
      to: formatDateOnly(
        cmpTo.getUTCFullYear(),
        cmpTo.getUTCMonth() + 1,
        cmpTo.getUTCDate(),
      ),
      timezone: period.timezone,
    };
  }

  const durationDays =
    Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const cmpTo = new Date(fromDate);
  cmpTo.setUTCDate(cmpTo.getUTCDate() - 1);
  const cmpFrom = new Date(cmpTo);
  cmpFrom.setUTCDate(cmpFrom.getUTCDate() - (durationDays - 1));

  return {
    from: formatDateOnly(
      cmpFrom.getUTCFullYear(),
      cmpFrom.getUTCMonth() + 1,
      cmpFrom.getUTCDate(),
    ),
    to: formatDateOnly(
      cmpTo.getUTCFullYear(),
      cmpTo.getUTCMonth() + 1,
      cmpTo.getUTCDate(),
    ),
    timezone: period.timezone,
  };
};

/** Converte a granularidade para o formato do PostgreSQL. */
export const pgGranularity = (granularity: string) => {
  switch (granularity) {
    case "day":
      return "day";
    case "week":
      return "week";
    case "month":
      return "month";
    case "year":
      return "year";
    default:
      return "day";
  }
};

/** Literal SQL para date_trunc (evita param bind com tipo unknown no PostgreSQL). */
export const pgGranularitySql = (granularity: string) =>
  sql.raw(`'${pgGranularity(granularity)}'`);

/** Literal SQL para timezone em funcoes PG (evita divergencia de params no GROUP BY). */
export const timezoneSqlLiteral = (timezone: string) =>
  sql.raw(`'${timezone.replace(/'/g, "''")}'`);

/** Data local corrente no fuso informado. */
export const analyticsLocalTodaySql = (timezone: string) =>
  sql`(CURRENT_TIMESTAMP AT TIME ZONE ${timezoneSqlLiteral(timezone)})::date`;

/** Avanca um bucket a partir de uma data ISO (UTC date-only). */
const addBucket = (iso: string, granularity: string): string => {
  const date = parseDateOnly(iso);
  switch (granularity) {
    case "week":
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case "month":
      date.setUTCMonth(date.getUTCMonth() + 1);
      break;
    case "year":
      date.setUTCFullYear(date.getUTCFullYear() + 1);
      break;
    default:
      date.setUTCDate(date.getUTCDate() + 1);
  }
  return formatDateOnly(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
};

/** Truncata a data ao inicio do bucket (segunda para week, dia 1 para month/year). */
export const truncateToBucketStart = (
  iso: string,
  granularity: string,
): string => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  switch (granularity) {
    case "week": {
      const start = startOfWeekMonday(y, m, d);
      return formatDateOnly(start.y, start.m, start.d);
    }
    case "month":
      return formatDateOnly(y, m, 1);
    case "year":
      return formatDateOnly(y, 1, 1);
    default:
      return formatDateOnly(y, m, d);
  }
};

/** Lista todos os bucketStart do periodo (inclusivo), densos. */
export const enumerateBucketStarts = (
  period: ResolvedPeriod,
  granularity: string,
): string[] => {
  const starts: string[] = [];
  let cursor = truncateToBucketStart(period.from, granularity);
  const end = truncateToBucketStart(period.to, granularity);

  while (cursor <= end) {
    starts.push(cursor);
    cursor = addBucket(cursor, granularity);
  }
  return starts;
};

/** Label pronto para eixo X / legenda. */
export const formatBucketLabel = (
  bucketStart: string,
  granularity: string,
): string => {
  const [y, m, d] = bucketStart.split("-");
  switch (granularity) {
    case "week": {
      const end = parseDateOnly(bucketStart);
      end.setUTCDate(end.getUTCDate() + 6);
      const endLabel = formatDateOnly(
        end.getUTCFullYear(),
        end.getUTCMonth() + 1,
        end.getUTCDate(),
      );
      return `${d}/${m}–${endLabel.slice(8)}/${endLabel.slice(5, 7)}`;
    }
    case "month":
      return `${y}-${m}`;
    case "year":
      return y!;
    default:
      return `${d}/${m}/${y}`;
  }
};

/**
 * Preenche a serie com zeros para todos os buckets do periodo.
 * Cada ponto recebe bucketLabel pronto para render.
 */
export const fillDenseSeries = <T extends { bucketStart: string }>(
  period: ResolvedPeriod,
  granularity: string,
  sparse: T[],
  emptyPoint: (bucketStart: string, bucketLabel: string) => T & {
    bucketStart: string;
    bucketLabel: string;
  },
): Array<T & { bucketStart: string; bucketLabel: string }> => {
  const byStart = new Map(sparse.map((p) => [p.bucketStart, p]));
  return enumerateBucketStarts(period, granularity).map((bucketStart) => {
    const bucketLabel = formatBucketLabel(bucketStart, granularity);
    const existing = byStart.get(bucketStart);
    if (existing) {
      return { ...existing, bucketStart, bucketLabel };
    }
    return emptyPoint(bucketStart, bucketLabel);
  });
};

/**
 * Anexa valores do periodo de comparacao em cada ponto (indice a indice).
 * Pronto para grafico com linha actual + linha anterior sem zip no front.
 */
export const withPreviousSeriesPoints = <
  T extends { bucketStart: string; bucketLabel: string },
  P extends { bucketStart: string; bucketLabel: string },
>(
  series: T[],
  comparisonSeries: P[] | undefined,
): Array<T & { previous?: P }> => {
  if (!comparisonSeries) return series;
  return series.map((point, index) => {
    const previous = comparisonSeries[index];
    return previous ? { ...point, previous } : point;
  });
};
