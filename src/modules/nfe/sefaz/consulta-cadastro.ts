import { env } from "../../../config/env.js";
import {
  CONSULTA_CADASTRO_SOAP_ACTION,
  resolveConsultaCadastroUrl,
} from "./endpoints.js";
import { postSefazSoap } from "./soap-client.js";
import type { LoadedClientCert } from "./certificate.js";
import type { SefazAmbiente } from "./types.js";
import type { UfSigla } from "./uf.js";
import {
  buildConsCadXml,
  buildConsultaCadastroSoapEnvelope,
  parseRetConsCad,
  type ConsultaCadastroDocumento,
  type ConsultaCadastroParsed,
} from "./consulta-cadastro-xml.js";

export type ConsultaCadastroResponse = ConsultaCadastroParsed & {
  uf: string;
};

export const consultarCadastro = async (input: {
  uf: UfSigla;
  documento: ConsultaCadastroDocumento;
  ambiente: SefazAmbiente;
  certificate: LoadedClientCert;
}): Promise<ConsultaCadastroResponse> => {
  const url = resolveConsultaCadastroUrl({
    uf: input.uf,
    ambiente: input.ambiente,
  });
  const envelope = buildConsultaCadastroSoapEnvelope(
    buildConsCadXml({ uf: input.uf, documento: input.documento }),
  );
  const soapXml = await postSefazSoap({
    url,
    envelope,
    soapAction: CONSULTA_CADASTRO_SOAP_ACTION,
    certificate: input.certificate,
    timeoutMs: env.NFE_TIMEOUT_MS,
  });
  const parsed = parseRetConsCad(soapXml);
  return { ...parsed, uf: parsed.uf ?? input.uf };
};
