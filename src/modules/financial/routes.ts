import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import {
  requireAnyPermission,
  requirePermission,
} from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { financialController } from "./controller.js";
import {
  agreementParamsSchema,
  applyCreditSchema,
  billReceivablesSchema,
  createAgreementSchema,
  createTitleSchema,
  importReturnSchema,
  installmentParamsSchema,
  issueBoletoSchema,
  integralSettlementSchema,
  listOpenInstallmentsQuerySchema,
  listTitlesQuerySchema,
  payableFromNfeSchema,
  remittanceParamsSchema,
  settlementParamsSchema,
  settlementSchema,
  summaryQuerySchema,
  titleParamsSchema,
  webhookParamsSchema,
  webhookSchema,
} from "./schema.js";

const financialRouter = Router();

financialRouter.post(
  "/bank/webhooks/:provider",
  validateSchema({ params: webhookParamsSchema, body: webhookSchema }),
  financialController.webhook,
);

financialRouter.get(
  "/titles",
  authMiddleware,
  tenantMiddleware,
  requireAnyPermission(["consultar_contas_receber", "consultar_contas_pagar"]),
  validateSchema({ query: listTitlesQuerySchema }),
  financialController.list,
);

financialRouter.get(
  "/summary",
  authMiddleware,
  tenantMiddleware,
  requireAnyPermission(["consultar_contas_receber", "consultar_contas_pagar"]),
  validateSchema({ query: summaryQuerySchema }),
  financialController.summary,
);

financialRouter.get(
  "/open-installments",
  authMiddleware,
  tenantMiddleware,
  requireAnyPermission(["baixar_contas_receber", "baixar_contas_pagar"]),
  validateSchema({ query: listOpenInstallmentsQuerySchema }),
  financialController.listOpenInstallments,
);

financialRouter.get(
  "/titles/:titleId",
  authMiddleware,
  tenantMiddleware,
  requireAnyPermission(["consultar_contas_receber", "consultar_contas_pagar", "consultar_faturamento"]),
  validateSchema({ params: titleParamsSchema }),
  financialController.getById,
);

financialRouter.post(
  "/titles",
  authMiddleware,
  tenantMiddleware,
  requireAnyPermission(["incluir_contas_receber", "incluir_contas_pagar"]),
  validateSchema({ body: createTitleSchema }),
  financialController.create,
);

financialRouter.post(
  "/receivables/bill",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_faturamento"),
  validateSchema({ body: billReceivablesSchema }),
  financialController.bill,
);

financialRouter.post(
  "/titles/:titleId/boleto",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_boleto_bancario"),
  validateSchema({ params: titleParamsSchema, body: issueBoletoSchema }),
  financialController.issueBoleto,
);

financialRouter.post(
  "/titles/:titleId/apply-credit",
  authMiddleware,
  tenantMiddleware,
  requirePermission("baixar_contas_receber"),
  validateSchema({ params: titleParamsSchema, body: applyCreditSchema }),
  financialController.applyCredit,
);

financialRouter.post(
  "/installments/:installmentId/settlements",
  authMiddleware,
  tenantMiddleware,
  requireAnyPermission(["baixar_contas_receber", "baixar_contas_pagar"]),
  validateSchema({ params: installmentParamsSchema, body: settlementSchema }),
  financialController.settle,
);

financialRouter.post(
  "/settlements/integral",
  authMiddleware,
  tenantMiddleware,
  requireAnyPermission(["baixar_contas_receber", "baixar_contas_pagar"]),
  validateSchema({ body: integralSettlementSchema }),
  financialController.settleIntegral,
);

financialRouter.post(
  "/settlements/:settlementId/reverse",
  authMiddleware,
  tenantMiddleware,
  requireAnyPermission(["baixar_contas_receber", "baixar_contas_pagar"]),
  validateSchema({ params: settlementParamsSchema }),
  financialController.reverse,
);

financialRouter.post(
  "/payables/from-nfe",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_contas_pagar"),
  validateSchema({ body: payableFromNfeSchema }),
  financialController.payableFromNfe,
);

financialRouter.get(
  "/bank-agreements",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_boleto_bancario"),
  financialController.listAgreements,
);

financialRouter.post(
  "/bank-agreements",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_boleto_bancario"),
  validateSchema({ body: createAgreementSchema }),
  financialController.createAgreement,
);

financialRouter.post(
  "/bank-agreements/:agreementId/remittances",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_boleto_bancario"),
  validateSchema({ params: agreementParamsSchema }),
  financialController.createRemittance,
);

financialRouter.get(
  "/remittances/:remittanceId/file",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_boleto_bancario"),
  validateSchema({ params: remittanceParamsSchema }),
  financialController.downloadRemittance,
);

financialRouter.post(
  "/bank-agreements/:agreementId/returns",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_boleto_bancario"),
  validateSchema({ params: agreementParamsSchema, body: importReturnSchema }),
  financialController.importReturn,
);

export { financialRouter };
