import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../shared/controllers/tenant-context.js";
import { ForbiddenError } from "../../shared/errors/app-error.js";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import { isAllowed, resolvePermissions } from "../auth/permissions.js";
import { sendSuccessResponse } from "../../shared/responses/send-success-response.js";
import { financialService } from "./service.js";
import type {
  ApplyCreditInput,
  BillReceivablesInput,
  CreateAgreementInput,
  CreateTitleInput,
  ImportReturnInput,
  IntegralSettlementInput,
  IssueBoletoInput,
  ListOpenInstallmentsQuery,
  ListTitlesQuery,
  PayableFromNfeInput,
  SettlementInput,
  SummaryQuery,
  WebhookInput,
} from "./schema.js";

const enterpriseIdOf = (req: Request) =>
  requireTenantEnterpriseId((req as RequestWithAuth).auth!);

const permissionsOf = (req: Request) =>
  resolvePermissions((req as RequestWithAuth).auth!.memberId!);

const settlementDirections = async (req: Request): Promise<Array<"RECEBER" | "PAGAR">> => {
  const permissions = await permissionsOf(req);
  const allowed: Array<"RECEBER" | "PAGAR"> = [];
  if (isAllowed(permissions, "baixar_contas_receber")) allowed.push("RECEBER");
  if (isAllowed(permissions, "baixar_contas_pagar")) allowed.push("PAGAR");
  return allowed;
};

const scopedListQuery = async <T extends { direction?: "RECEBER" | "PAGAR" }>(
  req: Request,
  query: T,
): Promise<T> => {
  const permissions = await permissionsOf(req);
  const canReceber = isAllowed(permissions, "consultar_contas_receber");
  const canPagar = isAllowed(permissions, "consultar_contas_pagar");
  if (query.direction === "RECEBER" && !canReceber) {
    throw new ForbiddenError("Permissao negada para contas a receber", "PERMISSION_DENIED");
  }
  if (query.direction === "PAGAR" && !canPagar) {
    throw new ForbiddenError("Permissao negada para contas a pagar", "PERMISSION_DENIED");
  }
  if (!query.direction && canReceber && !canPagar) return { ...query, direction: "RECEBER" };
  if (!query.direction && canPagar && !canReceber) return { ...query, direction: "PAGAR" };
  return query;
};

export class FinancialController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = await scopedListQuery(
      req,
      (req as RequestWithValidatedQuery<ListTitlesQuery>).validatedQuery!,
    );
    const page = await financialService.list(enterpriseIdOf(req), query);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Titulos recuperados com sucesso.",
      data: page,
    });
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const title = await financialService.getById(
      enterpriseIdOf(req),
      req.params["titleId"] as string,
    );
    const permissions = await permissionsOf(req);
    const consult =
      title.direction === "RECEBER" ? "consultar_contas_receber" : "consultar_contas_pagar";
    const billed = isAllowed(permissions, "consultar_faturamento") && title.direction === "RECEBER";
    if (!isAllowed(permissions, consult) && !billed) {
      throw new ForbiddenError("Permissao negada para este titulo", "PERMISSION_DENIED");
    }
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Titulo recuperado com sucesso.",
      data: title,
    });
  };

  public listOpenInstallments = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListOpenInstallmentsQuery>).validatedQuery!;
    const allowed = await settlementDirections(req);
    if (!allowed.length) {
      throw new ForbiddenError("Permissao negada para baixar titulos", "PERMISSION_DENIED");
    }
    if (query.direction && !allowed.includes(query.direction)) {
      throw new ForbiddenError("Permissao negada para baixar este titulo", "PERMISSION_DENIED");
    }
    const scoped = query.direction || allowed.length > 1 ? query : { ...query, direction: allowed[0] };
    const page = await financialService.listOpenInstallments(enterpriseIdOf(req), scoped);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Parcelas recuperadas com sucesso.",
      data: page,
    });
  };

  public summary = async (req: Request, res: Response): Promise<void> => {
    const query = await scopedListQuery(
      req,
      (req as RequestWithValidatedQuery<SummaryQuery>).validatedQuery!,
    );
    const summary = await financialService.summary(enterpriseIdOf(req), query);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Resumo financeiro recuperado com sucesso.",
      data: summary,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateTitleInput;
    const permissions = await permissionsOf(req);
    const include =
      body.direction === "RECEBER" ? "incluir_contas_receber" : "incluir_contas_pagar";
    if (!isAllowed(permissions, include)) {
      throw new ForbiddenError("Permissao negada para incluir este titulo", "PERMISSION_DENIED");
    }
    const title = await financialService.createManual(enterpriseIdOf(req), body);
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Titulo criado com sucesso.",
      data: title,
    });
  };

  public bill = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as BillReceivablesInput;
    const auth = (req as RequestWithAuth).auth!;
    if (body.kind === "BOLETO") {
      const permissions = await resolvePermissions(auth.memberId!);
      if (!isAllowed(permissions, "incluir_boleto_bancario")) {
        throw new ForbiddenError(
          "Permissao negada para emitir boleto",
          "PERMISSION_DENIED",
        );
      }
    }
    const title = await financialService.bill(enterpriseIdOf(req), body);
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Faturamento realizado com sucesso.",
      data: title,
    });
  };

  public issueBoleto = async (req: Request, res: Response): Promise<void> => {
    const title = await financialService.issueBoleto(
      enterpriseIdOf(req),
      req.params["titleId"] as string,
      req.body as IssueBoletoInput,
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Boleto emitido com sucesso.",
      data: title,
    });
  };

  public settle = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const settlement = await financialService.settle(
      enterpriseIdOf(req),
      req.params["installmentId"] as string,
      auth.userId!,
      req.body as SettlementInput,
      await settlementDirections(req),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Baixa registrada com sucesso.",
      data: settlement,
    });
  };

  public settleIntegral = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const result = await financialService.settleIntegral(
      enterpriseIdOf(req),
      auth.userId!,
      req.body as IntegralSettlementInput,
      await settlementDirections(req),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Baixa integral registrada com sucesso.",
      data: result,
    });
  };

  public reverse = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const reversal = await financialService.reverse(
      enterpriseIdOf(req),
      req.params["settlementId"] as string,
      auth.userId!,
      await settlementDirections(req),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Baixa estornada com sucesso.",
      data: reversal,
    });
  };

  public applyCredit = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const title = await financialService.applyCredit(
      enterpriseIdOf(req),
      req.params["titleId"] as string,
      auth.userId!,
      req.body as ApplyCreditInput,
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Credito aplicado com sucesso.",
      data: title,
    });
  };

  public payableFromNfe = async (req: Request, res: Response): Promise<void> => {
    const title = await financialService.createPayableFromNfe(
      enterpriseIdOf(req),
      req.body as PayableFromNfeInput,
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Conta a pagar criada com sucesso.",
      data: title,
    });
  };

  public listAgreements = async (req: Request, res: Response): Promise<void> => {
    const items = await financialService.listAgreements(enterpriseIdOf(req));
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Convenios recuperados com sucesso.",
      data: items,
    });
  };

  public createAgreement = async (req: Request, res: Response): Promise<void> => {
    const agreement = await financialService.createAgreement(
      enterpriseIdOf(req),
      req.body as CreateAgreementInput,
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Convenio criado com sucesso.",
      data: agreement,
    });
  };

  public createRemittance = async (req: Request, res: Response): Promise<void> => {
    const remittance = await financialService.createRemittance(
      enterpriseIdOf(req),
      req.params["agreementId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Remessa gerada com sucesso.",
      data: remittance,
    });
  };

  public downloadRemittance = async (req: Request, res: Response): Promise<void> => {
    const file = await financialService.getRemittanceFile(
      enterpriseIdOf(req),
      req.params["remittanceId"] as string,
    );
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
    res.status(HttpStatus.OK).send(file.content);
  };

  public importReturn = async (req: Request, res: Response): Promise<void> => {
    const file = await financialService.importReturn(
      enterpriseIdOf(req),
      req.params["agreementId"] as string,
      req.body as ImportReturnInput,
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Retorno importado com sucesso.",
      data: file,
    });
  };

  public webhook = async (req: Request, res: Response): Promise<void> => {
    const result = await financialService.handleWebhook(
      req.params["provider"] as string,
      req.body as WebhookInput,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Liquidacao recebida com sucesso.",
      data: result,
    });
  };
}

export const financialController = new FinancialController();
