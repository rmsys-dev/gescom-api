import { and, count, desc, eq, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import {
  ceps,
  cities,
  db,
  enterprises,
  enterprisesAddress,
  nfeEvents,
  nfeHeaders,
  nfeSales,
  states,
} from "../../../db/schema.js";
import type { NfeEventType, NfeInvoiceStatus } from "../../../db/enums.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import {
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import { nfeConfiguracaoService } from "../configuracao/service.js";
import { resolveEmitUf } from "../document/emit-uf.js";
import { syncNfeSequenceFloor } from "../sequences.js";
import { enviarEvento } from "../sefaz/evento.js";
import {
  TP_EVENTO_CANCELAMENTO,
  TP_EVENTO_CANCELAMENTO_SUBSTITUICAO,
  buildEventoXml,
  buildProcEventoNFeXml,
  type EventoDetalhe,
} from "../sefaz/evento-xml.js";
import { inutilizarNumeracao } from "../sefaz/inutilizacao.js";
import {
  buildInutNFeXml,
  buildProcInutNFeXml,
  inutilizacaoId,
} from "../sefaz/inutilizacao-xml.js";
import { formatSefazDateTime } from "../sefaz/nfe-xml.js";
import { signEventoXml, signInutXml } from "../sefaz/sign-xml.js";
import { getCufFromUf, isUfSigla } from "../sefaz/uf.js";
import {
  nfeEventXmlRelativePath,
  nfeInutXmlRelativePath,
} from "../sefaz/xml-path.js";
import { writeNfeXmlFile } from "../sefaz/xml-store.js";
import type {
  CancelNfeInput,
  CancelNfeBySubstitutionInput,
  InutilizeNfeNoteInput,
  InutilizeNfeRangeInput,
  ListInutilizationsQuery,
  ListNfeEventsQuery,
} from "./schema.js";

type Header = typeof nfeHeaders.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const MAX_INUT_RANGE = 10_000;
const VER_APLIC_DEFAULT = "gescom";
const CLOSED_STATUSES: NfeInvoiceStatus[] = ["AUTORIZADA", "CANCELADA", "DENEGADA"];
const INUTILIZABLE_STATUSES: NfeInvoiceStatus[] = ["PENDENTE", "ASSINADA", "REJEITADA"];

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

const modeloOf = (mod: string): "55" | "65" => (mod === "65" ? "65" : "55");

const releaseSales = (tx: Tx, nfeHeaderIds: string[], now: Date) =>
  nfeHeaderIds.length === 0
    ? Promise.resolve()
    : tx
        .update(nfeSales)
        .set({ deletedAt: now })
        .where(
          and(
            inArray(nfeSales.nfeHeaderId, nfeHeaderIds),
            isNull(nfeSales.deletedAt),
          ),
        );

export class NfeEventsService {
  public async cancel(
    enterpriseId: string,
    nfeId: string,
    input: CancelNfeInput,
    audit: EntityAuditContext,
  ) {
    const header = await this.loadHeader(enterpriseId, nfeId);
    const nProt = this.assertCancelable(header);
    return this.sendCancelEvent(
      enterpriseId,
      header,
      "CANCELAMENTO",
      { tpEvento: TP_EVENTO_CANCELAMENTO, nProt, xJust: input.xJust },
      audit,
    );
  }

  public async cancelBySubstitution(
    enterpriseId: string,
    nfeId: string,
    input: CancelNfeBySubstitutionInput,
    audit: EntityAuditContext,
  ) {
    const header = await this.loadHeader(enterpriseId, nfeId);
    if (header.mod !== "65") {
      throw new BadRequestError(
        "Cancelamento por substituicao vale apenas para NFC-e (modelo 65)",
        "NFE_SUBSTITUTION_MODEL",
      );
    }
    const nProt = this.assertCancelable(header);
    if (input.nfeSubstitutaId === nfeId) {
      throw new BadRequestError(
        "A nota substituta deve ser diferente da nota cancelada",
        "NFE_SUBSTITUTION_SAME",
      );
    }
    const substitute = await this.loadHeader(enterpriseId, input.nfeSubstitutaId);
    if (substitute.mod !== "65" || substitute.status !== "AUTORIZADA") {
      throw new BadRequestError(
        "A nota substituta precisa ser uma NFC-e autorizada",
        "NFE_SUBSTITUTION_INVALID",
      );
    }
    return this.sendCancelEvent(
      enterpriseId,
      header,
      "CANCELAMENTO_SUBSTITUICAO",
      {
        tpEvento: TP_EVENTO_CANCELAMENTO_SUBSTITUICAO,
        cOrgaoAutor: header.cUf,
        verAplic: (header.verProc || VER_APLIC_DEFAULT).slice(0, 20),
        nProt,
        xJust: input.xJust,
        chNFeRef: substitute.chave,
      },
      audit,
    );
  }

  public async inutilizeRange(
    enterpriseId: string,
    input: InutilizeNfeRangeInput,
    audit: EntityAuditContext,
  ) {
    if (input.nNfIni > input.nNfFin) {
      throw new BadRequestError(
        "Numero inicial deve ser menor ou igual ao numero final",
        "NFE_INUT_RANGE_INVALID",
      );
    }
    if (input.nNfFin - input.nNfIni + 1 > MAX_INUT_RANGE) {
      throw new BadRequestError(
        `A faixa de inutilizacao pode ter no maximo ${MAX_INUT_RANGE} numeros`,
        "NFE_INUT_RANGE_TOO_LARGE",
      );
    }
    const serie = String(input.serie);
    const rangeFilter = and(
      eq(nfeHeaders.enterpriseId, enterpriseId),
      eq(nfeHeaders.mod, input.mod),
      eq(nfeHeaders.serie, serie),
      gte(nfeHeaders.nNf, input.nNfIni),
      lte(nfeHeaders.nNf, input.nNfFin),
      eq(nfeHeaders.issuanceType, "PROPRIA"),
      isNull(nfeHeaders.deletedAt),
    );

    const [closed] = await db
      .select({ nNf: nfeHeaders.nNf, status: nfeHeaders.status })
      .from(nfeHeaders)
      .where(and(rangeFilter, inArray(nfeHeaders.status, CLOSED_STATUSES)))
      .limit(1);
    if (closed) {
      throw new ConflictError(
        `A faixa contem a nota ${closed.nNf} com situacao ${closed.status}`,
        "NFE_INUT_RANGE_HAS_CLOSED",
      );
    }

    const [overlap] = await db
      .select({ nNfIni: nfeEvents.nNfIni, nNfFin: nfeEvents.nNfFin })
      .from(nfeEvents)
      .where(
        and(
          eq(nfeEvents.enterpriseId, enterpriseId),
          eq(nfeEvents.eventType, "INUTILIZACAO"),
          eq(nfeEvents.cStat, "102"),
          eq(nfeEvents.mod, input.mod),
          eq(nfeEvents.serie, serie),
          lte(nfeEvents.nNfIni, input.nNfFin),
          gte(nfeEvents.nNfFin, input.nNfIni),
        ),
      )
      .limit(1);
    if (overlap) {
      throw new ConflictError(
        `A faixa ${overlap.nNfIni}-${overlap.nNfFin} ja foi inutilizada`,
        "NFE_INUT_ALREADY_DONE",
      );
    }

    const emitter = await this.loadEmitter(enterpriseId);
    const { ambiente, certificate } =
      await nfeConfiguracaoService.loadCredentials(enterpriseId);
    const emission = await nfeConfiguracaoService.getEmissionSettings(enterpriseId);
    const currentSerie = input.mod === "65" ? emission.serieNfce : emission.serieNfe;
    const now = new Date();
    const ano = input.ano ?? formatSefazDateTime(now).slice(2, 4);
    const inutInput = {
      tpAmb: ambiente,
      cUf: getCufFromUf(emitter.uf),
      ano,
      cnpj: emitter.cnpj,
      mod: input.mod,
      serie: input.serie,
      nNfIni: input.nNfIni,
      nNfFin: input.nNfFin,
      xJust: input.xJust,
    };
    const signed = signInutXml(buildInutNFeXml(inutInput), {
      privateKeyPem: certificate.key,
      certificatePem: certificate.leafCert,
    });
    const result = await inutilizarNumeracao({
      uf: emitter.uf,
      modelo: input.mod,
      ambiente,
      signedInutXml: signed,
      certificate,
    });

    let xmlPath: string | null = null;
    if (result.homologated && result.retInutXml) {
      xmlPath = nfeInutXmlRelativePath({
        cnpj: emitter.cnpj,
        requestedAt: now,
        id: inutilizacaoId(inutInput),
      });
      await writeNfeXmlFile(
        xmlPath,
        buildProcInutNFeXml(signed, result.retInutXml),
      );
    }

    const event = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(nfeEvents)
        .values({
          enterpriseId,
          nfeHeaderId: null,
          eventType: "INUTILIZACAO",
          nSeqEvento: 1,
          dhEvento: now,
          descricao: input.xJust,
          nProt: result.nProt ?? null,
          cStat: result.cStat,
          xMotivo: result.xMotivo.slice(0, 255),
          xmlEvento: xmlPath,
          mod: input.mod,
          serie,
          ano,
          nNfIni: input.nNfIni,
          nNfFin: input.nNfFin,
        })
        .returning();
      if (!result.homologated) {
        return row;
      }
      if (input.serie === currentSerie) {
        await syncNfeSequenceFloor(enterpriseId, input.mod, input.nNfFin, tx);
      }
      const affected = await tx
        .select()
        .from(nfeHeaders)
        .where(
          and(rangeFilter, inArray(nfeHeaders.status, INUTILIZABLE_STATUSES)),
        );
      if (affected.length > 0) {
        const ids = affected.map((header) => header.id);
        await tx
          .update(nfeHeaders)
          .set({
            status: "INUTILIZADA",
            cStat: result.cStat,
            xMotivo: result.xMotivo.slice(0, 255),
            updatedAt: now,
          })
          .where(inArray(nfeHeaders.id, ids));
        await releaseSales(tx, ids, now);
        for (const before of affected) {
          await recordEntityAudit({
            entityType: EntityTypes.NFE_HEADERS,
            entityId: before.id,
            action: "UPDATE",
            before: toAuditRecord({ status: before.status }),
            after: toAuditRecord({ status: "INUTILIZADA" }),
            ctx: { ...audit, enterpriseId },
            tx,
          });
        }
      }
      return row;
    });

    if (!result.homologated) {
      throw new BadRequestError(
        `SEFAZ rejeitou a inutilizacao: ${result.cStat} - ${result.xMotivo}`,
        "NFE_INUT_REJECTED",
      );
    }
    return event;
  }

  public async inutilizeNote(
    enterpriseId: string,
    nfeId: string,
    input: InutilizeNfeNoteInput,
    audit: EntityAuditContext,
  ) {
    const header = await this.loadHeader(enterpriseId, nfeId);
    if (header.issuanceType !== "PROPRIA") {
      throw new BadRequestError(
        "Nota de terceiro nao pode ser inutilizada",
        "NFE_THIRD_PARTY",
      );
    }
    if (!INUTILIZABLE_STATUSES.includes(header.status)) {
      throw new ConflictError(
        `Nota com situacao ${header.status} nao pode ter o numero inutilizado`,
        "NFE_INUT_STATUS_INVALID",
      );
    }
    const [homologated] = await db
      .select()
      .from(nfeEvents)
      .where(
        and(
          eq(nfeEvents.enterpriseId, enterpriseId),
          eq(nfeEvents.eventType, "INUTILIZACAO"),
          eq(nfeEvents.cStat, "102"),
          eq(nfeEvents.mod, header.mod),
          eq(nfeEvents.serie, header.serie),
          lte(nfeEvents.nNfIni, header.nNf),
          gte(nfeEvents.nNfFin, header.nNf),
        ),
      )
      .limit(1);
    if (homologated) {
      await this.markInutilized(enterpriseId, header, homologated, audit);
      return homologated;
    }
    return this.inutilizeRange(
      enterpriseId,
      {
        mod: modeloOf(header.mod),
        serie: Number(header.serie),
        nNfIni: header.nNf,
        nNfFin: header.nNf,
        ano: header.chave.slice(2, 4),
        xJust: input.xJust,
      },
      audit,
    );
  }

  public async listByNfe(enterpriseId: string, nfeId: string) {
    await this.loadHeader(enterpriseId, nfeId);
    return db
      .select()
      .from(nfeEvents)
      .where(
        and(
          eq(nfeEvents.enterpriseId, enterpriseId),
          eq(nfeEvents.nfeHeaderId, nfeId),
        ),
      )
      .orderBy(desc(nfeEvents.dhEvento));
  }

  public async listEvents(enterpriseId: string, query: ListNfeEventsQuery) {
    const { limit, offset } = resolveListPagination(query);
    const filters: SQL[] = [eq(nfeEvents.enterpriseId, enterpriseId)];
    if (query.eventType) filters.push(eq(nfeEvents.eventType, query.eventType));
    if (query.mod) filters.push(eq(nfeEvents.mod, query.mod));
    if (query.from) filters.push(gte(nfeEvents.dhEvento, query.from));
    if (query.to) filters.push(lte(nfeEvents.dhEvento, query.to));
    const term = query.search?.trim();
    if (term) {
      const digitsOnly = digits(term);
      const parts: SQL[] = [ilike(nfeHeaders.destXNome, `%${term}%`)];
      if (digitsOnly) parts.push(ilike(nfeEvents.chave, `%${digitsOnly}%`));
      if (/^\d{1,9}$/.test(term)) {
        const number = Number(term);
        parts.push(eq(nfeHeaders.nNf, number));
        parts.push(and(lte(nfeEvents.nNfIni, number), gte(nfeEvents.nNfFin, number))!);
      }
      filters.push(or(...parts)!);
    }
    const where = and(...filters);
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: nfeEvents.id,
          nfeHeaderId: nfeEvents.nfeHeaderId,
          eventType: nfeEvents.eventType,
          tpEvento: nfeEvents.tpEvento,
          nSeqEvento: nfeEvents.nSeqEvento,
          dhEvento: nfeEvents.dhEvento,
          descricao: nfeEvents.descricao,
          nProt: nfeEvents.nProt,
          cStat: nfeEvents.cStat,
          xMotivo: nfeEvents.xMotivo,
          mod: nfeEvents.mod,
          serie: nfeEvents.serie,
          nNfIni: nfeEvents.nNfIni,
          nNfFin: nfeEvents.nNfFin,
          chave: nfeEvents.chave,
          nNf: nfeHeaders.nNf,
          destXNome: nfeHeaders.destXNome,
          vNf: nfeHeaders.vNf,
        })
        .from(nfeEvents)
        .leftJoin(nfeHeaders, eq(nfeHeaders.id, nfeEvents.nfeHeaderId))
        .where(where)
        .orderBy(desc(nfeEvents.dhEvento))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(nfeEvents)
        .leftJoin(nfeHeaders, eq(nfeHeaders.id, nfeEvents.nfeHeaderId))
        .where(where),
    ]);
    return {
      items,
      total: Number(totalRows[0]?.c ?? 0),
      limit,
      offset,
    };
  }

  public async listInutilizations(
    enterpriseId: string,
    query: ListInutilizationsQuery,
  ) {
    const { limit, offset } = resolveListPagination(query);
    const filters = [
      eq(nfeEvents.enterpriseId, enterpriseId),
      eq(nfeEvents.eventType, "INUTILIZACAO"),
    ];
    if (query.mod) filters.push(eq(nfeEvents.mod, query.mod));
    const where = and(...filters);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(nfeEvents)
        .where(where)
        .orderBy(desc(nfeEvents.dhEvento))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(nfeEvents).where(where),
    ]);
    return {
      items,
      total: Number(totalRows[0]?.c ?? 0),
      limit,
      offset,
    };
  }

  private async sendCancelEvent(
    enterpriseId: string,
    header: Header,
    eventType: Extract<NfeEventType, "CANCELAMENTO" | "CANCELAMENTO_SUBSTITUICAO">,
    detalhe: EventoDetalhe,
    audit: EntityAuditContext,
  ) {
    const cnpj = digits(header.emitCnpj);
    if (cnpj.length !== 14) {
      throw new BadRequestError(
        "A nota precisa do CNPJ do emitente para enviar o evento",
        "NFE_EMIT_CNPJ_REQUIRED",
      );
    }
    const tpAmb = tpAmbOf(header.tpAmb);
    const modelo = modeloOf(header.mod);
    const uf = resolveEmitUf(header);
    const { certificate } = await nfeConfiguracaoService.loadCredentials(
      enterpriseId,
    );
    const nSeqEvento = 1;
    const now = new Date();
    const signed = signEventoXml(
      buildEventoXml({
        cOrgao: header.cUf,
        tpAmb,
        cnpj,
        chNFe: header.chave,
        dhEvento: formatSefazDateTime(now),
        nSeqEvento,
        detalhe,
      }),
      { privateKeyPem: certificate.key, certificatePem: certificate.leafCert },
    );
    const result = await enviarEvento({
      uf,
      modelo,
      ambiente: tpAmb,
      idLote: String(now.getTime()),
      signedEventoXml: signed,
      certificate,
    });

    let xmlPath: string | null = null;
    if (result.registered && result.retEventoXml) {
      xmlPath = nfeEventXmlRelativePath({
        cnpj,
        dhEmi: header.dhEmi,
        chave: header.chave,
        tpEvento: detalhe.tpEvento,
        nSeqEvento,
      });
      await writeNfeXmlFile(
        xmlPath,
        buildProcEventoNFeXml(signed, result.retEventoXml),
      );
    }

    const eventValues = {
      enterpriseId,
      nfeHeaderId: header.id,
      eventType,
      tpEvento: detalhe.tpEvento,
      nSeqEvento,
      dhEvento: now,
      descricao: detalhe.xJust,
      nProt: result.nProt ?? null,
      cStat: result.cStat,
      xMotivo: result.xMotivo.slice(0, 255),
      xmlEvento: xmlPath,
      mod: header.mod,
      serie: header.serie,
      chave: header.chave,
    };

    const event = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(nfeEvents)
        .values(eventValues)
        .onConflictDoUpdate({
          target: [nfeEvents.nfeHeaderId, nfeEvents.eventType, nfeEvents.nSeqEvento],
          targetWhere: sql`${nfeEvents.nfeHeaderId} is not null`,
          set: { ...eventValues, updatedAt: now },
        })
        .returning();
      if (!result.registered) {
        return row;
      }
      const [after] = await tx
        .update(nfeHeaders)
        .set({
          status: "CANCELADA",
          cStat: result.cStat,
          xMotivo: result.xMotivo.slice(0, 255),
          updatedAt: now,
        })
        .where(eq(nfeHeaders.id, header.id))
        .returning();
      await releaseSales(tx, [header.id], now);
      if (after) {
        await recordEntityAudit({
          entityType: EntityTypes.NFE_HEADERS,
          entityId: header.id,
          action: "UPDATE",
          before: toAuditRecord(header),
          after: toAuditRecord(after),
          ctx: { ...audit, enterpriseId },
          tx,
        });
      }
      return row;
    });

    if (!result.registered) {
      throw new BadRequestError(
        `SEFAZ rejeitou o evento: ${result.cStat} - ${result.xMotivo}`,
        "NFE_EVENT_REJECTED",
      );
    }
    return event;
  }

  /** Numero ja inutilizado na SEFAZ: so encerra a nota local e libera as vendas. */
  private async markInutilized(
    enterpriseId: string,
    header: Header,
    event: typeof nfeEvents.$inferSelect,
    audit: EntityAuditContext,
  ) {
    const now = new Date();
    await db.transaction(async (tx) => {
      const [after] = await tx
        .update(nfeHeaders)
        .set({
          status: "INUTILIZADA",
          cStat: event.cStat,
          xMotivo: event.xMotivo,
          updatedAt: now,
        })
        .where(eq(nfeHeaders.id, header.id))
        .returning();
      await releaseSales(tx, [header.id], now);
      if (after) {
        await recordEntityAudit({
          entityType: EntityTypes.NFE_HEADERS,
          entityId: header.id,
          action: "UPDATE",
          before: toAuditRecord(header),
          after: toAuditRecord(after),
          ctx: { ...audit, enterpriseId },
          tx,
        });
      }
    });
  }

  private assertCancelable(header: Header): string {
    if (header.issuanceType !== "PROPRIA") {
      throw new BadRequestError(
        "Nota de terceiro nao pode ser cancelada nesta API",
        "NFE_THIRD_PARTY",
      );
    }
    if (header.status !== "AUTORIZADA" || !header.nProt) {
      throw new ConflictError(
        "Apenas notas autorizadas, com protocolo, podem ser canceladas",
        "NFE_NOT_AUTHORIZED",
      );
    }
    return header.nProt;
  }

  private async loadHeader(enterpriseId: string, nfeId: string): Promise<Header> {
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
    return header;
  }

  private async loadEmitter(enterpriseId: string) {
    const [row] = await db
      .select({
        registration: enterprises.registration,
        uf: states.acronym,
      })
      .from(enterprises)
      .innerJoin(
        enterprisesAddress,
        and(
          eq(enterprisesAddress.enterpriseId, enterprises.id),
          eq(enterprisesAddress.adressType, "PRINCIPAL"),
          isNull(enterprisesAddress.deletedAt),
        ),
      )
      .innerJoin(ceps, eq(ceps.id, enterprisesAddress.cepId))
      .innerJoin(cities, eq(cities.id, ceps.cityId))
      .innerJoin(states, eq(states.id, cities.stateId))
      .where(and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)))
      .limit(1);
    const uf = row?.uf.toUpperCase() ?? "";
    if (!row || !isUfSigla(uf)) {
      throw new BadRequestError(
        "Empresa sem endereco principal para inutilizar numeracao",
        "NFE_ENTERPRISE_ADDRESS_REQUIRED",
      );
    }
    const cnpj = digits(row.registration);
    if (cnpj.length !== 14) {
      throw new BadRequestError(
        "A inutilizacao exige empresa com CNPJ",
        "NFE_EMIT_CNPJ_REQUIRED",
      );
    }
    return { cnpj, uf };
  }
}

export const nfeEventsService = new NfeEventsService();
