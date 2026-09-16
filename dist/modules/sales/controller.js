import { requireTenantEnterpriseId } from "../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../shared/audit/request-meta.js";
import { ForbiddenError } from "../../shared/errors/app-error.js";
import { HttpStatus } from "../../shared/http/http-status.js";
import { sendListSuccessResponse, sendPageFromService, sendSuccessResponse, } from "../../shared/responses/send-success-response.js";
import { salesService } from "./service.js";
const saleAuthFromRequest = (auth) => ({
    userId: auth.userId,
    memberId: auth.memberId,
});
export class SalesController {
    list = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const query = req
            .validatedQuery;
        if (query.sellerId && auth.userId && query.sellerId !== auth.userId) {
            throw new ForbiddenError("Nao e permitido listar vendas de outro vendedor");
        }
        const page = await salesService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Vendas listadas com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const saleId = req.params["saleId"];
        const data = await salesService.getById(enterpriseId, saleId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Venda recuperada com sucesso.",
            data,
        });
    };
    printWorkOrder = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const saleId = req.params["saleId"];
        const query = req
            .validatedQuery;
        const format = query.format ?? "pdf";
        if (format === "html") {
            const document = await salesService.getPrintHtml(enterpriseId, saleId);
            res
                .status(HttpStatus.OK)
                .set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:; base-uri 'none'; form-action 'none'")
                .type("html")
                .send(document.html);
            return;
        }
        const { pdf, filename } = await salesService.getPrintPdf(enterpriseId, saleId);
        res
            .status(HttpStatus.OK)
            .set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": String(pdf.length),
            "Cache-Control": "no-store",
        })
            .send(pdf);
    };
    create = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const body = req.body;
        const data = await salesService.create(enterpriseId, auth.userId ? saleAuthFromRequest(auth) : null, body, auditContextFromPostAuth(auth, req, "sales.service.create"), req.headers["x-gescom-client"]);
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Venda criada com sucesso.",
            data,
        });
    };
    patch = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const saleId = req.params["saleId"];
        const body = req.body;
        const data = await salesService.patch(enterpriseId, saleId, auth.userId ? saleAuthFromRequest(auth) : null, body, auditContextFromPatchAuth(auth, req, "sales.service.patch"), req.headers["x-gescom-client"]);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Venda atualizada com sucesso.",
            data,
        });
    };
    addItem = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const saleId = req.params["saleId"];
        const body = req.body;
        const data = await salesService.addItem(enterpriseId, saleId, saleAuthFromRequest(auth), body, auditContextFromPostAuth(auth, req, "sales.service.addItem"), req.headers["x-gescom-client"]);
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Item incluido na venda com sucesso.",
            data,
        });
    };
    recalculateTotals = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const saleId = req.params["saleId"];
        const data = await salesService.recalculateTotals(enterpriseId, saleId, auditContextFromPostAuth(auth, req, "sales.service.recalculateTotals"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Totais da venda recalculados com sucesso.",
            data,
        });
    };
    removeItem = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const saleId = req.params["saleId"];
        const saleItemId = req.params["saleItemId"];
        const data = await salesService.removeItem(enterpriseId, saleId, saleItemId, auth.userId ?? null, auditContextFromDeleteAuth(auth, req, "sales.service.removeItem"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Item removido da venda com sucesso.",
            data,
        });
    };
    updateItem = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const saleId = req.params["saleId"];
        const saleItemId = req.params["saleItemId"];
        const body = req.body;
        const data = await salesService.updateItem(enterpriseId, saleId, saleItemId, auth.userId ?? null, body, auditContextFromPatchAuth(auth, req, "sales.service.updateItem"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Item da venda atualizado com sucesso.",
            data,
        });
    };
    convertBudgetToSale = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const saleId = req.params["saleId"];
        const body = req.body;
        const data = await salesService.convertBudgetToSale(enterpriseId, saleId, auth.userId ? saleAuthFromRequest(auth) : null, body, auditContextFromPostAuth(auth, req, "sales.service.convertBudgetToSale"), req.headers["x-gescom-client"]);
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Orcamento convertido em venda com sucesso.",
            data,
        });
    };
    convertBudgetToOs = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const saleId = req.params["saleId"];
        const body = req.body;
        const data = await salesService.convertBudgetToOs(enterpriseId, saleId, auth.userId ? saleAuthFromRequest(auth) : null, body, auditContextFromPostAuth(auth, req, "sales.service.convertBudgetToOs"), req.headers["x-gescom-client"]);
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Orcamento convertido em ordem de servico com sucesso.",
            data,
        });
    };
    convertOsToSale = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const saleId = req.params["saleId"];
        const body = req.body;
        const data = await salesService.convertOsToSale(enterpriseId, saleId, auth.userId ? saleAuthFromRequest(auth) : null, body, auditContextFromPostAuth(auth, req, "sales.service.convertOsToSale"), req.headers["x-gescom-client"]);
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Ordem de servico convertida em venda com sucesso.",
            data,
        });
    };
    estornoOs = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const saleId = req.params["saleId"];
        const data = await salesService.estornoOsToOpen(enterpriseId, saleId, auditContextFromPostAuth(auth, req, "sales.service.estornoOsToOpen"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Ordem de servico estornada com sucesso.",
            data,
        });
    };
    listSaleConversions = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const saleId = req.params["saleId"];
        const result = await salesService.listSaleConversions(enterpriseId, saleId);
        sendListSuccessResponse(res, "Conversões listadas com sucesso.", result.items);
    };
}
export const salesController = new SalesController();
