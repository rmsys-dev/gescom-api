import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import { salesAnalyticsService } from "./service.js";
export class SalesAnalyticsController {
    enterpriseId(req) {
        return requireTenantEnterpriseId(req.auth);
    }
    periodQuery(req) {
        return req
            .validatedQuery;
    }
    timeseriesQuery(req) {
        return req
            .validatedQuery;
    }
    rankingQuery(req) {
        return req
            .validatedQuery;
    }
    topProductsQuery(req) {
        return req
            .validatedQuery;
    }
    operationsQuery(req) {
        return req
            .validatedQuery;
    }
    receivablesQuery(req) {
        return req
            .validatedQuery;
    }
    realizedOverview = async (req, res) => {
        res.setHeader("Cache-Control", "private, max-age=60");
        const data = await salesAnalyticsService.realizedOverview(this.enterpriseId(req), this.periodQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Overview de receita realizada recuperado com sucesso.",
            data,
        });
    };
    realizedCompare = async (req, res) => {
        const data = await salesAnalyticsService.realizedCompare(this.enterpriseId(req), this.periodQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Comparativo de receita realizada recuperado com sucesso.",
            data,
        });
    };
    realizedTimeseries = async (req, res) => {
        const data = await salesAnalyticsService.realizedTimeseries(this.enterpriseId(req), this.timeseriesQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Serie temporal de receita realizada recuperada com sucesso.",
            data,
        });
    };
    pipelineOverview = async (req, res) => {
        res.setHeader("Cache-Control", "private, max-age=60");
        const data = await salesAnalyticsService.pipelineOverview(this.enterpriseId(req), this.periodQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Overview de pipeline recuperado com sucesso.",
            data,
        });
    };
    pipelineCompare = async (req, res) => {
        const data = await salesAnalyticsService.pipelineCompare(this.enterpriseId(req), this.periodQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Comparativo de pipeline recuperado com sucesso.",
            data,
        });
    };
    pipelineTimeseries = async (req, res) => {
        const data = await salesAnalyticsService.pipelineTimeseries(this.enterpriseId(req), this.timeseriesQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Serie temporal de pipeline recuperada com sucesso.",
            data,
        });
    };
    pipelineBudgets = async (req, res) => {
        const data = await salesAnalyticsService.pipelineBudgets(this.enterpriseId(req), this.periodQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Analytics de orcamentos recuperado com sucesso.",
            data,
        });
    };
    pipelineBudgetsFunnel = async (req, res) => {
        const data = await salesAnalyticsService.pipelineBudgetsFunnel(this.enterpriseId(req), this.periodQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Funil de orcamentos recuperado com sucesso.",
            data,
        });
    };
    byPaymentType = async (req, res) => {
        const data = await salesAnalyticsService.byPaymentType(this.enterpriseId(req), this.rankingQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Vendas por forma de pagamento recuperadas com sucesso.",
            data,
        });
    };
    bySeller = async (req, res) => {
        const data = await salesAnalyticsService.bySeller(this.enterpriseId(req), this.rankingQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Vendas por vendedor recuperadas com sucesso.",
            data,
        });
    };
    byCustomer = async (req, res) => {
        const data = await salesAnalyticsService.byCustomer(this.enterpriseId(req), this.rankingQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Vendas por cliente recuperadas com sucesso.",
            data,
        });
    };
    topProducts = async (req, res) => {
        const data = await salesAnalyticsService.topProducts(this.enterpriseId(req), this.topProductsQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Top produtos recuperados com sucesso.",
            data,
        });
    };
    byProductGroup = async (req, res) => {
        const data = await salesAnalyticsService.byProductGroup(this.enterpriseId(req), this.rankingQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Vendas por grupo de produto recuperadas com sucesso.",
            data,
        });
    };
    byProductBrand = async (req, res) => {
        const data = await salesAnalyticsService.byProductBrand(this.enterpriseId(req), this.rankingQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Vendas por marca recuperadas com sucesso.",
            data,
        });
    };
    realizedReturns = async (req, res) => {
        const data = await salesAnalyticsService.realizedReturns(this.enterpriseId(req), this.rankingQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Analytics de devolucoes recuperado com sucesso.",
            data,
        });
    };
    statusBreakdown = async (req, res) => {
        const data = await salesAnalyticsService.statusBreakdown(this.enterpriseId(req), this.operationsQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Breakdown operacional por status recuperado com sucesso.",
            data,
        });
    };
    operationsReturns = async (req, res) => {
        const data = await salesAnalyticsService.operationsReturns(this.enterpriseId(req), this.operationsQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Analytics de devolucoes operacionais recuperado com sucesso.",
            data,
        });
    };
    receivablesSummary = async (req, res) => {
        const data = await salesAnalyticsService.receivablesSummary(this.enterpriseId(req), this.receivablesQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Resumo de contas a receber recuperado com sucesso.",
            data,
        });
    };
    receivablesAging = async (req, res) => {
        const data = await salesAnalyticsService.receivablesAging(this.enterpriseId(req), this.receivablesQuery(req));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Aging de contas a receber recuperado com sucesso.",
            data,
        });
    };
}
export const salesAnalyticsController = new SalesAnalyticsController();
