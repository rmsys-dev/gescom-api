import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import { maintainerBenefitCodesService } from "./service.js";
import type {
  CreateBenefitCodeInput,
  LinkCompatibleCstInput,
  PatchBenefitCodeInput,
} from "./schema.js";

export class MaintainerBenefitCodesController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerBenefitCodesService.create(
      req.body as CreateBenefitCodeInput,
      auditContextFromPostRequest(
        req,
        "maintainer.nfe.benefit-codes.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Codigo de beneficio criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerBenefitCodesService.patch(
      req.params["benefitCodeId"] as string,
      req.body as PatchBenefitCodeInput,
      auditContextFromRequest(
        req,
        "maintainer.nfe.benefit-codes.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Codigo de beneficio atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerBenefitCodesService.delete(
      req.params["benefitCodeId"] as string,
      auditContextFromRequest(
        req,
        "maintainer.nfe.benefit-codes.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Codigo de beneficio excluido com sucesso.",
      data: row,
    });
  };

  public linkCst = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerBenefitCodesService.linkCst(
      req.params["benefitCodeId"] as string,
      req.body as LinkCompatibleCstInput,
      auditContextFromPostRequest(
        req,
        "maintainer.nfe.benefit-codes.service.linkCst",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "CST vinculado ao beneficio com sucesso.",
      data: row,
    });
  };

  public unlinkCst = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerBenefitCodesService.unlinkCst(
      req.params["linkId"] as string,
      auditContextFromRequest(
        req,
        "maintainer.nfe.benefit-codes.service.unlinkCst",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Vinculo de CST com beneficio excluido com sucesso.",
      data: row,
    });
  };
}

export const maintainerBenefitCodesController =
  new MaintainerBenefitCodesController();
