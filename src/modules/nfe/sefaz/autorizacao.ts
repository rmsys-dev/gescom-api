import { env } from "../../../config/env.js";
import {
  AUTORIZACAO_SOAP_ACTION,
  resolveAutorizacaoUrl,
} from "./endpoints.js";
import { postSefazSoap } from "./soap-client.js";
import type { LoadedClientCert } from "./certificate.js";
import type { NfeModelo, SefazAmbiente } from "./types.js";
import type { UfSigla } from "./uf.js";
import {
  buildAutorizacaoSoapEnvelope,
  buildEnviNFeXml,
  parseRetEnviNFe,
  type AutorizacaoParsed,
} from "./autorizacao-xml.js";

export const autorizarNfe = async (input: {
  uf: UfSigla;
  modelo: NfeModelo;
  ambiente: SefazAmbiente;
  idLote: string;
  signedXml: string;
  certificate: LoadedClientCert;
}): Promise<AutorizacaoParsed> => {
  const url = resolveAutorizacaoUrl({
    uf: input.uf,
    modelo: input.modelo,
    ambiente: input.ambiente,
  });
  const envelope = buildAutorizacaoSoapEnvelope(
    buildEnviNFeXml(input.signedXml, input.idLote),
  );
  const soapXml = await postSefazSoap({
    url,
    envelope,
    soapAction: AUTORIZACAO_SOAP_ACTION,
    certificate: input.certificate,
    timeoutMs: env.NFE_TIMEOUT_MS,
  });
  return parseRetEnviNFe(soapXml);
};
