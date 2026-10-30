import { and, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import { db, enterprises, nfeRecipientManifestations } from "../../../db/schema.js";
import type { NfeManifestationType } from "../../../db/enums.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import { nfeConfiguracaoService } from "../configuracao/service.js";
import { enviarEventoAmbienteNacional } from "../sefaz/evento.js";
import {
  CORGAO_AMBIENTE_NACIONAL,
  buildEventoXml,
  buildProcEventoNFeXml,
} from "../sefaz/evento-xml.js";
import { formatSefazDateTime } from "../sefaz/nfe-xml.js";
import { signEventoXml } from "../sefaz/sign-xml.js";
import { nfeEventXmlRelativePath } from "../sefaz/xml-path.js";
import { readStoredNfeXml, writeNfeXmlFile } from "../sefaz/xml-store.js";
import {
  MANIFESTACAO_TP_EVENTO,
  assertManifestacaoPermitida,
  parseChaveManifestacao,
} from "./rules.js";
import type { CreateManifestacaoInput, ListManifestacoesQuery } from "./schema.js";

const NSEQ_EVENTO = 1;

const digits = (value: string | null | undefined): string =>
  (value ?? "").replace(/\D/g, "");

const tpAmbOf = (value: number): 1 | 2 => {
  if (value !== 1 && value !== 2) {
    throw new BadRequestError(
      "Ambiente da nota fiscal invalido",
      "NFE_AMBIENTE_INVALID",
    );
  }
  return value;
};

export class NfeManifestacaoService {
  public async create(enterpriseId: string, input: CreateManifestacaoInput) {
    const chave = parseChaveManifestacao(input.chave);
    const cnpj = await this.enterpriseCnpj(enterpriseId);
    const existentes = await this.tiposDaChave(enterpriseId, chave.chave);
    assertManifestacaoPermitida(existentes, input.tipo);

    const { ambiente, certificate } =
      await nfeConfiguracaoService.loadCredentials(enterpriseId);
    const tpAmb = tpAmbOf(ambiente);
    const tpEvento = MANIFESTACAO_TP_EVENTO[input.tipo];
    const detalhe =
      input.tipo === "OPERACAO_NAO_REALIZADA"
        ? {
            tpEvento: MANIFESTACAO_TP_EVENTO.OPERACAO_NAO_REALIZADA,
            xJust: input.xJust ?? "",
          }
        : { tpEvento: MANIFESTACAO_TP_EVENTO[input.tipo] };
    const now = new Date();
    const signed = signEventoXml(
      buildEventoXml({
        cOrgao: CORGAO_AMBIENTE_NACIONAL,
        tpAmb,
        cnpj,
        chNFe: chave.chave,
        dhEvento: formatSefazDateTime(now),
        nSeqEvento: NSEQ_EVENTO,
        detalhe,
      }),
      { privateKeyPem: certificate.key, certificatePem: certificate.leafCert },
    );
    const result = await enviarEventoAmbienteNacional({
      ambiente: tpAmb,
      idLote: String(now.getTime()),
      signedEventoXml: signed,
      certificate,
    });
    if (!result.registered || !result.retEventoXml) {
      throw new BadRequestError(
        `SEFAZ rejeitou o evento: ${result.cStat} - ${result.xMotivo}`,
        "NFE_EVENT_REJECTED",
      );
    }

    const xmlEvento = nfeEventXmlRelativePath({
      cnpj,
      dhEmi: now,
      chave: chave.chave,
      tpEvento,
      nSeqEvento: NSEQ_EVENTO,
    });
    await writeNfeXmlFile(
      xmlEvento,
      buildProcEventoNFeXml(signed, result.retEventoXml),
    );

    try {
      const [row] = await db
        .insert(nfeRecipientManifestations)
        .values({
          enterpriseId,
          chave: chave.chave,
          emitCnpj: chave.emitCnpj,
          eventType: input.tipo,
          tpEvento,
          nSeqEvento: NSEQ_EVENTO,
          dhEvento: now,
          xJust: input.tipo === "OPERACAO_NAO_REALIZADA" ? input.xJust : null,
          nProt: result.nProt ?? null,
          cStat: result.cStat,
          xMotivo: result.xMotivo.slice(0, 255),
          xmlEvento,
        })
        .returning();
      return row;
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new ConflictError(
          "Esta manifestacao ja foi registrada para a chave",
          "NFE_MANIFESTACAO_DUPLICADA",
        );
      }
      throw error;
    }
  }

  public async list(enterpriseId: string, query: ListManifestacoesQuery) {
    const { limit, offset } = resolveListPagination(query);
    const filters: SQL[] = [
      eq(nfeRecipientManifestations.enterpriseId, enterpriseId),
    ];
    const chave = digits(query.chave);
    if (chave) filters.push(eq(nfeRecipientManifestations.chave, chave));
    if (query.tipo) {
      filters.push(eq(nfeRecipientManifestations.eventType, query.tipo));
    }
    const where = and(...filters);
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: nfeRecipientManifestations.id,
          chave: nfeRecipientManifestations.chave,
          emitCnpj: nfeRecipientManifestations.emitCnpj,
          eventType: nfeRecipientManifestations.eventType,
          tpEvento: nfeRecipientManifestations.tpEvento,
          nSeqEvento: nfeRecipientManifestations.nSeqEvento,
          dhEvento: nfeRecipientManifestations.dhEvento,
          xJust: nfeRecipientManifestations.xJust,
          nProt: nfeRecipientManifestations.nProt,
          cStat: nfeRecipientManifestations.cStat,
          xMotivo: nfeRecipientManifestations.xMotivo,
        })
        .from(nfeRecipientManifestations)
        .where(where)
        .orderBy(desc(nfeRecipientManifestations.dhEvento))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(nfeRecipientManifestations)
        .where(where),
    ]);
    return {
      items,
      total: Number(totalRows[0]?.c ?? 0),
      limit,
      offset,
    };
  }

  public async xml(enterpriseId: string, manifestacaoId: string) {
    const [row] = await db
      .select({ xmlEvento: nfeRecipientManifestations.xmlEvento })
      .from(nfeRecipientManifestations)
      .where(
        and(
          eq(nfeRecipientManifestations.id, manifestacaoId),
          eq(nfeRecipientManifestations.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        "Manifestacao do destinatario nao encontrada",
        "NFE_MANIFESTACAO_NOT_FOUND",
      );
    }
    const xml = await readStoredNfeXml(row.xmlEvento);
    if (!xml) {
      throw new NotFoundError(
        "XML da manifestacao nao encontrado",
        "NFE_MANIFESTACAO_XML_NOT_FOUND",
      );
    }
    return { xml };
  }

  private async enterpriseCnpj(enterpriseId: string): Promise<string> {
    const [enterprise] = await db
      .select({ registration: enterprises.registration })
      .from(enterprises)
      .where(and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)))
      .limit(1);
    if (!enterprise) {
      throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    }
    const cnpj = digits(enterprise.registration);
    if (cnpj.length !== 14) {
      throw new BadRequestError(
        "A manifestacao do destinatario exige CNPJ da empresa",
        "NFE_MANIFESTACAO_CNPJ",
      );
    }
    return cnpj;
  }

  private async tiposDaChave(
    enterpriseId: string,
    chave: string,
  ): Promise<NfeManifestationType[]> {
    const rows = await db
      .select({ eventType: nfeRecipientManifestations.eventType })
      .from(nfeRecipientManifestations)
      .where(
        and(
          eq(nfeRecipientManifestations.enterpriseId, enterpriseId),
          eq(nfeRecipientManifestations.chave, chave),
        ),
      );
    return rows.map((row) => row.eventType);
  }
}

export const nfeManifestacaoService = new NfeManifestacaoService();
