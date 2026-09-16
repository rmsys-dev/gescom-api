import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../../shared/audit/request-meta.js";
import { maintainerPisCofinsSituationService } from "./service.js";
export class MaintainerPisCofinsSituationController {
    create = async (req, res) => {
        const body = req.body;
        const row = await maintainerPisCofinsSituationService.create(body, auditContextFromPostRequest(req, "maintainer.products.pis-cofins-situation.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "SituaÃ§Ã£o PIS/COFINS criada com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const pisCofinsSituationId = req.params["pisCofinsSituationId"];
        const body = req.body;
        const row = await maintainerPisCofinsSituationService.patch(pisCofinsSituationId, body, auditContextFromRequest(req, "maintainer.products.pis-cofins-situation.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "SituaÃ§Ã£o PIS/COFINS atualizada com sucesso.",
            data: row,
        });
    };
    remove = async (req, res) => {
        const pisCofinsSituationId = req.params["pisCofinsSituationId"];
        const row = await maintainerPisCofinsSituationService.delete(pisCofinsSituationId, auditContextFromRequest(req, "maintainer.products.pis-cofins-situation.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "SituaÃ§Ã£o PIS/COFINS excluÃ­da com sucesso.",
            data: row,
        });
    };
}
export const maintainerPisCofinsSituationController = new MaintainerPisCofinsSituationController();
