import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../shared/validation/common-schemas.js";
import { nfeController } from "./controller.js";
import { patchNfeConfiguracaoSchema } from "./configuracao/schema.js";
import { nfePfxUpload } from "./configuracao/upload.js";
import {
  consultaCadastroQuerySchema,
  statusServicoQuerySchema,
} from "./schema.js";
import {
  listBenefitCodesQuerySchema,
  listNfeCatalogQuerySchema,
  nfeCatalogIdParamsSchema,
} from "./catalogs/schema.js";
import {
  createNfeFromSalesSchema,
  createNfeSchema,
  danfePrintQuerySchema,
  listNfeQuerySchema,
  linkCfopEnterpriseSchema,
  nfeIdParamsSchema,
  patchNfeSchema,
  recalculateNfeItemsSchema,
  replaceNfeItemsSchema,
  replaceNfeDuplicatesSchema,
  replaceNfePaymentsSchema,
  replaceNfeTransportSchema,
} from "./document/schema.js";
import {
  createNfeOperationSchema,
  createNfeOperationStateSchema,
  nfeOperationIdParamsSchema,
  nfeOperationStateIdParamsSchema,
  patchNfeOperationSchema,
  patchNfeOperationStateSchema,
} from "./operations/schema.js";
import {
  benefitCfopIdParamsSchema,
  benefitCustomerTypeIdParamsSchema,
  benefitStateProductIdParamsSchema,
  createBenefitCfopSchema,
  createBenefitCustomerTypeSchema,
  createBenefitStateProductSchema,
  listBenefitsCfopQuerySchema,
  listBenefitsCustomerTypeQuerySchema,
  listBenefitsStateProductQuerySchema,
  patchBenefitCfopSchema,
  patchBenefitCustomerTypeSchema,
  patchBenefitStateProductSchema,
} from "./benefits/schema.js";
import { emptyBodySchema } from "../../shared/validation/common-schemas.js";
import { nfeEventsController } from "./events/controller.js";
import {
  cancelNfeBySubstitutionSchema,
  cancelNfeSchema,
  inutilizeNfeNoteSchema,
  inutilizeNfeRangeSchema,
  listInutilizationsQuerySchema,
  listNfeEventsQuerySchema,
} from "./events/schema.js";

const nfeRouter = Router();

nfeRouter.get(
  "/parameters",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_parametros_nfe"),
  validateSchema({ query: emptyQuerySchema }),
  nfeController.listParameters,
);

nfeRouter.get(
  "/configuracao",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_configuracao_nfe"),
  validateSchema({ query: emptyQuerySchema }),
  nfeController.getConfiguracao,
);

nfeRouter.patch(
  "/configuracao",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_configuracao_nfe"),
  validateSchema({
    query: emptyQuerySchema,
    body: patchNfeConfiguracaoSchema,
  }),
  nfeController.patchConfiguracao,
);

nfeRouter.get(
  "/configuracao/certificados",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_configuracao_nfe"),
  validateSchema({ query: emptyQuerySchema }),
  nfeController.listCertificados,
);

nfeRouter.post(
  "/configuracao/certificado",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_configuracao_nfe"),
  nfePfxUpload,
  nfeController.uploadCertificado,
);

const catalogRead = [
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_cadastros_nfe"),
] as const;

nfeRouter.get(
  "/cfops",
  ...catalogRead,
  validateSchema({ query: listNfeCatalogQuerySchema }),
  nfeController.listCfops,
);
nfeRouter.get(
  "/cfops/:catalogId",
  ...catalogRead,
  validateSchema({ params: nfeCatalogIdParamsSchema, query: emptyQuerySchema }),
  nfeController.getCfop,
);
nfeRouter.get(
  "/document-models",
  ...catalogRead,
  validateSchema({ query: listNfeCatalogQuerySchema }),
  nfeController.listDocumentModels,
);
nfeRouter.get(
  "/document-models/:catalogId",
  ...catalogRead,
  validateSchema({ params: nfeCatalogIdParamsSchema, query: emptyQuerySchema }),
  nfeController.getDocumentModel,
);
nfeRouter.get(
  "/cst",
  ...catalogRead,
  validateSchema({ query: listNfeCatalogQuerySchema }),
  nfeController.listCst,
);
nfeRouter.get(
  "/cst/:catalogId",
  ...catalogRead,
  validateSchema({ params: nfeCatalogIdParamsSchema, query: emptyQuerySchema }),
  nfeController.getCst,
);
nfeRouter.get(
  "/benefit-codes",
  ...catalogRead,
  validateSchema({ query: listBenefitCodesQuerySchema }),
  nfeController.listBenefitCodes,
);
nfeRouter.get(
  "/benefit-codes/:catalogId",
  ...catalogRead,
  validateSchema({ params: nfeCatalogIdParamsSchema, query: emptyQuerySchema }),
  nfeController.getBenefitCode,
);
nfeRouter.get(
  "/cst-ibs-cbs",
  ...catalogRead,
  validateSchema({ query: listNfeCatalogQuerySchema }),
  nfeController.listCstIbsCbs,
);
nfeRouter.get(
  "/cst-ibs-cbs/:catalogId",
  ...catalogRead,
  validateSchema({ params: nfeCatalogIdParamsSchema, query: emptyQuerySchema }),
  nfeController.getCstIbsCbs,
);
nfeRouter.get(
  "/classification-ibs-cbs",
  ...catalogRead,
  validateSchema({ query: listNfeCatalogQuerySchema }),
  nfeController.listClassification,
);
nfeRouter.get(
  "/classification-ibs-cbs/:catalogId",
  ...catalogRead,
  validateSchema({ params: nfeCatalogIdParamsSchema, query: emptyQuerySchema }),
  nfeController.getClassification,
);
nfeRouter.get(
  "/presumed-credits",
  ...catalogRead,
  validateSchema({ query: listNfeCatalogQuerySchema }),
  nfeController.listPresumedCredits,
);
nfeRouter.get(
  "/presumed-credits/:catalogId",
  ...catalogRead,
  validateSchema({ params: nfeCatalogIdParamsSchema, query: emptyQuerySchema }),
  nfeController.getPresumedCredit,
);
nfeRouter.get(
  "/anexos-rt",
  ...catalogRead,
  validateSchema({ query: listNfeCatalogQuerySchema }),
  nfeController.listAnexos,
);
nfeRouter.get(
  "/anexos-rt/:catalogId",
  ...catalogRead,
  validateSchema({ params: nfeCatalogIdParamsSchema, query: emptyQuerySchema }),
  nfeController.getAnexo,
);
nfeRouter.get(
  "/cfops-enterprises",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_nfe"),
  validateSchema({ query: emptyQuerySchema }),
  nfeController.listCfopsEnterprises,
);
nfeRouter.post(
  "/cfops-enterprises",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({ body: linkCfopEnterpriseSchema, query: emptyQuerySchema }),
  nfeController.linkCfopEnterprise,
);

nfeRouter.get(
  "/status-servico",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_status_sefaz"),
  validateSchema({ query: statusServicoQuerySchema }),
  nfeController.statusServico,
);

nfeRouter.get(
  "/consulta-cadastro",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_status_sefaz"),
  validateSchema({ query: consultaCadastroQuerySchema }),
  nfeController.consultaCadastro,
);

nfeRouter.get(
  "/operations",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_nfe"),
  validateSchema({ query: emptyQuerySchema }),
  nfeController.listOperations,
);
nfeRouter.get(
  "/operations/:operationId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_nfe"),
  validateSchema({ params: nfeOperationIdParamsSchema, query: emptyQuerySchema }),
  nfeController.getOperation,
);
nfeRouter.post(
  "/operations",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_nfe"),
  validateSchema({ body: createNfeOperationSchema, query: emptyQuerySchema }),
  nfeController.createOperation,
);
nfeRouter.patch(
  "/operations/:operationId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({
    params: nfeOperationIdParamsSchema,
    body: patchNfeOperationSchema,
    query: emptyQuerySchema,
  }),
  nfeController.patchOperation,
);
nfeRouter.delete(
  "/operations/:operationId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({ params: nfeOperationIdParamsSchema, query: emptyQuerySchema }),
  nfeController.deleteOperation,
);

nfeRouter.get(
  "/operations-states",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_nfe"),
  validateSchema({ query: emptyQuerySchema }),
  nfeController.listOperationStates,
);
nfeRouter.get(
  "/operations-states/:operationStateId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_nfe"),
  validateSchema({ params: nfeOperationStateIdParamsSchema, query: emptyQuerySchema }),
  nfeController.getOperationState,
);
nfeRouter.post(
  "/operations-states",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_nfe"),
  validateSchema({ body: createNfeOperationStateSchema, query: emptyQuerySchema }),
  nfeController.createOperationState,
);
nfeRouter.patch(
  "/operations-states/:operationStateId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({
    params: nfeOperationStateIdParamsSchema,
    body: patchNfeOperationStateSchema,
    query: emptyQuerySchema,
  }),
  nfeController.patchOperationState,
);
nfeRouter.delete(
  "/operations-states/:operationStateId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({ params: nfeOperationStateIdParamsSchema, query: emptyQuerySchema }),
  nfeController.deleteOperationState,
);

const benefitRead = [authMiddleware, tenantMiddleware, requirePermission("consultar_nfe")] as const;
const benefitCreate = [authMiddleware, tenantMiddleware, requirePermission("incluir_nfe")] as const;
const benefitWrite = [authMiddleware, tenantMiddleware, requirePermission("alterar_nfe")] as const;

nfeRouter.get(
  "/benefits-cfop",
  ...benefitRead,
  validateSchema({ query: listBenefitsCfopQuerySchema }),
  nfeController.listBenefitsCfop,
);
nfeRouter.get(
  "/benefits-cfop/:benefitCfopId",
  ...benefitRead,
  validateSchema({ params: benefitCfopIdParamsSchema, query: emptyQuerySchema }),
  nfeController.getBenefitCfop,
);
nfeRouter.post(
  "/benefits-cfop",
  ...benefitCreate,
  validateSchema({ body: createBenefitCfopSchema, query: emptyQuerySchema }),
  nfeController.createBenefitCfop,
);
nfeRouter.patch(
  "/benefits-cfop/:benefitCfopId",
  ...benefitWrite,
  validateSchema({
    params: benefitCfopIdParamsSchema,
    body: patchBenefitCfopSchema,
    query: emptyQuerySchema,
  }),
  nfeController.patchBenefitCfop,
);
nfeRouter.delete(
  "/benefits-cfop/:benefitCfopId",
  ...benefitWrite,
  validateSchema({ params: benefitCfopIdParamsSchema, query: emptyQuerySchema }),
  nfeController.deleteBenefitCfop,
);

nfeRouter.get(
  "/benefits-customer-types",
  ...benefitRead,
  validateSchema({ query: listBenefitsCustomerTypeQuerySchema }),
  nfeController.listBenefitsCustomerType,
);
nfeRouter.get(
  "/benefits-customer-types/:benefitCustomerTypeId",
  ...benefitRead,
  validateSchema({
    params: benefitCustomerTypeIdParamsSchema,
    query: emptyQuerySchema,
  }),
  nfeController.getBenefitCustomerType,
);
nfeRouter.post(
  "/benefits-customer-types",
  ...benefitCreate,
  validateSchema({ body: createBenefitCustomerTypeSchema, query: emptyQuerySchema }),
  nfeController.createBenefitCustomerType,
);
nfeRouter.patch(
  "/benefits-customer-types/:benefitCustomerTypeId",
  ...benefitWrite,
  validateSchema({
    params: benefitCustomerTypeIdParamsSchema,
    body: patchBenefitCustomerTypeSchema,
    query: emptyQuerySchema,
  }),
  nfeController.patchBenefitCustomerType,
);
nfeRouter.delete(
  "/benefits-customer-types/:benefitCustomerTypeId",
  ...benefitWrite,
  validateSchema({
    params: benefitCustomerTypeIdParamsSchema,
    query: emptyQuerySchema,
  }),
  nfeController.deleteBenefitCustomerType,
);

nfeRouter.get(
  "/benefits-state-products",
  ...benefitRead,
  validateSchema({ query: listBenefitsStateProductQuerySchema }),
  nfeController.listBenefitsStateProduct,
);
nfeRouter.get(
  "/benefits-state-products/:benefitStateProductId",
  ...benefitRead,
  validateSchema({
    params: benefitStateProductIdParamsSchema,
    query: emptyQuerySchema,
  }),
  nfeController.getBenefitStateProduct,
);
nfeRouter.post(
  "/benefits-state-products",
  ...benefitCreate,
  validateSchema({ body: createBenefitStateProductSchema, query: emptyQuerySchema }),
  nfeController.createBenefitStateProduct,
);
nfeRouter.patch(
  "/benefits-state-products/:benefitStateProductId",
  ...benefitWrite,
  validateSchema({
    params: benefitStateProductIdParamsSchema,
    body: patchBenefitStateProductSchema,
    query: emptyQuerySchema,
  }),
  nfeController.patchBenefitStateProduct,
);
nfeRouter.delete(
  "/benefits-state-products/:benefitStateProductId",
  ...benefitWrite,
  validateSchema({
    params: benefitStateProductIdParamsSchema,
    query: emptyQuerySchema,
  }),
  nfeController.deleteBenefitStateProduct,
);

nfeRouter.post(
  "/from-sales",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_nfe"),
  validateSchema({ body: createNfeFromSalesSchema, query: emptyQuerySchema }),
  nfeController.createNfeFromSales,
);
nfeRouter.post(
  "/inutilizar",
  authMiddleware,
  tenantMiddleware,
  requirePermission("inutilizar_nfe"),
  validateSchema({ body: inutilizeNfeRangeSchema, query: emptyQuerySchema }),
  nfeEventsController.inutilizeRange,
);
nfeRouter.get(
  "/eventos",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_nfe"),
  validateSchema({ query: listNfeEventsQuerySchema }),
  nfeEventsController.listEvents,
);
nfeRouter.get(
  "/inutilizacoes",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_nfe"),
  validateSchema({ query: listInutilizationsQuerySchema }),
  nfeEventsController.listInutilizations,
);
nfeRouter.get(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_nfe"),
  validateSchema({ query: listNfeQuerySchema }),
  nfeController.listNfe,
);
nfeRouter.post(
  "/",
  authMiddleware,
  tenantMiddleware,
  requirePermission("incluir_nfe"),
  validateSchema({ body: createNfeSchema, query: emptyQuerySchema }),
  nfeController.createNfe,
);
nfeRouter.get(
  "/:nfeId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_nfe"),
  validateSchema({ params: nfeIdParamsSchema, query: emptyQuerySchema }),
  nfeController.getNfe,
);
nfeRouter.patch(
  "/:nfeId",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: patchNfeSchema,
    query: emptyQuerySchema,
  }),
  nfeController.patchNfe,
);
nfeRouter.post(
  "/:nfeId/items/recalculate",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: recalculateNfeItemsSchema,
    query: emptyQuerySchema,
  }),
  nfeController.recalculateItems,
);
nfeRouter.put(
  "/:nfeId/items",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: replaceNfeItemsSchema,
    query: emptyQuerySchema,
  }),
  nfeController.replaceItems,
);
nfeRouter.put(
  "/:nfeId/transport",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: replaceNfeTransportSchema,
    query: emptyQuerySchema,
  }),
  nfeController.replaceTransport,
);
nfeRouter.put(
  "/:nfeId/payments",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: replaceNfePaymentsSchema,
    query: emptyQuerySchema,
  }),
  nfeController.replacePayments,
);
nfeRouter.put(
  "/:nfeId/duplicates",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: replaceNfeDuplicatesSchema,
    query: emptyQuerySchema,
  }),
  nfeController.replaceDuplicates,
);
nfeRouter.post(
  "/:nfeId/calcular",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  nfeController.calculate,
);
nfeRouter.get(
  "/:nfeId/danfe",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    query: danfePrintQuerySchema,
  }),
  nfeController.danfe,
);
nfeRouter.post(
  "/:nfeId/xml",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  nfeController.xml,
);
nfeRouter.post(
  "/:nfeId/assinar",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  nfeController.signXml,
);
nfeRouter.post(
  "/:nfeId/autorizar",
  authMiddleware,
  tenantMiddleware,
  requirePermission("alterar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
  }),
  nfeController.authorize,
);
nfeRouter.post(
  "/:nfeId/cancelar",
  authMiddleware,
  tenantMiddleware,
  requirePermission("cancelar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: cancelNfeSchema,
    query: emptyQuerySchema,
  }),
  nfeEventsController.cancel,
);
nfeRouter.post(
  "/:nfeId/cancelar-substituicao",
  authMiddleware,
  tenantMiddleware,
  requirePermission("cancelar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: cancelNfeBySubstitutionSchema,
    query: emptyQuerySchema,
  }),
  nfeEventsController.cancelBySubstitution,
);
nfeRouter.post(
  "/:nfeId/inutilizar",
  authMiddleware,
  tenantMiddleware,
  requirePermission("inutilizar_nfe"),
  validateSchema({
    params: nfeIdParamsSchema,
    body: inutilizeNfeNoteSchema,
    query: emptyQuerySchema,
  }),
  nfeEventsController.inutilizeNote,
);
nfeRouter.get(
  "/:nfeId/eventos",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_nfe"),
  validateSchema({ params: nfeIdParamsSchema, query: emptyQuerySchema }),
  nfeEventsController.listByNfe,
);

export { nfeRouter };
