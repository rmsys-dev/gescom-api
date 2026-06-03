import { z } from "zod";
import { dateOnlyIsoSchema } from "../../../shared/validation/common-schemas.js";

export const periodPresetSchema = z.enum([
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_quarter",
  "last_quarter",
  "this_year",
  "last_year",
]);

export const compareModeSchema = z.enum([
  "none",
  "previous_period",
  "previous_year",
]);

export const granularitySchema = z.enum(["day", "week", "month", "year"]);

export const sortByProductSchema = z.enum(["revenue", "quantity"]);

const optionalFiltersSchema = z.object({
  userId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
  paymentTypeId: z.string().uuid().optional(),
  productsEnterprisesId: z.string().uuid().optional(),
  productGroupId: z.string().uuid().optional(),
});

const periodFieldsSchema = z
  .object({
    dateFrom: dateOnlyIsoSchema("dateFrom").optional(),
    dateTo: dateOnlyIsoSchema("dateTo").optional(),
    periodPreset: periodPresetSchema.optional(),
    timezone: z.string().trim().min(1).default("America/Sao_Paulo"),
    compareMode: compareModeSchema.default("none"),
  })
  .strict();

const validatePeriod = (
  data: z.infer<typeof periodFieldsSchema>,
  ctx: z.RefinementCtx,
) => {
  const hasPreset = data.periodPreset !== undefined;
  const hasCustom = data.dateFrom !== undefined || data.dateTo !== undefined;

  if (hasPreset && hasCustom) {
    ctx.addIssue({
      code: "custom",
      path: ["periodPreset"],
      message: "Informe periodPreset ou dateFrom/dateTo, nao ambos",
    });
    return;
  }

  if (!hasPreset && (!data.dateFrom || !data.dateTo)) {
    ctx.addIssue({
      code: "custom",
      path: ["dateFrom"],
      message: "Informe periodPreset ou dateFrom e dateTo",
    });
    return;
  }

  if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
    ctx.addIssue({
      code: "custom",
      path: ["dateTo"],
      message: "dateTo deve ser >= dateFrom",
    });
  }
};

export const analyticsPeriodQuerySchema = periodFieldsSchema
  .extend(optionalFiltersSchema.shape)
  .superRefine(validatePeriod);

export const analyticsTimeseriesQuerySchema = periodFieldsSchema
  .extend({
    ...optionalFiltersSchema.shape,
    granularity: granularitySchema.default("day"),
  })
  .superRefine(validatePeriod)
  .superRefine((data, ctx) => {
    if (!data.dateFrom || !data.dateTo) return;
    const from = new Date(`${data.dateFrom}T00:00:00Z`);
    const to = new Date(`${data.dateTo}T00:00:00Z`);
    const days =
      Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (data.granularity === "day" && days > 366) {
      ctx.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: "Intervalo maximo de 366 dias para granularidade day",
      });
    }

    if (
      (data.granularity === "month" || data.granularity === "year") &&
      days > 366 * 5
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: "Intervalo maximo de 5 anos para granularidade month/year",
      });
    }
  });

export const analyticsRankingQuerySchema = periodFieldsSchema
  .extend({
    ...optionalFiltersSchema.shape,
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .superRefine(validatePeriod);

export const analyticsTopProductsQuerySchema =
  analyticsRankingQuerySchema.extend({
    sortBy: sortByProductSchema.default("revenue"),
  });

export const analyticsOperationsQuerySchema = periodFieldsSchema
  .extend(optionalFiltersSchema.shape)
  .superRefine(validatePeriod);

export const analyticsReceivablesQuerySchema = z
  .object({
    timezone: z.string().trim().min(1).default("America/Sao_Paulo"),
    userId: z.string().uuid().optional(),
    memberId: z.string().uuid().optional(),
  })
  .strict();

export type AnalyticsPeriodQuery = z.infer<typeof analyticsPeriodQuerySchema>;
export type AnalyticsTimeseriesQuery = z.infer<
  typeof analyticsTimeseriesQuerySchema
>;
export type AnalyticsRankingQuery = z.infer<typeof analyticsRankingQuerySchema>;
export type AnalyticsTopProductsQuery = z.infer<
  typeof analyticsTopProductsQuerySchema
>;
export type AnalyticsOperationsQuery = z.infer<
  typeof analyticsOperationsQuerySchema
>;
export type AnalyticsReceivablesQuery = z.infer<
  typeof analyticsReceivablesQuerySchema
>;
export type PeriodPreset = z.infer<typeof periodPresetSchema>;
export type CompareMode = z.infer<typeof compareModeSchema>;
export type Granularity = z.infer<typeof granularitySchema>;
