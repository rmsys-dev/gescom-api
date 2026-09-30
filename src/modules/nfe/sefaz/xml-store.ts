import { env } from "../../../config/env.js";
import { readNfeXmlAt, writeNfeXmlAt } from "./xml-path.js";

export const writeNfeXmlFile = (
  relativePath: string,
  xml: string,
): Promise<string> => writeNfeXmlAt(env.NFE_XML_DIR, relativePath, xml);

export const readStoredNfeXml = (
  relativePath: string | null | undefined,
): Promise<string | null> =>
  relativePath
    ? readNfeXmlAt(env.NFE_XML_DIR, relativePath)
    : Promise.resolve(null);
