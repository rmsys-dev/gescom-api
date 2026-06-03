import { sql } from "drizzle-orm";
import type {
  AnalyticsPeriodQuery,
  CompareMode,
  PeriodPreset,
} from "./schema.js";

export type ResolvedPeriod = {
  from: string;
  to: string;
  timezone: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

export const formatDateOnly = (y: number, m: number, d: number) =>
  `${y}-${pad(m)}-${pad(d)}`;

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

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

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

const quarterStartMonth = (m: number) => Math.floor((m - 1) / 3) * 3 + 1;

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

const parseDateOnly = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
};

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
