import { sefazUnavailableError } from "./errors.js";
import {
  NFE_XMLNS,
  asRecord,
  escapeXmlText,
  extractElementXml,
  findNode,
  parseSoapResponse,
  stripXmlDeclaration,
  textOf,
} from "./soap-parse.js";

const EVENTO_VERSION = "1.00";

export const TP_EVENTO_CANCELAMENTO = "110111";
export const TP_EVENTO_CANCELAMENTO_SUBSTITUICAO = "110112";
export const TP_EVENTO_CARTA_CORRECAO = "110110";

/** Texto fixo exigido pelo leiaute da CC-e; qualquer diferenca gera rejeicao. */
export const X_COND_USO_CCE =
  "A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, " +
  "de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido " +
  "na emissao de documento fiscal, desde que o erro nao esteja relacionado com: " +
  "I - as variaveis que determinam o valor do imposto tais como: base de calculo, " +
  "aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; " +
  "II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; " +
  "III - a data de emissao ou de saida.";

/** 135 vinculado a NF-e, 136 nao vinculado, 155 cancelamento homologado fora de prazo. */
const REGISTERED = new Set(["135", "136", "155"]);

export type EventoDetalhe =
  | {
      tpEvento: typeof TP_EVENTO_CANCELAMENTO;
      nProt: string;
      xJust: string;
    }
  | {
      tpEvento: typeof TP_EVENTO_CANCELAMENTO_SUBSTITUICAO;
      cOrgaoAutor: string;
      verAplic: string;
      nProt: string;
      xJust: string;
      chNFeRef: string;
    }
  | {
      tpEvento: typeof TP_EVENTO_CARTA_CORRECAO;
      xCorrecao: string;
    };

export type EventoInput = {
  cOrgao: string;
  tpAmb: 1 | 2;
  cnpj: string;
  chNFe: string;
  dhEvento: string;
  nSeqEvento: number;
  detalhe: EventoDetalhe;
};

export type EventoParsed = {
  cStat: string;
  xMotivo: string;
  nProt?: string;
  dhRegEvento?: string;
  retEventoXml?: string;
  registered: boolean;
};

export const eventoId = (
  tpEvento: string,
  chNFe: string,
  nSeqEvento: number,
): string => `ID${tpEvento}${chNFe}${String(nSeqEvento).padStart(2, "0")}`;

const tag = (name: string, value: string | number): string =>
  `<${name}>${escapeXmlText(String(value))}</${name}>`;

const detEventoXml = (detalhe: EventoDetalhe): string => {
  switch (detalhe.tpEvento) {
    case TP_EVENTO_CANCELAMENTO:
      return (
        `<detEvento versao="${EVENTO_VERSION}">` +
        tag("descEvento", "Cancelamento") +
        tag("nProt", detalhe.nProt) +
        tag("xJust", detalhe.xJust) +
        `</detEvento>`
      );
    case TP_EVENTO_CANCELAMENTO_SUBSTITUICAO:
      return (
        `<detEvento versao="${EVENTO_VERSION}">` +
        tag("descEvento", "Cancelamento por substituicao") +
        tag("cOrgaoAutor", detalhe.cOrgaoAutor) +
        tag("tpAutor", 1) +
        tag("verAplic", detalhe.verAplic) +
        tag("nProt", detalhe.nProt) +
        tag("xJust", detalhe.xJust) +
        tag("chNFeRef", detalhe.chNFeRef) +
        `</detEvento>`
      );
    case TP_EVENTO_CARTA_CORRECAO:
      return (
        `<detEvento versao="${EVENTO_VERSION}">` +
        tag("descEvento", "Carta de Correcao") +
        tag("xCorrecao", detalhe.xCorrecao) +
        tag("xCondUso", X_COND_USO_CCE) +
        `</detEvento>`
      );
  }
};

/** `evento` ainda sem assinatura; a assinatura entra logo apos o infEvento. */
export const buildEventoXml = (input: EventoInput): string =>
  `<evento xmlns="${NFE_XMLNS}" versao="${EVENTO_VERSION}">` +
  `<infEvento Id="${eventoId(input.detalhe.tpEvento, input.chNFe, input.nSeqEvento)}">` +
  tag("cOrgao", input.cOrgao) +
  tag("tpAmb", input.tpAmb) +
  tag("CNPJ", input.cnpj) +
  tag("chNFe", input.chNFe) +
  tag("dhEvento", input.dhEvento) +
  tag("tpEvento", input.detalhe.tpEvento) +
  tag("nSeqEvento", input.nSeqEvento) +
  tag("verEvento", EVENTO_VERSION) +
  detEventoXml(input.detalhe) +
  `</infEvento>` +
  `</evento>`;

export const buildEnvEventoXml = (
  signedEventoXml: string,
  idLote: string,
): string => {
  const lote = idLote.replace(/\D/g, "").slice(0, 15) || "1";
  return (
    `<envEvento xmlns="${NFE_XMLNS}" versao="${EVENTO_VERSION}">` +
    `<idLote>${lote}</idLote>` +
    stripXmlDeclaration(signedEventoXml) +
    `</envEvento>`
  );
};

export const buildProcEventoNFeXml = (
  signedEventoXml: string,
  retEventoXml: string,
): string =>
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<procEventoNFe xmlns="${NFE_XMLNS}" versao="${EVENTO_VERSION}">` +
  stripXmlDeclaration(signedEventoXml) +
  retEventoXml +
  `</procEventoNFe>`;

export const parseRetEnvEvento = (soapXml: string): EventoParsed => {
  const parsed = parseSoapResponse(soapXml, "recepcao de evento");
  const retEvento = findNode(parsed, "retEvento");
  const infEvento = asRecord(findNode(retEvento, "infEvento"));
  const lote = asRecord(findNode(parsed, "retEnvEvento"));
  const cStat = textOf(infEvento?.cStat) ?? textOf(lote?.cStat);
  const xMotivo = textOf(infEvento?.xMotivo) ?? textOf(lote?.xMotivo);
  if (!cStat || !xMotivo) {
    throw sefazUnavailableError(
      "Nao foi possivel interpretar o retorno do evento da SEFAZ",
    );
  }
  return {
    cStat,
    xMotivo,
    nProt: textOf(infEvento?.nProt),
    dhRegEvento: textOf(infEvento?.dhRegEvento),
    retEventoXml: extractElementXml(soapXml, "retEvento"),
    registered: infEvento !== undefined && REGISTERED.has(cStat),
  };
};
