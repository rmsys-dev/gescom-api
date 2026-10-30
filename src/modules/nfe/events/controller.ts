import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import { BadRequestError } from "../../../shared/errors/app-error.js";
import {
  auditContextFromRequest,
  withPostAuditSource,
} from "../../../shared/audit/request-meta.js";
import { nfeDacceService } from "../danfe/dacce-service.js";
import { nfeEventsService } from "./service.js";
import type {
  CancelNfeBySubstitutionInput,
  CancelNfeInput,
  CorrectNfeInput,
  DaccePrintQuery,
  InutilizeNfeNoteInput,
  InutilizeNfeRangeInput,
  ListInutilizationsQuery,
  ListNfeEventsQuery,
} from "./schema.js";

const requireEnterpriseId = (req: Request): string => {
  const enterpriseId = (req as RequestWithAuth).auth.enterpriseId;
  if (!enterpriseId) {
    throw new BadRequestError(
      "Contexto de empresa ausente para esta operacao",
      "TENANT_SCOPE_REQUIRED",
    );
  }
  return enterpriseId;
};

const auditFor = (req: Request, source: string) =>
  auditContextFromRequest(req, withPostAuditSource(source), {
    enterpriseId: requireEnterpriseId(req),
  });

export class NfeEventsController {
  public cancel = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeEventsService.cancel(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      req.body as CancelNfeInput,
      auditFor(req, "nfe.events.service.cancel"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Nota fiscal cancelada na SEFAZ.",
      data,
    });
  };

  public cancelBySubstitution = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeEventsService.cancelBySubstitution(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      req.body as CancelNfeBySubstitutionInput,
      auditFor(req, "nfe.events.service.cancelBySubstitution"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "NFC-e cancelada por substituicao na SEFAZ.",
      data,
    });
  };

  public correct = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeEventsService.correct(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      req.body as CorrectNfeInput,
      auditFor(req, "nfe.events.service.correct"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Carta de correcao registrada na SEFAZ.",
      data,
    });
  };

  public eventXml = async (req: Request, res: Response): Promise<void> => {
    const { xml } = await nfeEventsService.eventXml(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      req.params["eventId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "XML do evento carregado com sucesso.",
      data: { xml },
    });
  };

  public dacce = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const nfeId = req.params["nfeId"] as string;
    const eventId = req.params["eventId"] as string;
    const query = (req as RequestWithValidatedQuery<DaccePrintQuery>).validatedQuery;

    if (query.format === "html") {
      const { html } = await nfeDacceService.html(enterpriseId, nfeId, eventId, {
        autoPrint: query.autoPrint === "1",
      });
      res
        .status(HttpStatus.OK)
        .set({
          "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:; base-uri 'none'; form-action 'none'",
          "Cache-Control": "no-store",
        })
        .type("html")
        .send(html);
      return;
    }

    const { pdf, filename } = await nfeDacceService.pdf(enterpriseId, nfeId, eventId);
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

  public inutilizeRange = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeEventsService.inutilizeRange(
      requireEnterpriseId(req),
      req.body as InutilizeNfeRangeInput,
      auditFor(req, "nfe.events.service.inutilizeRange"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Numeracao inutilizada na SEFAZ.",
      data,
    });
  };

  public inutilizeNote = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeEventsService.inutilizeNote(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      req.body as InutilizeNfeNoteInput,
      auditFor(req, "nfe.events.service.inutilizeNote"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Numero da nota inutilizado na SEFAZ.",
      data,
    });
  };

  public listByNfe = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeEventsService.listByNfe(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Eventos da nota fiscal listados com sucesso.",
      data,
    });
  };

  public listEvents = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListNfeEventsQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Eventos de notas fiscais listados com sucesso.",
      await nfeEventsService.listEvents(requireEnterpriseId(req), query),
    );
  };

  public listInutilizations = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListInutilizationsQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Inutilizacoes listadas com sucesso.",
      await nfeEventsService.listInutilizations(requireEnterpriseId(req), query),
    );
  };
}

export const nfeEventsController = new NfeEventsController();
