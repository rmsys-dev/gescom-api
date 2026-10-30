import { gunzipSync } from "node:zlib";
import { BadRequestError } from "../../../shared/errors/app-error.js";
import { DISTRIBUICAO_DFE_SOAP_NAMESPACE } from "./endpoints.js";
import { NFE_XMLNS, asRecord, buildSoap12Document, findNode, textOf, parseSoapResponse } from "./soap-parse.js";

export type DfeDocZip = {
  schema: string | undefined;
  xml: string;
};

export type DistDfeParsed = {
  cStat: string;
  xMotivo: string;
  ultNsu: string | null;
  maxNsu: string | null;
  documentos: DfeDocZip[];
};

const nsu15 = (value: string | undefined): string | null => {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return digits.padStart(15, "0").slice(-15);
};

export const buildDistDFeIntXml = (input: {
  tpAmb: 1 | 2;
  cUfAutor: string;
  cnpj: string;
  chave?: string;
  ultNsu?: string;
}): string => {
  const consulta = input.chave
    ? `<consChNFe><chNFe>${input.chave}</chNFe></consChNFe>`
    : `<distNSU><ultNSU>${nsu15(input.ultNsu) ?? "000000000000000"}</ultNSU></distNSU>`;
  return (
    `<distDFeInt xmlns="${NFE_XMLNS}" versao="1.01">` +
    `<tpAmb>${input.tpAmb}</tpAmb>` +
    `<cUFAutor>${input.cUfAutor}</cUFAutor>` +
    `<CNPJ>${input.cnpj}</CNPJ>` +
    consulta +
    `</distDFeInt>`
  );
};

/** A operação do WSDL é nfeDistDFeInteresse; nfeDadosMsg fica dentro dela. */
export const buildDistDFeEnvelope = (input: {
  tpAmb: 1 | 2;
  cUfAutor: string;
  cnpj: string;
  chave?: string;
  ultNsu?: string;
}): string =>
  buildSoap12Document(
    `<nfeDistDFeInteresse xmlns="${DISTRIBUICAO_DFE_SOAP_NAMESPACE}">` +
      `<nfeDadosMsg>` +
      buildDistDFeIntXml(input) +
      `</nfeDadosMsg>` +
      `</nfeDistDFeInteresse>`,
  );

export const decodeDocZip = (payload: string): string => {
  try {
    return gunzipSync(Buffer.from(payload, "base64")).toString("utf8");
  } catch {
    throw new BadRequestError(
      "A SEFAZ devolveu um documento DF-e que nao foi possivel abrir",
      "NFE_DFE_XML_INVALID",
    );
  }
};

const docNodes = (lote: unknown): unknown[] => {
  const zip = asRecord(lote)?.docZip ?? findNode(lote, "docZip");
  if (zip === undefined || zip === null) return [];
  return Array.isArray(zip) ? zip : [zip];
};

export const parseRetDistDFe = (soapXml: string): DistDfeParsed => {
  const parsed = parseSoapResponse(soapXml, "distribuicao de DF-e");
  const ret = findNode(parsed, "retDistDFeInt") ?? parsed;
  const cStat = textOf(findNode(ret, "cStat")) ?? "";
  const xMotivo = textOf(findNode(ret, "xMotivo")) ?? "";
  if (!cStat) {
    throw new BadRequestError(
      "A SEFAZ nao devolveu o resultado da distribuicao de DF-e",
      "NFE_DFE_REJECTED",
    );
  }
  const documentos = docNodes(findNode(ret, "loteDistDFeInt")).flatMap((node) => {
    const record = asRecord(node);
    const payload = record ? textOf(record["#text"]) ?? textOf(node) : textOf(node);
    if (!payload) return [];
    return [
      {
        schema: record ? textOf(record["@_schema"]) : undefined,
        xml: decodeDocZip(payload),
      },
    ];
  });
  return {
    cStat,
    xMotivo,
    ultNsu: nsu15(textOf(findNode(ret, "ultNSU"))),
    maxNsu: nsu15(textOf(findNode(ret, "maxNSU"))),
    documentos,
  };
};
