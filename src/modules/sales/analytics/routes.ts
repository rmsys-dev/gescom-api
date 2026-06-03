import { Router } from "express";
import { authMiddleware } from "../../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../../shared/middleware/validate-schema.js";
import { salesAnalyticsController } from "./controller.js";
import {
  analyticsOperationsQuerySchema,
  analyticsPeriodQuerySchema,
  analyticsRankingQuerySchema,
  analyticsReceivablesQuerySchema,
  analyticsTimeseriesQuerySchema,
  analyticsTopProductsQuerySchema,
} from "./schema.js";

const salesAnalyticsRouter = Router();

const readAnalytics = [
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_vendas"),
] as const;

salesAnalyticsRouter.get(
  "/realized/overview",
  ...readAnalytics,
  validateSchema({ query: analyticsPeriodQuerySchema }),
  salesAnalyticsController.realizedOverview,
);

salesAnalyticsRouter.get(
  "/realized/compare",
  ...readAnalytics,
  validateSchema({ query: analyticsPeriodQuerySchema }),
  salesAnalyticsController.realizedCompare,
);

salesAnalyticsRouter.get(
  "/realized/timeseries",
  ...readAnalytics,
  validateSchema({ query: analyticsTimeseriesQuerySchema }),
  salesAnalyticsController.realizedTimeseries,
);

salesAnalyticsRouter.get(
  "/realized/by-payment-type",
  ...readAnalytics,
  validateSchema({ query: analyticsRankingQuerySchema }),
  salesAnalyticsController.byPaymentType,
);

salesAnalyticsRouter.get(
  "/realized/by-seller",
  ...readAnalytics,
  validateSchema({ query: analyticsRankingQuerySchema }),
  salesAnalyticsController.bySeller,
);

salesAnalyticsRouter.get(
  "/realized/by-customer",
  ...readAnalytics,
  validateSchema({ query: analyticsRankingQuerySchema }),
  salesAnalyticsController.byCustomer,
);

salesAnalyticsRouter.get(
  "/realized/top-products",
  ...readAnalytics,
  validateSchema({ query: analyticsTopProductsQuerySchema }),
  salesAnalyticsController.topProducts,
);

salesAnalyticsRouter.get(
  "/realized/by-product-group",
  ...readAnalytics,
  validateSchema({ query: analyticsRankingQuerySchema }),
  salesAnalyticsController.byProductGroup,
);

salesAnalyticsRouter.get(
  "/realized/by-product-brand",
  ...readAnalytics,
  validateSchema({ query: analyticsRankingQuerySchema }),
  salesAnalyticsController.byProductBrand,
);

salesAnalyticsRouter.get(
  "/realized/returns",
  ...readAnalytics,
  validateSchema({ query: analyticsRankingQuerySchema }),
  salesAnalyticsController.realizedReturns,
);

salesAnalyticsRouter.get(
  "/pipeline/overview",
  ...readAnalytics,
  validateSchema({ query: analyticsPeriodQuerySchema }),
  salesAnalyticsController.pipelineOverview,
);

salesAnalyticsRouter.get(
  "/pipeline/compare",
  ...readAnalytics,
  validateSchema({ query: analyticsPeriodQuerySchema }),
  salesAnalyticsController.pipelineCompare,
);

salesAnalyticsRouter.get(
  "/pipeline/timeseries",
  ...readAnalytics,
  validateSchema({ query: analyticsTimeseriesQuerySchema }),
  salesAnalyticsController.pipelineTimeseries,
);

salesAnalyticsRouter.get(
  "/pipeline/budgets",
  ...readAnalytics,
  validateSchema({ query: analyticsPeriodQuerySchema }),
  salesAnalyticsController.pipelineBudgets,
);

salesAnalyticsRouter.get(
  "/pipeline/budgets/funnel",
  ...readAnalytics,
  validateSchema({ query: analyticsPeriodQuerySchema }),
  salesAnalyticsController.pipelineBudgetsFunnel,
);

salesAnalyticsRouter.get(
  "/operations/status-breakdown",
  ...readAnalytics,
  validateSchema({ query: analyticsOperationsQuerySchema }),
  salesAnalyticsController.statusBreakdown,
);

salesAnalyticsRouter.get(
  "/operations/cancellations",
  ...readAnalytics,
  validateSchema({ query: analyticsOperationsQuerySchema }),
  salesAnalyticsController.cancellations,
);

salesAnalyticsRouter.get(
  "/receivables/summary",
  ...readAnalytics,
  validateSchema({ query: analyticsReceivablesQuerySchema }),
  salesAnalyticsController.receivablesSummary,
);

salesAnalyticsRouter.get(
  "/receivables/aging",
  ...readAnalytics,
  validateSchema({ query: analyticsReceivablesQuerySchema }),
  salesAnalyticsController.receivablesAging,
);

export { salesAnalyticsRouter };
