import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateXML, type XMLValidationError } from "xmllint-wasm";
import { BadRequestError } from "../../../shared/errors/app-error.js";

/** Pacote de Liberação nº 010b (NT 2025.002), Portal Nacional da NF-e. */
const SCHEMA_FILES = [
  "nfe_v4.00.xsd",
  "leiauteNFe_v4.00.xsd",
  "tiposBasico_v4.00.xsd",
  "DFeTiposBasicos_v1.00.xsd",
  "xmldsig-core-schema_v1.01.xsd",
] as const;

const MAX_SCHEMA_ERRORS = 15;

const schemaDir = (): string =>
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "schemas",
    "PL_010_V1.30",
  );

const schemaFiles = SCHEMA_FILES.map((fileName) => ({
  fileName,
  contents: readFileSync(path.join(schemaDir(), fileName), "utf8"),
}));

const elementPath = (message: string): string => {
  const match = message.match(/Element '([^']+)'/);
  return match?.[1] ?? "xml";
};

const schemaMessages = (errors: readonly XMLValidationError[]): string[] => {
  const messages = errors.map((error) => error.message.trim()).filter(Boolean);
  return messages.length > 0 ? messages : ["XML fora do schema da NF-e"];
};

/** Valida o XML assinado contra o schema da NF-e 4.00. */
export const validateNfeXml = async (xml: string): Promise<string[]> => {
  const [main, ...dependencies] = schemaFiles;
  if (!main) {
    throw new Error("Schema da NF-e nao encontrado");
  }
  const result = await validateXML({
    xml: [{ fileName: "nfe.xml", contents: xml }],
    schema: [main],
    preload: dependencies,
  });
  if (result.valid) {
    return [];
  }
  return schemaMessages(result.errors);
};

export const assertNfeXmlSchema = async (xml: string): Promise<void> => {
  const errors = await validateNfeXml(xml);
  if (errors.length === 0) {
    return;
  }
  throw new BadRequestError(
    "XML da nota fiscal fora do schema da NF-e",
    "NFE_XML_SCHEMA_INVALID",
    errors.slice(0, MAX_SCHEMA_ERRORS).map((message) => ({
      path: elementPath(message),
      message,
    })),
  );
};
