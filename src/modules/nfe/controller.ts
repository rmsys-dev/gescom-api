import type { Request, Response } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../shared/responses/send-success-response.js";
import { BadRequestError } from "../../shared/errors/app-error.js";
import {
  auditContextFromRequest,
  withDeleteAuditSource,
  withPatchAuditSource,
  withPostAuditSource,
} from "../../shared/audit/request-meta.js";
import { nfeParametersService } from "./parameters/service.js";
import { nfeConfiguracaoService } from "./configuracao/service.js";
import type { PatchNfeConfiguracaoInput } from "./configuracao/schema.js";
import { nfeCertificadoUploadSchema } from "./configuracao/schema.js";
import type { ConsultaCadastroQuery, StatusServicoQuery } from "./schema.js";
import { nfeService } from "./service.js";
import { nfeCatalogsService } from "./catalogs/service.js";
import { nfeDocumentService } from "./document/service.js";
import { nfeDanfeService } from "./danfe/service.js";
import { nfeFromSalesService } from "./from-sales.js";
import { nfeOperationsService } from "./operations/catalog-service.js";
import { nfeOperationsStatesService } from "./operations/service.js";
import type {
  CreateNfeOperationInput,
  CreateNfeOperationStateInput,
  PatchNfeOperationInput,
  PatchNfeOperationStateInput,
} from "./operations/schema.js";
import type {
  ListBenefitCodesQuery,
  ListNfeCatalogQuery,
} from "./catalogs/schema.js";
import {
  nfeBenefitsCfopService,
  nfeBenefitsCustomerTypeService,
  nfeBenefitsStateProductService,
} from "./benefits/service.js";
import type {
  CreateBenefitCfopInput,
  CreateBenefitCustomerTypeInput,
  CreateBenefitStateProductInput,
  ListBenefitsCfopQuery,
  ListBenefitsCustomerTypeQuery,
  ListBenefitsStateProductQuery,
  PatchBenefitCfopInput,
  PatchBenefitCustomerTypeInput,
  PatchBenefitStateProductInput,
} from "./benefits/schema.js";
import type {
  CreateNfeFromSalesInput,
  CreateNfeInput,
  DanfePrintQuery,
  LinkCfopEnterpriseInput,
  ListNfeQuery,
  PatchNfeInput,
  RecalculateNfeItemsInput,
  ReplaceNfeItemsInput,
  ReplaceNfeDuplicatesInput,
  ReplaceNfePaymentsInput,
  ReplaceNfeTransportInput,
} from "./document/schema.js";

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
  auditContextFromRequest(req, source, { enterpriseId: requireEnterpriseId(req) });

export class NfeController {
  public statusServico = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<StatusServicoQuery>)
      .validatedQuery;
    const data = await nfeService.consultarStatusServico(
      query,
      requireEnterpriseId(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Status do servico da SEFAZ consultado com sucesso.",
      data,
    });
  };

  public consultaCadastro = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ConsultaCadastroQuery>)
      .validatedQuery;
    const data = await nfeService.consultarCadastro(
      query,
      requireEnterpriseId(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Cadastro do contribuinte consultado na SEFAZ.",
      data,
    });
  };

  public listParameters = async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeParametersService.list();
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Parametros globais de NF-e listados com sucesso.",
      data,
    });
  };

  public getConfiguracao = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeConfiguracaoService.get(requireEnterpriseId(req));
    sendSuccessResponse(res, HttpStatus.OK, {
      message: data.certificado?.alerta
        ? `Configuracao de NF-e recuperada com sucesso. ${data.certificado.alerta}`
        : "Configuracao de NF-e recuperada com sucesso.",
      data,
    });
  };

  public patchConfiguracao = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const body = req.body as PatchNfeConfiguracaoInput;
    const data = await nfeConfiguracaoService.patch(
      enterpriseId,
      body,
      auditContextFromRequest(
        req,
        withPatchAuditSource("nfe.configuracao.service.patch"),
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Configuracao de NF-e atualizada com sucesso.",
      data,
    });
  };

  public listCertificados = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeConfiguracaoService.listCertificates(
      requireEnterpriseId(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Certificados digitais listados com sucesso.",
      data,
    });
  };

  public uploadCertificado = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const file = req.file;
    if (!file?.buffer) {
      throw new BadRequestError(
        "Envie o arquivo PFX no campo 'pfx'",
        "NFE_CERT_FILE_REQUIRED",
      );
    }
    const parsed = nfeCertificadoUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(
        "Informe a senha do certificado digital",
        "NFE_CERT_PASSWORD_REQUIRED",
      );
    }
    const enterpriseId = requireEnterpriseId(req);
    const data = await nfeConfiguracaoService.uploadCertificate(
      enterpriseId,
      {
        pfx: file.buffer,
        fileName: file.originalname,
        password: parsed.data.password,
      },
      auditContextFromRequest(
        req,
        withPostAuditSource("nfe.configuracao.service.uploadCertificate"),
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: data.certificado?.alerta
        ? `Certificado digital atualizado com sucesso. ${data.certificado.alerta}`
        : "Certificado digital atualizado com sucesso.",
      data,
    });
  };

  public listCfops = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListNfeCatalogQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "CFOPs listados com sucesso.",
      await nfeCatalogsService.listCfops(query),
    );
  };

  public getCfop = async (req: Request, res: Response): Promise<void> => {
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CFOP recuperado com sucesso.",
      data: await nfeCatalogsService.getCfop(req.params["catalogId"] as string),
    });
  };

  public listDocumentModels = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListNfeCatalogQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Modelos de documento fiscal listados com sucesso.",
      await nfeCatalogsService.listDocumentModels(query),
    );
  };

  public getDocumentModel = async (req: Request, res: Response): Promise<void> => {
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Modelo de documento fiscal recuperado com sucesso.",
      data: await nfeCatalogsService.getDocumentModel(req.params["catalogId"] as string),
    });
  };

  public listCst = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListNfeCatalogQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "CSTs listados com sucesso.",
      await nfeCatalogsService.listCst(query),
    );
  };

  public getCst = async (req: Request, res: Response): Promise<void> => {
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CST recuperado com sucesso.",
      data: await nfeCatalogsService.getCst(req.params["catalogId"] as string),
    });
  };

  public listBenefitCodes = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListBenefitCodesQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Codigos de beneficio listados com sucesso.",
      await nfeCatalogsService.listBenefitCodes(query),
    );
  };

  public getBenefitCode = async (req: Request, res: Response): Promise<void> => {
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Codigo de beneficio recuperado com sucesso.",
      data: await nfeCatalogsService.getBenefitCode(
        req.params["catalogId"] as string,
      ),
    });
  };

  public listCstIbsCbs = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListNfeCatalogQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "CSTs IBS/CBS listados com sucesso.",
      await nfeCatalogsService.listCstIbsCbs(query),
    );
  };

  public getCstIbsCbs = async (req: Request, res: Response): Promise<void> => {
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CST IBS/CBS recuperado com sucesso.",
      data: await nfeCatalogsService.getCstIbsCbs(
        req.params["catalogId"] as string,
      ),
    });
  };

  public listClassification = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListNfeCatalogQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Classificacoes IBS/CBS listadas com sucesso.",
      await nfeCatalogsService.listClassification(query),
    );
  };

  public getClassification = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Classificacao IBS/CBS recuperada com sucesso.",
      data: await nfeCatalogsService.getClassification(
        req.params["catalogId"] as string,
      ),
    });
  };

  public listPresumedCredits = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListNfeCatalogQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Creditos presumidos listados com sucesso.",
      await nfeCatalogsService.listPresumedCredits(query),
    );
  };

  public getPresumedCredit = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Credito presumido recuperado com sucesso.",
      data: await nfeCatalogsService.getPresumedCredit(
        req.params["catalogId"] as string,
      ),
    });
  };

  public listAnexos = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListNfeCatalogQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Anexos da reforma tributaria listados com sucesso.",
      await nfeCatalogsService.listAnexos(query),
    );
  };

  public getAnexo = async (req: Request, res: Response): Promise<void> => {
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Anexo da reforma tributaria recuperado com sucesso.",
      data: await nfeCatalogsService.getAnexo(req.params["catalogId"] as string),
    });
  };

  public listCfopsEnterprises = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CFOPs da empresa listados com sucesso.",
      data: await nfeCatalogsService.listCfopsEnterprises(
        requireEnterpriseId(req),
      ),
    });
  };

  public linkCfopEnterprise = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const data = await nfeDocumentService.linkCfop(
      enterpriseId,
      req.body as LinkCfopEnterpriseInput,
      auditContextFromRequest(
        req,
        withPostAuditSource("nfe.document.service.linkCfop"),
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "CFOP vinculado a empresa com sucesso.",
      data,
    });
  };

  public createNfeFromSales = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const data = await nfeFromSalesService.create(
      enterpriseId,
      req.body as CreateNfeFromSalesInput,
      auditContextFromRequest(
        req,
        withPostAuditSource("nfe.from-sales.create"),
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Nota fiscal gerada a partir dos pedidos com sucesso.",
      data,
    });
  };

  public listNfe = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListNfeQuery>).validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Notas fiscais listadas com sucesso.",
      await nfeDocumentService.list(requireEnterpriseId(req), query),
    );
  };

  public summaryNfe = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListNfeQuery>).validatedQuery;
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Totais das notas fiscais",
      data: await nfeDocumentService.summary(requireEnterpriseId(req), query),
    });
  };

  public createNfe = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const data = await nfeDocumentService.create(
      enterpriseId,
      req.body as CreateNfeInput,
      auditContextFromRequest(
        req,
        withPostAuditSource("nfe.document.service.create"),
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Nota fiscal criada com sucesso.",
      data,
    });
  };

  public getNfe = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeDocumentService.get(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Nota fiscal recuperada com sucesso.",
      data,
    });
  };

  public patchNfe = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const data = await nfeDocumentService.patch(
      enterpriseId,
      req.params["nfeId"] as string,
      req.body as PatchNfeInput,
      auditContextFromRequest(
        req,
        withPatchAuditSource("nfe.document.service.patch"),
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Nota fiscal atualizada com sucesso.",
      data,
    });
  };

  public replaceTransport = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeDocumentService.replaceTransport(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      req.body as ReplaceNfeTransportInput,
      auditFor(req, "PUT nfe.document.service.replaceTransport"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Transporte da nota fiscal gravado com sucesso.",
      data,
    });
  };

  public recalculateItems = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeDocumentService.recalculateItems(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      req.body as RecalculateNfeItemsInput,
      auditFor(req, withPostAuditSource("nfe.document.service.recalculateItems")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Produtos da nota fiscal recalculados com sucesso.",
      data,
    });
  };

  public replaceItems = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeDocumentService.replaceItems(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      req.body as ReplaceNfeItemsInput,
      auditFor(req, "PUT nfe.document.service.replaceItems"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Itens da nota fiscal gravados com sucesso.",
      data,
    });
  };

  public replacePayments = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeDocumentService.replacePayments(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      req.body as ReplaceNfePaymentsInput,
      auditFor(req, "PUT nfe.document.service.replacePayments"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Pagamentos da nota fiscal gravados com sucesso.",
      data,
    });
  };

  public replaceDuplicates = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeDocumentService.replaceDuplicates(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      req.body as ReplaceNfeDuplicatesInput,
      auditFor(req, "PUT nfe.document.service.replaceDuplicates"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Fatura da nota fiscal gravada com sucesso.",
      data,
    });
  };

  public calculate = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeDocumentService.calculate(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      auditFor(req, withPostAuditSource("nfe.document.service.calculate")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tributos da nota fiscal calculados com sucesso.",
      data,
    });
  };

  public listOperations = async (req: Request, res: Response): Promise<void> => {
    void req;
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Operacoes fiscais listadas com sucesso.",
      data: await nfeOperationsService.list(),
    });
  };

  public getOperation = async (req: Request, res: Response): Promise<void> => {
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Operacao fiscal recuperada com sucesso.",
      data: await nfeOperationsService.get(req.params["operationId"] as string),
    });
  };

  public createOperation = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeOperationsService.create(
      req.body as CreateNfeOperationInput,
      auditFor(req, withPostAuditSource("nfe.operations.catalog.create")),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Operacao fiscal criada com sucesso.",
      data,
    });
  };

  public patchOperation = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeOperationsService.patch(
      req.params["operationId"] as string,
      req.body as PatchNfeOperationInput,
      auditFor(req, withPatchAuditSource("nfe.operations.catalog.patch")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Operacao fiscal atualizada com sucesso.",
      data,
    });
  };

  public deleteOperation = async (req: Request, res: Response): Promise<void> => {
    await nfeOperationsService.delete(
      req.params["operationId"] as string,
      auditFor(req, withDeleteAuditSource("nfe.operations.catalog.delete")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Operacao fiscal excluida com sucesso.",
    });
  };

  public listOperationStates = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeOperationsStatesService.list(requireEnterpriseId(req));
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Operacoes fiscais por estado listadas com sucesso.",
      data,
    });
  };

  public getOperationState = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeOperationsStatesService.get(
      requireEnterpriseId(req),
      req.params["operationStateId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Operacao fiscal do estado recuperada com sucesso.",
      data,
    });
  };

  public createOperationState = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeOperationsStatesService.create(
      requireEnterpriseId(req),
      req.body as CreateNfeOperationStateInput,
      auditFor(req, withPostAuditSource("nfe.operations.service.create")),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Operacao fiscal do estado criada com sucesso.",
      data,
    });
  };

  public patchOperationState = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeOperationsStatesService.patch(
      requireEnterpriseId(req),
      req.params["operationStateId"] as string,
      req.body as PatchNfeOperationStateInput,
      auditFor(req, withPatchAuditSource("nfe.operations.service.patch")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Operacao fiscal do estado atualizada com sucesso.",
      data,
    });
  };

  public deleteOperationState = async (req: Request, res: Response): Promise<void> => {
    await nfeOperationsStatesService.remove(
      requireEnterpriseId(req),
      req.params["operationStateId"] as string,
      auditFor(req, withDeleteAuditSource("nfe.operations.service.remove")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Operacao fiscal do estado excluida com sucesso.",
    });
  };

  public listBenefitsCfop = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListBenefitsCfopQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Beneficios por CFOP listados com sucesso.",
      await nfeBenefitsCfopService.list(requireEnterpriseId(req), query),
    );
  };

  public getBenefitCfop = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeBenefitsCfopService.get(
      requireEnterpriseId(req),
      req.params["benefitCfopId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Beneficio por CFOP recuperado com sucesso.",
      data,
    });
  };

  public createBenefitCfop = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeBenefitsCfopService.create(
      requireEnterpriseId(req),
      req.body as CreateBenefitCfopInput,
      auditFor(req, withPostAuditSource("nfe.benefits.cfop.service.create")),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Beneficio por CFOP criado com sucesso.",
      data,
    });
  };

  public patchBenefitCfop = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeBenefitsCfopService.patch(
      requireEnterpriseId(req),
      req.params["benefitCfopId"] as string,
      req.body as PatchBenefitCfopInput,
      auditFor(req, withPatchAuditSource("nfe.benefits.cfop.service.patch")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Beneficio por CFOP atualizado com sucesso.",
      data,
    });
  };

  public deleteBenefitCfop = async (req: Request, res: Response): Promise<void> => {
    await nfeBenefitsCfopService.remove(
      requireEnterpriseId(req),
      req.params["benefitCfopId"] as string,
      auditFor(req, withDeleteAuditSource("nfe.benefits.cfop.service.remove")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Beneficio por CFOP excluido com sucesso.",
    });
  };

  public listBenefitsCustomerType = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListBenefitsCustomerTypeQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Beneficios por tipo de cliente listados com sucesso.",
      await nfeBenefitsCustomerTypeService.list(requireEnterpriseId(req), query),
    );
  };

  public getBenefitCustomerType = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeBenefitsCustomerTypeService.get(
      requireEnterpriseId(req),
      req.params["benefitCustomerTypeId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Beneficio por tipo de cliente recuperado com sucesso.",
      data,
    });
  };

  public createBenefitCustomerType = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeBenefitsCustomerTypeService.create(
      requireEnterpriseId(req),
      req.body as CreateBenefitCustomerTypeInput,
      auditFor(req, withPostAuditSource("nfe.benefits.customer-type.service.create")),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Beneficio por tipo de cliente criado com sucesso.",
      data,
    });
  };

  public patchBenefitCustomerType = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeBenefitsCustomerTypeService.patch(
      requireEnterpriseId(req),
      req.params["benefitCustomerTypeId"] as string,
      req.body as PatchBenefitCustomerTypeInput,
      auditFor(req, withPatchAuditSource("nfe.benefits.customer-type.service.patch")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Beneficio por tipo de cliente atualizado com sucesso.",
      data,
    });
  };

  public deleteBenefitCustomerType = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    await nfeBenefitsCustomerTypeService.remove(
      requireEnterpriseId(req),
      req.params["benefitCustomerTypeId"] as string,
      auditFor(req, withDeleteAuditSource("nfe.benefits.customer-type.service.remove")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Beneficio por tipo de cliente excluido com sucesso.",
    });
  };

  public listBenefitsStateProduct = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListBenefitsStateProductQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Beneficios por estado e produto listados com sucesso.",
      await nfeBenefitsStateProductService.list(requireEnterpriseId(req), query),
    );
  };

  public getBenefitStateProduct = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeBenefitsStateProductService.get(
      requireEnterpriseId(req),
      req.params["benefitStateProductId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Beneficio por estado e produto recuperado com sucesso.",
      data,
    });
  };

  public createBenefitStateProduct = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeBenefitsStateProductService.create(
      requireEnterpriseId(req),
      req.body as CreateBenefitStateProductInput,
      auditFor(req, withPostAuditSource("nfe.benefits.state-product.service.create")),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Beneficio por estado e produto criado com sucesso.",
      data,
    });
  };

  public patchBenefitStateProduct = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeBenefitsStateProductService.patch(
      requireEnterpriseId(req),
      req.params["benefitStateProductId"] as string,
      req.body as PatchBenefitStateProductInput,
      auditFor(req, withPatchAuditSource("nfe.benefits.state-product.service.patch")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Beneficio por estado e produto atualizado com sucesso.",
      data,
    });
  };

  public deleteBenefitStateProduct = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    await nfeBenefitsStateProductService.remove(
      requireEnterpriseId(req),
      req.params["benefitStateProductId"] as string,
      auditFor(req, withDeleteAuditSource("nfe.benefits.state-product.service.remove")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Beneficio por estado e produto excluido com sucesso.",
    });
  };

  public danfe = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const nfeId = req.params["nfeId"] as string;
    const query = (req as RequestWithValidatedQuery<DanfePrintQuery>).validatedQuery;

    if (query.format === "html") {
      const { html } = await nfeDanfeService.html(enterpriseId, nfeId, {
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

    const { pdf, filename } = await nfeDanfeService.pdf(enterpriseId, nfeId);
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

  public xml = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeDocumentService.xml(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "XML da nota fiscal montado com sucesso.",
      data,
    });
  };

  public signXml = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeDocumentService.signXml(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      auditFor(req, withPostAuditSource("nfe.document.service.signXml")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "XML da nota fiscal assinado e gravado com sucesso.",
      data,
    });
  };

  public authorize = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeDocumentService.authorize(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      auditFor(req, withPostAuditSource("nfe.document.service.authorize")),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Nota fiscal enviada para autorizacao na SEFAZ.",
      data,
    });
  };
}

export const nfeController = new NfeController();
