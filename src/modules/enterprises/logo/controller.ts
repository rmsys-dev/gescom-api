import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import { auditContextFromRequest } from "../../../shared/audit/request-meta.js";
import { enterpriseLogoService } from "./service.js";
import type { RequestWithLogoFile } from "./upload.js";

export class EnterpriseLogoController {
  public put = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const file = (req as RequestWithLogoFile).file;
    const data = await enterpriseLogoService.upsert(
      enterpriseId,
      file,
      auditContextFromRequest(req, "enterprises.logo.service.upsert", {
        enterpriseId,
      }),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Logo da empresa atualizada com sucesso.",
      data,
    });
  };

  public get = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const { bytes, mime } = await enterpriseLogoService.getBytes(enterpriseId);
    res
      .status(HttpStatus.OK)
      .set({
        "Content-Type": mime,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
      })
      .send(bytes);
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    await enterpriseLogoService.remove(
      enterpriseId,
      auditContextFromRequest(req, "enterprises.logo.service.remove", {
        enterpriseId,
      }),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Logo da empresa removida com sucesso.",
      data: { hasLogo: false },
    });
  };
}

export const enterpriseLogoController = new EnterpriseLogoController();
