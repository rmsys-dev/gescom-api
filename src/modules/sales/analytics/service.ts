import { dimensionsAnalyticsService } from "./dimensions.service.js";
import { operationsAnalyticsService } from "./operations.service.js";
import { pipelineAnalyticsService } from "./pipeline.service.js";
import { realizedAnalyticsService } from "./realized.service.js";
import { receivablesAnalyticsService } from "./receivables.service.js";
import type {
  AnalyticsOperationsQuery,
  AnalyticsPeriodQuery,
  AnalyticsRankingQuery,
  AnalyticsReceivablesQuery,
  AnalyticsTimeseriesQuery,
  AnalyticsTopProductsQuery,
} from "./schema.js";

export class SalesAnalyticsService {
  public realizedOverview = (enterpriseId: string, query: AnalyticsPeriodQuery) =>
    realizedAnalyticsService.overview(enterpriseId, query);

  public realizedCompare = (enterpriseId: string, query: AnalyticsPeriodQuery) =>
    realizedAnalyticsService.compare(enterpriseId, query);

  public realizedTimeseries = (
    enterpriseId: string,
    query: AnalyticsTimeseriesQuery,
  ) => realizedAnalyticsService.timeseries(enterpriseId, query);

  public pipelineOverview = (enterpriseId: string, query: AnalyticsPeriodQuery) =>
    pipelineAnalyticsService.overview(enterpriseId, query);

  public pipelineCompare = (enterpriseId: string, query: AnalyticsPeriodQuery) =>
    pipelineAnalyticsService.compare(enterpriseId, query);

  public pipelineTimeseries = (
    enterpriseId: string,
    query: AnalyticsTimeseriesQuery,
  ) => pipelineAnalyticsService.timeseries(enterpriseId, query);

  public pipelineBudgets = (enterpriseId: string, query: AnalyticsPeriodQuery) =>
    pipelineAnalyticsService.budgets(enterpriseId, query);

  public pipelineBudgetsFunnel = (
    enterpriseId: string,
    query: AnalyticsPeriodQuery,
  ) => pipelineAnalyticsService.budgetsFunnel(enterpriseId, query);

  public byPaymentType = (enterpriseId: string, query: AnalyticsRankingQuery) =>
    dimensionsAnalyticsService.byPaymentType(enterpriseId, query);

  public bySeller = (enterpriseId: string, query: AnalyticsRankingQuery) =>
    dimensionsAnalyticsService.bySeller(enterpriseId, query);

  public byCustomer = (enterpriseId: string, query: AnalyticsRankingQuery) =>
    dimensionsAnalyticsService.byCustomer(enterpriseId, query);

  public topProducts = (enterpriseId: string, query: AnalyticsTopProductsQuery) =>
    dimensionsAnalyticsService.topProducts(enterpriseId, query);

  public byProductGroup = (enterpriseId: string, query: AnalyticsRankingQuery) =>
    dimensionsAnalyticsService.byProductGroup(enterpriseId, query);

  public byProductBrand = (enterpriseId: string, query: AnalyticsRankingQuery) =>
    dimensionsAnalyticsService.byProductBrand(enterpriseId, query);

  public realizedReturns = (enterpriseId: string, query: AnalyticsRankingQuery) =>
    dimensionsAnalyticsService.returnsSummary(enterpriseId, query);

  public statusBreakdown = (
    enterpriseId: string,
    query: AnalyticsOperationsQuery,
  ) => operationsAnalyticsService.statusBreakdown(enterpriseId, query);

  public cancellations = (
    enterpriseId: string,
    query: AnalyticsOperationsQuery,
  ) => operationsAnalyticsService.cancellations(enterpriseId, query);

  public receivablesSummary = (
    enterpriseId: string,
    query: AnalyticsReceivablesQuery,
  ) => receivablesAnalyticsService.summary(enterpriseId, query);

  public receivablesAging = (
    enterpriseId: string,
    query: AnalyticsReceivablesQuery,
  ) => receivablesAnalyticsService.aging(enterpriseId, query);
}

export const salesAnalyticsService = new SalesAnalyticsService();
