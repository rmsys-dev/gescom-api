import { eq } from "drizzle-orm";
import { db, enterprises } from "../../../db/schema.js";
import { BadRequestError } from "../../../shared/errors/app-error.js";
import { htmlToPdf } from "../../sales/print/html-to-pdf.js";
import { loadEnterpriseLogoSrc } from "../../sales/print/load-print-logo.js";
import { nfeDocumentService } from "../document/service.js";
import { renderDanfeHtml } from "./danfe-html.js";
import { renderDanfeNfceHtml } from "./danfe-nfce-html.js";
import { parseDanfeXml } from "./parse-xml.js";

const NFCE_ROLL_WIDTH_MM = 80;

const fileName = (mod: string, chave: unknown, nNf: unknown, serie: unknown): string => {
  const prefix = mod === "65" ? "NFCe" : "NFe";
  const key = String(chave ?? "").replace(/\D/g, "");
  if (key.length === 44) return `${prefix}-${key}.pdf`;
  const number = String(nNf ?? "nota").replace(/[^\w.-]+/g, "_");
  const series = String(serie ?? "1").replace(/[^\w.-]+/g, "_");
  return `${prefix}-${number}-${series}.pdf`;
};

const enterpriseLogoSrc = async (enterpriseId: string): Promise<string | null> => {
  const [row] = await db
    .select({ logoUrl: enterprises.logoUrl })
    .from(enterprises)
    .where(eq(enterprises.id, enterpriseId))
    .limit(1);
  return loadEnterpriseLogoSrc(row?.logoUrl);
};

export const nfeDanfeService = {
  async html(
    enterpriseId: string,
    nfeId: string,
    options: { autoPrint?: boolean } = {},
  ) {
    const document = await nfeDocumentService.get(enterpriseId, nfeId);
    if (document.mod !== "55" && document.mod !== "65") {
      throw new BadRequestError(
        "O DANFE só está disponível para NF-e (55) e NFC-e (65).",
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
    const logoSrc = await enterpriseLogoSrc(enterpriseId);
    const renderOptions = {
      logoSrc,
      cancelled: document.status === "CANCELADA",
      autoPrint: options.autoPrint === true,
    };
    return {
      html: document.mod === "65"
        ? renderDanfeNfceHtml(model, renderOptions)
        : renderDanfeHtml(model, renderOptions),
      mod: document.mod,
      filename: fileName(document.mod, document.chave, document.nNf, document.serie),
    };
  },

  async pdf(enterpriseId: string, nfeId: string) {
    const { html, mod, filename } = await nfeDanfeService.html(enterpriseId, nfeId);
    const pdf = mod === "65"
      ? await htmlToPdf(html, { rollWidthMm: NFCE_ROLL_WIDTH_MM })
      : await htmlToPdf(html);
    return { pdf, filename };
  },
};
