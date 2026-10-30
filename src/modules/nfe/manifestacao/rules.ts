import type { NfeManifestationType } from "../../../db/enums.js";
import {
  BadRequestError,
  ConflictError,
} from "../../../shared/errors/app-error.js";
import { isValidNfeAccessKey } from "../sefaz/access-key.js";
import {
  TP_EVENTO_CIENCIA_OPERACAO,
  TP_EVENTO_CONFIRMACAO_OPERACAO,
  TP_EVENTO_DESCONHECIMENTO_OPERACAO,
  TP_EVENTO_OPERACAO_NAO_REALIZADA,
  type ManifestacaoTpEvento,
} from "../sefaz/evento-xml.js";

export const MANIFESTACAO_TP_EVENTO = {
  CIENCIA: TP_EVENTO_CIENCIA_OPERACAO,
  CONFIRMACAO: TP_EVENTO_CONFIRMACAO_OPERACAO,
  DESCONHECIMENTO: TP_EVENTO_DESCONHECIMENTO_OPERACAO,
  OPERACAO_NAO_REALIZADA: TP_EVENTO_OPERACAO_NAO_REALIZADA,
} as const satisfies Record<NfeManifestationType, ManifestacaoTpEvento>;

const EVENTOS_FINAIS = new Set<NfeManifestationType>([
  "CONFIRMACAO",
  "DESCONHECIMENTO",
  "OPERACAO_NAO_REALIZADA",
]);

/** Chave de NF-e modelo 55, com o CNPJ do emitente lido das posições 7 a 20. */
export const parseChaveManifestacao = (
  chave: string,
): { chave: string; emitCnpj: string } => {
  if (!isValidNfeAccessKey(chave)) {
    throw new BadRequestError("Chave de acesso invalida", "NFE_ACCESS_KEY_INVALID");
  }
  if (chave.slice(20, 22) !== "55") {
    throw new BadRequestError(
      "Manifestacao do destinatario vale apenas para NF-e modelo 55",
      "NFE_MANIFESTACAO_MODEL",
    );
  }
  return { chave, emitCnpj: chave.slice(6, 20) };
};

/**
 * Ciência pode ser o primeiro evento. Confirmação, desconhecimento e operação
 * não realizada encerram a chave: outro tipo, inclusive nova ciência, é recusado.
 */
export const assertManifestacaoPermitida = (
  existentes: readonly NfeManifestationType[],
  solicitado: NfeManifestationType,
): void => {
  if (existentes.includes(solicitado)) {
    throw new ConflictError(
      "Esta manifestacao ja foi registrada para a chave",
      "NFE_MANIFESTACAO_DUPLICADA",
    );
  }
  if (existentes.some((tipo) => EVENTOS_FINAIS.has(tipo))) {
    throw new ConflictError(
      "A chave ja tem um evento final de manifestacao",
      "NFE_MANIFESTACAO_FINAL",
    );
  }
};
