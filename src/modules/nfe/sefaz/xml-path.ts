import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BadRequestError } from "../../../shared/errors/app-error.js";

const EMISSION_TIME_ZONE = "America/Sao_Paulo";

const emissionYearMonth = (dhEmi: Date): { year: string; month: string } => {
  if (Number.isNaN(dhEmi.getTime())) {
    throw new BadRequestError(
      "Data de emissao invalida para gravar o XML da nota",
      "NFE_XML_DATE_INVALID",
    );
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EMISSION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(dhEmi);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) {
    throw new BadRequestError(
      "Data de emissao invalida para gravar o XML da nota",
      "NFE_XML_DATE_INVALID",
    );
  }
  return { year, month };
};

/** `{cnpj}/{ano}/{mes}/{chave}-nfe.xml`, ano e mes no fuso de emissao. */
export const nfeSignedXmlRelativePath = (input: {
  cnpj: string;
  dhEmi: Date;
  chave: string;
}): string => {
  const cnpj = input.cnpj.replace(/\D/g, "");
  if (!/^\d{14}$/.test(cnpj)) {
    throw new BadRequestError(
      "A nota precisa do CNPJ do emitente para gravar o XML assinado",
      "NFE_EMIT_CNPJ_REQUIRED",
    );
  }
  if (!/^\d{44}$/.test(input.chave)) {
    throw new BadRequestError(
      "A nota precisa da chave de acesso para gravar o XML assinado",
      "NFE_ACCESS_KEY_REQUIRED",
    );
  }
  const { year, month } = emissionYearMonth(input.dhEmi);
  return `${cnpj}/${year}/${month}/${input.chave}-nfe.xml`;
};

/** Mesma pasta do XML assinado, com o protocolo da SEFAZ. */
export const nfeProcXmlRelativePath = (input: {
  cnpj: string;
  dhEmi: Date;
  chave: string;
}): string =>
  nfeSignedXmlRelativePath(input).replace(/-nfe\.xml$/, "-procNFe.xml");

export const resolveNfeXmlFile = (
  relativePath: string,
  baseDir: string,
): string => {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, relativePath);
  const relative = path.relative(base, resolved);
  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new BadRequestError(
      "Caminho do XML da nota fiscal invalido",
      "NFE_XML_PATH_INVALID",
    );
  }
  return resolved;
};

const isMissingFile = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ENOENT";

export const writeNfeXmlAt = async (
  baseDir: string,
  relativePath: string,
  xml: string,
): Promise<string> => {
  const filePath = resolveNfeXmlFile(relativePath, baseDir);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, xml, "utf8");
  return filePath;
};

export const readNfeXmlAt = async (
  baseDir: string,
  relativePath: string,
): Promise<string | null> => {
  const filePath = resolveNfeXmlFile(relativePath, baseDir);
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingFile(error)) {
      return null;
    }
    throw error;
  }
};
