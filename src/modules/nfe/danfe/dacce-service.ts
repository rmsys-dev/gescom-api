import { and, eq, isNull } from "drizzle-orm";
import { db, enterprises, nfeHeaders } from "../../../db/schema.js";
import { BadRequestError, NotFoundError } from "../../../shared/errors/app-error.js";
import { htmlToPdf } from "../../sales/print/html-to-pdf.js";
import { loadEnterpriseLogoSrc } from "../../sales/print/load-print-logo.js";
import { nfeEventsService } from "../events/service.js";
import { readStoredNfeXml } from "../sefaz/xml-store.js";
import { parseDacceXml, renderDacceHtml, type DacceNote } from "./dacce-html.js";

const REGISTERED_CSTATS = new Set(["135", "136"]);

const enterpriseLogoSrc = async (enterpriseId: string): Promise<string | null> => {
  const [row] = await db
    .select({ logoUrl: enterprises.logoUrl })
    .from(enterprises)
    .where(eq(enterprises.id, enterpriseId))
    .limit(1);
  return loadEnterpriseLogoSrc(row?.logoUrl);
};

const loadNote = async (enterpriseId: string, nfeId: string): Promise<DacceNote> => {
  const [header] = await db
    .select()
    .from(nfeHeaders)
    .where(
      and(
        eq(nfeHeaders.id, nfeId),
        eq(nfeHeaders.enterpriseId, enterpriseId),
        isNull(nfeHeaders.deletedAt),
      ),
    )
    .limit(1);
  if (!header) {
    throw new NotFoundError("Nota fiscal nao encontrada", "NFE_NOT_FOUND");
  }
  const street = [header.emitXlgr, header.emitNro, header.emitXcpl].filter(Boolean).join(", ");
  const emitAddress = [
    street,
    header.emitXbairro,
    header.emitXmun && header.emitUf ? `${header.emitXmun} - ${header.emitUf}` : header.emitXmun,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    nNf: String(header.nNf ?? ""),
    serie: header.serie ?? "",
    dhEmi: header.dhEmi ? header.dhEmi.toISOString() : "",
    emitName: header.emitXNome ?? "",
    emitDocument: header.emitCnpj ?? header.emitCpf ?? "",
    emitIe: header.emitIe ?? "",
    emitAddress,
    destName: header.destXNome ?? "",
    destDocument: header.destCnpj ?? header.destCpf ?? header.destIdEstrangeiro ?? "",
  };
};

export const nfeDacceService = {
  async html(
    enterpriseId: string,
    nfeId: string,
    eventId: string,
    options: { autoPrint?: boolean } = {},
  ) {
    const event = await nfeEventsService.loadEvent(enterpriseId, nfeId, eventId);
    if (event.eventType !== "CARTA_CORRECAO" || !REGISTERED_CSTATS.has(event.cStat ?? "")) {
      throw new BadRequestError(
        "O DACCe está disponível apenas para cartas de correção registradas na SEFAZ.",
        "NFE_DACCE_EVENT_INVALID",
      );
    }
    const xml = await readStoredNfeXml(event.xmlEvento);
    if (!xml) {
      throw new NotFoundError("XML do evento nao encontrado", "NFE_EVENT_XML_NOT_FOUND");
    }
    let parsed;
    try {
      parsed = parseDacceXml(xml);
    } catch (error) {
      const message = error instanceof Error ? error.message : "XML do evento inválido.";
      throw new BadRequestError(message, "NFE_DACCE_XML");
    }
    const [note, logoSrc] = await Promise.all([
      loadNote(enterpriseId, nfeId),
      enterpriseLogoSrc(enterpriseId),
    ]);
    const seq = String(event.nSeqEvento).padStart(2, "0");
    return {
      html: renderDacceHtml(parsed, note, {
        logoSrc,
        autoPrint: options.autoPrint === true,
      }),
      filename: `CCe-${parsed.chave.replace(/\D/g, "") || event.id}-${seq}.pdf`,
    };
  },

  async pdf(enterpriseId: string, nfeId: string, eventId: string) {
    const { html, filename } = await nfeDacceService.html(enterpriseId, nfeId, eventId);
    return { pdf: await htmlToPdf(html), filename };
  },
};
