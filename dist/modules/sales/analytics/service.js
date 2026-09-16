import { dimensionsAnalyticsService } from "./dimensions.service.js";
import { operationsAnalyticsService } from "./operations.service.js";
import { pipelineAnalyticsService } from "./pipeline.service.js";
import { realizedAnalyticsService } from "./realized.service.js";
import { receivablesAnalyticsService } from "./receivables.service.js";
export class SalesAnalyticsService {
    realizedOverview = (enterpriseId, query) => realizedAnalyticsService.overview(enterpriseId, query);
    realizedCompare = (enterpriseId, query) => realizedAnalyticsService.compare(enterpriseId, query);
    realizedTimeseries = (enterpriseId, query) => realizedAnalyticsService.timeseries(enterpriseId, query);
    pipelineOverview = (enterpriseId, query) => pipelineAnalyticsService.overview(enterpriseId, query);
    pipelineCompare = (enterpriseId, query) => pipelineAnalyticsService.compare(enterpriseId, query);
    pipelineTimeseries = (enterpriseId, query) => pipelineAnalyticsService.timeseries(enterpriseId, query);
    pipelineBudgets = (enterpriseId, query) => pipelineAnalyticsService.budgets(enterpriseId, query);
    pipelineBudgetsFunnel = (enterpriseId, query) => pipelineAnalyticsService.budgetsFunnel(enterpriseId, query);
    byPaymentType = (enterpriseId, query) => dimensionsAnalyticsService.byPaymentType(enterpriseId, query);
    bySeller = (enterpriseId, query) => dimensionsAnalyticsService.bySeller(enterpriseId, query);
    byCustomer = (enterpriseId, query) => dimensionsAnalyticsService.byCustomer(enterpriseId, query);
    topProducts = (enterpriseId, query) => dimensionsAnalyticsService.topProducts(enterpriseId, query);
    byProductGroup = (enterpriseId, query) => dimensionsAnalyticsService.byProductGroup(enterpriseId, query);
    byProductBrand = (enterpriseId, query) => dimensionsAnalyticsService.byProductBrand(enterpriseId, query);
    realizedReturns = (enterpriseId, query) => dimensionsAnalyticsService.returnsSummary(enterpriseId, query);
    statusBreakdown = (enterpriseId, query) => operationsAnalyticsService.statusBreakdown(enterpriseId, query);
    operationsReturns = (enterpriseId, query) => operationsAnalyticsService.returns(enterpriseId, query);
    receivablesSummary = (enterpriseId, query) => receivablesAnalyticsService.summary(enterpriseId, query);
    receivablesAging = (enterpriseId, query) => receivablesAnalyticsService.aging(enterpriseId, query);
}
export const salesAnalyticsService = new SalesAnalyticsService();
