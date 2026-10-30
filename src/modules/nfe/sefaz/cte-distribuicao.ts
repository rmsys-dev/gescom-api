import { env } from "../../../config/env.js";
import type { LoadedClientCert } from "./certificate.js";
import {
  CTE_DISTRIBUICAO_DFE_SOAP_ACTION,
  CTE_DISTRIBUICAO_DFE_SOAP_NAMESPACE,
  CTE_XMLNS,
  resolveCteDistribuicaoDfeUrl,
} from "./endpoints.js";
import { postSefazSoap } from "./soap-client.js";
import { buildSoap12Document } from "./soap-parse.js";
import { parseRetDistDFe, type DistDfeParsed } from "./distribuicao-xml.js";

const nsu15 = (value: string | undefined): string => {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return "000000000000000";
  return digits.padStart(15, "0").slice(-15);
};

const buildCteDistEnvelope = (input: {
  tpAmb: 1 | 2;
  cUfAutor: string;
  cnpj: string;
  ultNsu?: string;
}): string => {
  const dist =
    `<distDFeInt xmlns="${CTE_XMLNS}" versao="1.00">` +
    `<tpAmb>${input.tpAmb}</tpAmb>` +
    `<cUFAutor>${input.cUfAutor}</cUFAutor>` +
    `<CNPJ>${input.cnpj}</CNPJ>` +
    `<distNSU><ultNSU>${nsu15(input.ultNsu)}</ultNSU></distNSU>` +
    `</distDFeInt>`;
  return buildSoap12Document(
    `<cteDistDFeInteresse xmlns="${CTE_DISTRIBUICAO_DFE_SOAP_NAMESPACE}">` +
      `<cteDadosMsg>${dist}</cteDadosMsg>` +
      `</cteDistDFeInteresse>`,
  );
};

export const consultarDistribuicaoCte = async (input: {
  ambiente: 1 | 2;
  cUfAutor: string;
  cnpj: string;
  certificate: LoadedClientCert;
  ultNsu?: string;
}): Promise<DistDfeParsed> => {
  const envelope = buildCteDistEnvelope({
    tpAmb: input.ambiente,
    cUfAutor: input.cUfAutor,
    cnpj: input.cnpj,
    ultNsu: input.ultNsu,
  });
  const soapXml = await postSefazSoap({
    url: resolveCteDistribuicaoDfeUrl(input.ambiente),
    envelope,
    soapAction: CTE_DISTRIBUICAO_DFE_SOAP_ACTION,
    certificate: input.certificate,
    timeoutMs: Math.max(env.NFE_TIMEOUT_MS, 60_000),
  });
  return parseRetDistDFe(soapXml);
};
