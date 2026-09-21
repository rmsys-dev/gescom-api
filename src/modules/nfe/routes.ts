import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth-middleware.js";
import { requirePermission } from "../../shared/middleware/permission-middleware.js";
import { tenantMiddleware } from "../../shared/middleware/tenant-middleware.js";
import { validateSchema } from "../../shared/middleware/validate-schema.js";
import { emptyQuerySchema } from "../../shared/validation/common-schemas.js";
import { nfeController } from "./controller.js";
import { patchNfeConfiguracaoSchema } from "./configuracao/schema.js";
import { nfePfxUpload } from "./configuracao/upload.js";
import { statusServicoQuerySchema } from "./schema.js";

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

nfeRouter.get(
  "/status-servico",
  authMiddleware,
  tenantMiddleware,
  requirePermission("consultar_status_sefaz"),
  validateSchema({ query: statusServicoQuerySchema }),
  nfeController.statusServico,
);

export { nfeRouter };
