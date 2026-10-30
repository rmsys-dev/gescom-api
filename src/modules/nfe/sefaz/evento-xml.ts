import { sefazUnavailableError } from "./errors.js";
import {
  NFE_XMLNS,
  asRecord,
  escapeXmlText,
  extractElementXml,
  findNode,
  materializeSefazXml,
  parseSoapResponse,
  sefazResponseHint,
  stripXmlDeclaration,
  textOf,
} from "./soap-parse.js";

const EVENTO_VERSION = "1.00";

export const TP_EVENTO_CANCELAMENTO = "110111";
export const TP_EVENTO_CANCELAMENTO_SUBSTITUICAO = "110112";
export const TP_EVENTO_CARTA_CORRECAO = "110110";
export const TP_EVENTO_CONFIRMACAO_OPERACAO = "210200";
export const TP_EVENTO_CIENCIA_OPERACAO = "210210";
export const TP_EVENTO_DESCONHECIMENTO_OPERACAO = "210220";
export const TP_EVENTO_OPERACAO_NAO_REALIZADA = "210240";

/** Órgão do Ambiente Nacional. Manifestação do destinatário não vai para a UF. */
export const CORGAO_AMBIENTE_NACIONAL = "91";

export const DESC_EVENTO_CONFIRMACAO_OPERACAO = "Confirmacao da Operacao";
export const DESC_EVENTO_CIENCIA_OPERACAO = "Ciencia da Operacao";
export const DESC_EVENTO_DESCONHECIMENTO_OPERACAO = "Desconhecimento da Operacao";
export const DESC_EVENTO_OPERACAO_NAO_REALIZADA = "Operacao nao Realizada";

const DESC_EVENTO_MANIFESTACAO = {
  [TP_EVENTO_CONFIRMACAO_OPERACAO]: DESC_EVENTO_CONFIRMACAO_OPERACAO,
  [TP_EVENTO_CIENCIA_OPERACAO]: DESC_EVENTO_CIENCIA_OPERACAO,
  [TP_EVENTO_DESCONHECIMENTO_OPERACAO]: DESC_EVENTO_DESCONHECIMENTO_OPERACAO,
  [TP_EVENTO_OPERACAO_NAO_REALIZADA]: DESC_EVENTO_OPERACAO_NAO_REALIZADA,
} as const;

export type ManifestacaoTpEvento = keyof typeof DESC_EVENTO_MANIFESTACAO;

export const descEventoManifestacao = (tpEvento: ManifestacaoTpEvento): string =>
  DESC_EVENTO_MANIFESTACAO[tpEvento];

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
    }
  | {
      tpEvento:
        | typeof TP_EVENTO_CONFIRMACAO_OPERACAO
        | typeof TP_EVENTO_CIENCIA_OPERACAO
        | typeof TP_EVENTO_DESCONHECIMENTO_OPERACAO;
    }
  | {
      tpEvento: typeof TP_EVENTO_OPERACAO_NAO_REALIZADA;
      xJust: string;
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
    case TP_EVENTO_CONFIRMACAO_OPERACAO:
    case TP_EVENTO_CIENCIA_OPERACAO:
    case TP_EVENTO_DESCONHECIMENTO_OPERACAO:
      return (
        `<detEvento versao="${EVENTO_VERSION}">` +
        tag("descEvento", descEventoManifestacao(detalhe.tpEvento)) +
        `</detEvento>`
      );
    case TP_EVENTO_OPERACAO_NAO_REALIZADA:
      return (
        `<detEvento versao="${EVENTO_VERSION}">` +
        tag("descEvento", DESC_EVENTO_OPERACAO_NAO_REALIZADA) +
        tag("xJust", detalhe.xJust) +
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

const readEventoRetorno = (source: string) => {
  const parsed = parseSoapResponse(source, "recepcao de evento");
  const retEvento = findNode(parsed, "retEvento");
  const infEvento = asRecord(findNode(retEvento, "infEvento"));
  const lote = asRecord(findNode(parsed, "retEnvEvento"));
  return {
    parsed,
    infEvento,
    cStat: textOf(infEvento?.cStat) ?? textOf(lote?.cStat),
    xMotivo: textOf(infEvento?.xMotivo) ?? textOf(lote?.xMotivo),
  };
};

const embeddedEventoXml = (value: unknown): string | undefined => {
  if (typeof value === "string" && /<(?:retEnvEvento|cStat)\b/.test(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = embeddedEventoXml(item);
      if (found) return found;
    }
    return undefined;
  }
  const record = asRecord(value);
  if (!record) return undefined;
  for (const nested of Object.values(record)) {
    const found = embeddedEventoXml(nested);
    if (found) return found;
  }
  return undefined;
};

export const parseRetEnvEvento = (soapXml: string): EventoParsed => {
  let source = materializeSefazXml(soapXml);
  let read = readEventoRetorno(source);
  if (!read.cStat || !read.xMotivo) {
    const inner = embeddedEventoXml(read.parsed);
    if (inner) {
      source = inner;
      read = readEventoRetorno(inner);
    }
  }
  const { infEvento, cStat, xMotivo } = read;
  if (!cStat || !xMotivo) {
    const hint = sefazResponseHint(source);
    throw sefazUnavailableError(
      hint
        ? `Nao foi possivel interpretar o retorno do evento da SEFAZ. ${hint}`
        : "Nao foi possivel interpretar o retorno do evento da SEFAZ",
    );
  }
  return {
    cStat,
    xMotivo,
    nProt: textOf(infEvento?.nProt),
    dhRegEvento: textOf(infEvento?.dhRegEvento),
    retEventoXml: extractElementXml(source, "retEvento"),
    registered: infEvento !== undefined && REGISTERED.has(cStat),
  };
};
