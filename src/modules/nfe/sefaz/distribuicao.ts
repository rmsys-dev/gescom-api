import { env } from "../../../config/env.js";
import type { LoadedClientCert } from "./certificate.js";
import {
  DISTRIBUICAO_DFE_SOAP_ACTION,
  resolveDistribuicaoDfeUrl,
} from "./endpoints.js";
import { postSefazSoap } from "./soap-client.js";
import {
  buildDistDFeEnvelope,
  parseRetDistDFe,
  type DistDfeParsed,
} from "./distribuicao-xml.js";

export const consultarDistribuicaoDfe = async (input: {
  ambiente: 1 | 2;
  cUfAutor: string;
  cnpj: string;
  certificate: LoadedClientCert;
  chave?: string;
  ultNsu?: string;
}): Promise<DistDfeParsed> => {
  const envelope = buildDistDFeEnvelope({
    tpAmb: input.ambiente,
    cUfAutor: input.cUfAutor,
    cnpj: input.cnpj,
    chave: input.chave,
    ultNsu: input.ultNsu,
  });
  const soapXml = await postSefazSoap({
    url: resolveDistribuicaoDfeUrl(input.ambiente),
    envelope,
    soapAction: DISTRIBUICAO_DFE_SOAP_ACTION,
    certificate: input.certificate,
    timeoutMs: Math.max(env.NFE_TIMEOUT_MS, 60_000),
  });
  return parseRetDistDFe(soapXml);
};
