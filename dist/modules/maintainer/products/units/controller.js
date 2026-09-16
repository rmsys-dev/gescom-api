import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../../shared/audit/request-meta.js";
import { maintainerUnitsService } from "./service.js";
export class MaintainerUnitsController {
    create = async (req, res) => {
        const body = req.body;
        const row = await maintainerUnitsService.create(body, auditContextFromPostRequest(req, "maintainer.products.units.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Unidade de medida criada com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const unitId = req.params["unitId"];
        const body = req.body;
        const row = await maintainerUnitsService.patch(unitId, body, auditContextFromRequest(req, "maintainer.products.units.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Unidade de medida atualizada com sucesso.",
            data: row,
        });
    };
    remove = async (req, res) => {
        const unitId = req.params["unitId"];
        const row = await maintainerUnitsService.delete(unitId, auditContextFromRequest(req, "maintainer.products.units.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Unidade de medida excluÃ­da com sucesso.",
            data: row,
        });
    };
}
export const maintainerUnitsController = new MaintainerUnitsController();
