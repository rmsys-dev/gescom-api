import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  ceps,
  cities,
  cteDfeCursors,
  cteDocumentNfes,
  cteDocuments,
  db,
  enterprises,
  enterprisesAddress,
  enterprisesMembers,
  states,
  users,
} from "../../../db/schema.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../../shared/errors/app-error.js";
import { nfeConfiguracaoService } from "../configuracao/service.js";
import { consultarDistribuicaoCte } from "../sefaz/cte-distribuicao.js";
import { getCufFromUf, isUfSigla } from "../sefaz/uf.js";
import { cteProcXmlRelativePath } from "../sefaz/xml-path.js";
import { writeNfeXmlFile } from "../sefaz/xml-store.js";
import { classifyCteDocument, parseProcCTe, type ProcCTeCompra } from "./proc-cte.js";

const HORA_MS = 60 * 60 * 1000;
const NSU_ZERO = "000000000000000";
const SAO_PAULO = "America/Sao_Paulo";

const digits = (value: string | null | undefined): string => (value ?? "").replace(/\D/g, "");

const bloqueioDfe = (until: Date): string => {
  const clock = new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO,
    hour: "2-digit",
    minute: "2-digit",
  }).format(until);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: SAO_PAULO }).format(until);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: SAO_PAULO }).format(new Date());
  const when =
    day === today
      ? `a partir das ${clock}`
      : `a partir de ${new Intl.DateTimeFormat("pt-BR", {
          timeZone: SAO_PAULO,
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(until)} às ${clock}`;
  return `A SEFAZ bloqueou a consulta de CT-e por consumo indevido. A consulta só pode ser executada ${when}`;
};

export type ConhecimentoEntrada = {
  id: string;
  chave: string;
  number: string;
  serie: string;
  emitCnpj: string;
  emitName: string | null;
  sole: boolean;
  freightValue: string | null;
  incidenceRate: string | null;
  carrier: { memberId: string; code: number | null; name: string } | null;
};

export type SincroniaCte = {
  cStat: string;
  xMotivo: string;
  ultNsu: string;
  maxNsu: string | null;
  procCTe: number;
  eventos: number;
};

export class CteDistribuicaoService {
  public async sincronizar(enterpriseId: string, recovered = false): Promise<SincroniaCte> {
    const contexto = await this.contexto(enterpriseId);
    const cursor = await this.cursor(enterpriseId);
    if (cursor.blockedUntil && cursor.blockedUntil.getTime() > Date.now()) {
      throw new ConflictError(bloqueioDfe(cursor.blockedUntil), "CTE_DFE_CONSUMO_INDEVIDO");
    }
    const result = await consultarDistribuicaoCte({
      ...contexto,
      ultNsu: cursor.ultNsu,
    });
    if (result.cStat === "656") {
      const blockedUntil = new Date(Date.now() + HORA_MS);
      await this.salvarCursor(enterpriseId, {
        ultNsu: cursor.ultNsu,
        maxNsu: result.maxNsu && result.maxNsu !== NSU_ZERO ? result.maxNsu : cursor.maxNsu,
        blockedUntil,
      });
      throw new ConflictError(bloqueioDfe(blockedUntil), "CTE_DFE_CONSUMO_INDEVIDO");
    }
    if (result.cStat === "589" && !recovered && cursor.ultNsu !== NSU_ZERO) {
      await this.salvarCursor(enterpriseId, {
        ultNsu: NSU_ZERO,
        maxNsu: null,
        blockedUntil: null,
      });
      return this.sincronizar(enterpriseId, true);
    }
    if (result.cStat !== "137" && result.cStat !== "138") {
      throw new BadRequestError(
        `SEFAZ rejeitou a distribuicao de CT-e: ${result.cStat} - ${result.xMotivo}`,
        "CTE_DFE_REJECTED",
      );
    }
    let procCTe = 0;
    let eventos = 0;
    for (const doc of result.documentos) {
      const tipo = classifyCteDocument(doc.schema, doc.xml);
      if (tipo === "evento") {
        eventos += 1;
        continue;
      }
      if (tipo !== "proc") continue;
      const parsed = parseProcCTe(doc.xml);
      if (!parsed) continue;
      await this.gravar(enterpriseId, contexto.cnpj, doc.xml, parsed);
      procCTe += 1;
    }
    const ultNsu = result.ultNsu ?? cursor.ultNsu;
    await this.salvarCursor(enterpriseId, {
      ultNsu,
      maxNsu: result.maxNsu,
      blockedUntil: null,
    });
    return {
      cStat: result.cStat,
      xMotivo: result.xMotivo,
      ultNsu,
      maxNsu: result.maxNsu,
      procCTe,
      eventos,
    };
  }

  public async porNota(enterpriseId: string, chaveNfe: string): Promise<ConhecimentoEntrada[]> {
    const chave = digits(chaveNfe);
    if (chave.length !== 44) return [];
    const rows = await db
      .select({
        id: cteDocuments.id,
        chave: cteDocuments.chave,
        number: cteDocuments.number,
        serie: cteDocuments.serie,
        emitCnpj: cteDocuments.emitCnpj,
        emitName: cteDocuments.emitName,
        freightValue: cteDocuments.freightValue,
        icmsRate: cteDocuments.icmsRate,
        notas: sql<number>`(
          select count(*)::int from cte_document_nfes vinculadas
          where vinculadas.cte_document_id = ${cteDocuments.id}
        )`,
      })
      .from(cteDocuments)
      .innerJoin(cteDocumentNfes, eq(cteDocumentNfes.cteDocumentId, cteDocuments.id))
      .where(and(eq(cteDocuments.enterpriseId, enterpriseId), eq(cteDocumentNfes.chave, chave)));
    const cnpjs = [...new Set(rows.map((row) => row.emitCnpj))];
    const carriers = await this.transportadores(enterpriseId, cnpjs);
    return rows.map((row) => {
      const sole = Number(row.notas) === 1;
      return {
        id: row.id,
        chave: row.chave,
        number: row.number,
        serie: row.serie,
        emitCnpj: row.emitCnpj,
        emitName: row.emitName,
        sole,
        freightValue: sole ? row.freightValue : null,
        incidenceRate: row.icmsRate,
        carrier: carriers.get(row.emitCnpj) ?? null,
      };
    });
  }

  private gravar = async (
    enterpriseId: string,
    enterpriseCnpj: string,
    xml: string,
    parsed: ProcCTeCompra,
  ) => {
    const xmlArquivo = cteProcXmlRelativePath({
      cnpj: enterpriseCnpj,
      emitCnpj: parsed.emitCnpj,
      dhEmi: parsed.dhEmi,
      chave: parsed.chave,
    });
    await writeNfeXmlFile(xmlArquivo, xml);
    const [saved] = await db
      .insert(cteDocuments)
      .values({
        enterpriseId,
        chave: parsed.chave,
        number: parsed.number,
        serie: parsed.serie,
        emitCnpj: parsed.emitCnpj,
        emitName: parsed.emitName,
        freightValue: parsed.freightValue,
        icmsRate: parsed.icmsRate,
        icmsValue: parsed.icmsValue,
        xmlArquivo,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [cteDocuments.enterpriseId, cteDocuments.chave],
        set: {
          number: parsed.number,
          serie: parsed.serie,
          emitCnpj: parsed.emitCnpj,
          emitName: parsed.emitName,
          freightValue: parsed.freightValue,
          icmsRate: parsed.icmsRate,
          icmsValue: parsed.icmsValue,
          xmlArquivo,
          updatedAt: new Date(),
        },
      })
      .returning({ id: cteDocuments.id });
    if (!saved) return;
    await db.delete(cteDocumentNfes).where(eq(cteDocumentNfes.cteDocumentId, saved.id));
    if (parsed.nfeChaves.length === 0) return;
    await db.insert(cteDocumentNfes).values(
      parsed.nfeChaves.map((chave) => ({ cteDocumentId: saved.id, chave })),
    );
  };

  private transportadores = async (enterpriseId: string, cnpjs: string[]) => {
    const mapa = new Map<string, ConhecimentoEntrada["carrier"]>();
    if (cnpjs.length === 0) return mapa;
    const rows = await db
      .select({
        memberId: enterprisesMembers.id,
        code: enterprisesMembers.code,
        name: users.userName,
        registration: users.userRegistration,
      })
      .from(enterprisesMembers)
      .innerJoin(users, eq(users.id, enterprisesMembers.userId))
      .where(
        and(
          eq(enterprisesMembers.enterpriseId, enterpriseId),
          eq(enterprisesMembers.class, "TRANSPORTADOR"),
          eq(enterprisesMembers.status, "ATIVO"),
          inArray(users.userRegistration, cnpjs),
        ),
      );
    for (const row of rows) {
      const registration = digits(row.registration);
      if (!registration || mapa.has(registration)) continue;
      mapa.set(registration, {
        memberId: row.memberId,
        code: row.code,
        name: row.name,
      });
    }
    return mapa;
  };

  private async contexto(enterpriseId: string) {
    const cnpj = await this.enterpriseCnpj(enterpriseId);
    const cUfAutor = await this.enterpriseCuf(enterpriseId);
    const { ambiente, certificate } = await nfeConfiguracaoService.loadCredentials(enterpriseId);
    if (ambiente !== 1 && ambiente !== 2) {
      throw new BadRequestError("Ambiente da nota fiscal invalido", "NFE_AMBIENTE_INVALID");
    }
    return { ambiente, certificate, cnpj, cUfAutor };
  }

  private async enterpriseCnpj(enterpriseId: string): Promise<string> {
    const [enterprise] = await db
      .select({ registration: enterprises.registration })
      .from(enterprises)
      .where(and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)))
      .limit(1);
    if (!enterprise) throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    const cnpj = digits(enterprise.registration);
    if (cnpj.length !== 14) {
      throw new BadRequestError("A consulta de CT-e exige CNPJ da empresa", "NFE_COMPRA_CNPJ");
    }
    return cnpj;
  }

  private async enterpriseCuf(enterpriseId: string): Promise<string> {
    const [address] = await db
      .select({ uf: states.acronym })
      .from(enterprisesAddress)
      .innerJoin(ceps, eq(ceps.id, enterprisesAddress.cepId))
      .innerJoin(cities, eq(cities.id, ceps.cityId))
      .innerJoin(states, eq(states.id, cities.stateId))
      .where(
        and(
          eq(enterprisesAddress.enterpriseId, enterpriseId),
          eq(enterprisesAddress.adressType, "PRINCIPAL"),
          isNull(enterprisesAddress.deletedAt),
          isNull(states.deletedAt),
        ),
      )
      .limit(1);
    const uf = address?.uf?.trim().toUpperCase() ?? "";
    if (!isUfSigla(uf)) {
      throw new BadRequestError(
        "Empresa sem endereco principal para consultar a distribuicao de CT-e",
        "NFE_DFE_UF_REQUIRED",
      );
    }
    return getCufFromUf(uf);
  }

  private async cursor(enterpriseId: string) {
    const [row] = await db
      .select({
        ultNsu: cteDfeCursors.ultNsu,
        maxNsu: cteDfeCursors.maxNsu,
        blockedUntil: cteDfeCursors.blockedUntil,
      })
      .from(cteDfeCursors)
      .where(eq(cteDfeCursors.enterpriseId, enterpriseId))
      .limit(1);
    return {
      ultNsu: row?.ultNsu ?? NSU_ZERO,
      maxNsu: row?.maxNsu ?? null,
      blockedUntil: row?.blockedUntil ?? null,
    };
  }

  private async salvarCursor(
    enterpriseId: string,
    input: { ultNsu: string; maxNsu: string | null; blockedUntil: Date | null },
  ) {
    await db
      .insert(cteDfeCursors)
      .values({
        enterpriseId,
        ultNsu: input.ultNsu,
        maxNsu: input.maxNsu,
        blockedUntil: input.blockedUntil,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: cteDfeCursors.enterpriseId,
        set: {
          ultNsu: input.ultNsu,
          maxNsu: input.maxNsu,
          blockedUntil: input.blockedUntil,
          updatedAt: new Date(),
        },
      });
  }
}

export const cteDistribuicaoService = new CteDistribuicaoService();
