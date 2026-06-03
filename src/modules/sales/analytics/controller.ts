import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import type {
  AnalyticsOperationsQuery,
  AnalyticsPeriodQuery,
  AnalyticsRankingQuery,
  AnalyticsReceivablesQuery,
  AnalyticsTimeseriesQuery,
  AnalyticsTopProductsQuery,
} from "./schema.js";
import { salesAnalyticsService } from "./service.js";

export class SalesAnalyticsController {
  private enterpriseId(req: Request) {
    return requireTenantEnterpriseId((req as RequestWithAuth).auth!);
  }

  private periodQuery(req: Request) {
    return (req as RequestWithValidatedQuery<AnalyticsPeriodQuery>)
      .validatedQuery;
  }

  private timeseriesQuery(req: Request) {
    return (req as RequestWithValidatedQuery<AnalyticsTimeseriesQuery>)
      .validatedQuery;
  }

  private rankingQuery(req: Request) {
    return (req as RequestWithValidatedQuery<AnalyticsRankingQuery>)
      .validatedQuery;
  }

  private topProductsQuery(req: Request) {
    return (req as RequestWithValidatedQuery<AnalyticsTopProductsQuery>)
      .validatedQuery;
  }

  private operationsQuery(req: Request) {
    return (req as RequestWithValidatedQuery<AnalyticsOperationsQuery>)
      .validatedQuery;
  }

  private receivablesQuery(req: Request) {
    return (req as RequestWithValidatedQuery<AnalyticsReceivablesQuery>)
      .validatedQuery;
  }

  public realizedOverview = async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, max-age=60");
    const data = await salesAnalyticsService.realizedOverview(
      this.enterpriseId(req),
      this.periodQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Overview de receita realizada recuperado com sucesso.",
      data,
    });
  };

  public realizedCompare = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.realizedCompare(
      this.enterpriseId(req),
      this.periodQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Comparativo de receita realizada recuperado com sucesso.",
      data,
    });
  };

  public realizedTimeseries = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.realizedTimeseries(
      this.enterpriseId(req),
      this.timeseriesQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Serie temporal de receita realizada recuperada com sucesso.",
      data,
    });
  };

  public pipelineOverview = async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "private, max-age=60");
    const data = await salesAnalyticsService.pipelineOverview(
      this.enterpriseId(req),
      this.periodQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Overview de pipeline recuperado com sucesso.",
      data,
    });
  };

  public pipelineCompare = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.pipelineCompare(
      this.enterpriseId(req),
      this.periodQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Comparativo de pipeline recuperado com sucesso.",
      data,
    });
  };

  public pipelineTimeseries = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.pipelineTimeseries(
      this.enterpriseId(req),
      this.timeseriesQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Serie temporal de pipeline recuperada com sucesso.",
      data,
    });
  };

  public pipelineBudgets = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.pipelineBudgets(
      this.enterpriseId(req),
      this.periodQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Analytics de orcamentos recuperado com sucesso.",
      data,
    });
  };

  public pipelineBudgetsFunnel = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.pipelineBudgetsFunnel(
      this.enterpriseId(req),
      this.periodQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Funil de orcamentos recuperado com sucesso.",
      data,
    });
  };

  public byPaymentType = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.byPaymentType(
      this.enterpriseId(req),
      this.rankingQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Vendas por forma de pagamento recuperadas com sucesso.",
      data,
    });
  };

  public bySeller = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.bySeller(
      this.enterpriseId(req),
      this.rankingQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Vendas por vendedor recuperadas com sucesso.",
      data,
    });
  };

  public byCustomer = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.byCustomer(
      this.enterpriseId(req),
      this.rankingQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Vendas por cliente recuperadas com sucesso.",
      data,
    });
  };

  public topProducts = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.topProducts(
      this.enterpriseId(req),
      this.topProductsQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Top produtos recuperados com sucesso.",
      data,
    });
  };

  public byProductGroup = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.byProductGroup(
      this.enterpriseId(req),
      this.rankingQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Vendas por grupo de produto recuperadas com sucesso.",
      data,
    });
  };

  public byProductBrand = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.byProductBrand(
      this.enterpriseId(req),
      this.rankingQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Vendas por marca recuperadas com sucesso.",
      data,
    });
  };

  public realizedReturns = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.realizedReturns(
      this.enterpriseId(req),
      this.rankingQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Analytics de devolucoes recuperado com sucesso.",
      data,
    });
  };

  public statusBreakdown = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.statusBreakdown(
      this.enterpriseId(req),
      this.operationsQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Breakdown operacional recuperado com sucesso.",
      data,
    });
  };

  public cancellations = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.cancellations(
      this.enterpriseId(req),
      this.operationsQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Analytics de cancelamentos recuperado com sucesso.",
      data,
    });
  };

  public receivablesSummary = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.receivablesSummary(
      this.enterpriseId(req),
      this.receivablesQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Resumo de contas a receber recuperado com sucesso.",
      data,
    });
  };

  public receivablesAging = async (req: Request, res: Response) => {
    const data = await salesAnalyticsService.receivablesAging(
      this.enterpriseId(req),
      this.receivablesQuery(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Aging de contas a receber recuperado com sucesso.",
      data,
    });
  };
}

export const salesAnalyticsController = new SalesAnalyticsController();
