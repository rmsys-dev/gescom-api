import { env } from "../../../config/env.js";
import {
  RECEPCAO_EVENTO_SOAP_ACTION,
  RECEPCAO_EVENTO_SOAP_NAMESPACE,
  resolveRecepcaoEventoUrl,
} from "./endpoints.js";
import { postSefazSoap } from "./soap-client.js";
import { buildSoap12Envelope } from "./soap-parse.js";
import type { LoadedClientCert } from "./certificate.js";
import type { NfeModelo, SefazAmbiente } from "./types.js";
import type { UfSigla } from "./uf.js";
import {
  buildEnvEventoXml,
  parseRetEnvEvento,
  type EventoParsed,
} from "./evento-xml.js";

export const enviarEvento = async (input: {
  uf: UfSigla;
  modelo: NfeModelo;
  ambiente: SefazAmbiente;
  idLote: string;
  signedEventoXml: string;
  certificate: LoadedClientCert;
}): Promise<EventoParsed> => {
  const url = resolveRecepcaoEventoUrl({
    uf: input.uf,
    modelo: input.modelo,
    ambiente: input.ambiente,
  });
  const envelope = buildSoap12Envelope(
    RECEPCAO_EVENTO_SOAP_NAMESPACE,
    buildEnvEventoXml(input.signedEventoXml, input.idLote),
  );
  const soapXml = await postSefazSoap({
    url,
    envelope,
    soapAction: RECEPCAO_EVENTO_SOAP_ACTION,
    certificate: input.certificate,
    timeoutMs: env.NFE_TIMEOUT_MS,
  });
  return parseRetEnvEvento(soapXml);
};
