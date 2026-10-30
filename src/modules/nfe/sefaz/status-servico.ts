import { env } from "../../../config/env.js";
import {
  STATUS_SERVICO_SOAP_ACTION,
  resolveStatusServicoUrl,
} from "./endpoints.js";
import { postSefazSoap } from "./soap-client.js";
import type { LoadedClientCert } from "./certificate.js";
import type { NfeModelo, SefazAmbiente } from "./types.js";
import type { UfSigla } from "./uf.js";
import { getCufFromUf } from "./uf.js";
import {
  buildConsStatServXml,
  buildStatusServicoSoapEnvelope,
  parseRetConsStatServ,
  type StatusServicoResponse,
} from "./xml.js";

export const consultarStatusServico = async (input: {
  uf: UfSigla;
  modelo: NfeModelo;
  ambiente: SefazAmbiente;
  certificate: LoadedClientCert;
}): Promise<StatusServicoResponse> => {
  const url = resolveStatusServicoUrl({
    uf: input.uf,
    modelo: input.modelo,
    ambiente: input.ambiente,
  });
  const consStatServXml = buildConsStatServXml({
    ambiente: input.ambiente,
    cUF: getCufFromUf(input.uf),
  });
  const envelope = buildStatusServicoSoapEnvelope(consStatServXml);
  const soapXml = await postSefazSoap({
    url,
    envelope,
    soapAction: STATUS_SERVICO_SOAP_ACTION,
    certificate: input.certificate,
    timeoutMs: env.NFE_TIMEOUT_MS,
  });
  const parsed = parseRetConsStatServ(soapXml);

  return {
    ...parsed,
    uf: input.uf,
    modelo: input.modelo,
  };
};
