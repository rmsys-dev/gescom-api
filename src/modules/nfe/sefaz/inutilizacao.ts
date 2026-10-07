import { env } from "../../../config/env.js";
import {
  INUTILIZACAO_SOAP_ACTION,
  INUTILIZACAO_SOAP_NAMESPACE,
  resolveInutilizacaoUrl,
} from "./endpoints.js";
import { postSefazSoap } from "./soap-client.js";
import { buildSoap12Envelope } from "./soap-parse.js";
import type { LoadedClientCert } from "./certificate.js";
import type { NfeModelo, SefazAmbiente } from "./types.js";
import type { UfSigla } from "./uf.js";
import {
  parseRetInutNFe,
  type InutilizacaoParsed,
} from "./inutilizacao-xml.js";

export const inutilizarNumeracao = async (input: {
  uf: UfSigla;
  modelo: NfeModelo;
  ambiente: SefazAmbiente;
  signedInutXml: string;
  certificate: LoadedClientCert;
}): Promise<InutilizacaoParsed> => {
  const url = resolveInutilizacaoUrl({
    uf: input.uf,
    modelo: input.modelo,
    ambiente: input.ambiente,
  });
  const soapXml = await postSefazSoap({
    url,
    envelope: buildSoap12Envelope(
      INUTILIZACAO_SOAP_NAMESPACE,
      input.signedInutXml,
    ),
    soapAction: INUTILIZACAO_SOAP_ACTION,
    certificate: input.certificate,
    timeoutMs: env.NFE_TIMEOUT_MS,
  });
  return parseRetInutNFe(soapXml);
};
