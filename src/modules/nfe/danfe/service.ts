import { BadRequestError } from "../../../shared/errors/app-error.js";
import { htmlToPdf } from "../../sales/print/html-to-pdf.js";
import { nfeDocumentService } from "../document/service.js";
import { renderDanfeHtml } from "./danfe-html.js";
import { parseDanfeXml } from "./parse-xml.js";

const fileName = (nNf: unknown, serie: unknown): string => {
  const number = String(nNf ?? "nota").replace(/[^\w.-]+/g, "_");
  const series = String(serie ?? "1").replace(/[^\w.-]+/g, "_");
  return `danfe-${number}-${series}.pdf`;
};

export const nfeDanfeService = {
  async pdf(enterpriseId: string, nfeId: string) {
    const document = await nfeDocumentService.get(enterpriseId, nfeId);
    if (document.mod !== "55") {
      throw new BadRequestError(
        "O DANFE desta tela é só da NF-e modelo 55.",
        "NFE_DANFE_MODEL",
      );
    }
    const { xml } = await nfeDocumentService.xml(enterpriseId, nfeId);
    let model;
    try {
      model = parseDanfeXml(xml);
    } catch (error) {
      const message = error instanceof Error ? error.message : "XML da nota inválido.";
      throw new BadRequestError(message, "NFE_DANFE_XML");
    }
    return {
      pdf: await htmlToPdf(renderDanfeHtml(model)),
      filename: fileName(document.nNf, document.serie),
    };
  },
};
