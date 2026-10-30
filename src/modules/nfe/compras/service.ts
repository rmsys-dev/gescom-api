import { and, eq, isNull } from "drizzle-orm";
import {
  ceps,
  cities,
  db,
  enterprises,
  enterprisesAddress,
  nfeDfeCursors,
  nfeRecipientManifestations,
  states,
} from "../../../db/schema.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { nfeConfiguracaoService } from "../configuracao/service.js";
import { consultarDistribuicaoDfe } from "../sefaz/distribuicao.js";
import type { DistDfeParsed } from "../sefaz/distribuicao-xml.js";
import { getCufFromUf, isUfSigla } from "../sefaz/uf.js";
import { classifyDfeDocument } from "./proc-nfe.js";
import { persistInboundProcNFe, type CompraXmlGravada } from "./persist.js";

const HORA_MS = 60 * 60 * 1000;
const NSU_ZERO = "000000000000000";
const SAO_PAULO = "America/Sao_Paulo";

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
  return `A SEFAZ bloqueou a consulta de DF-e por consumo indevido. A consulta só pode ser executada ${when}`;
};

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

export type SincroniaCompras = {
  cStat: string;
  xMotivo: string;
  ultNsu: string;
  maxNsu: string | null;
  procNFe: number;
  resumos: number;
  eventos: number;
  notas: CompraXmlGravada[];
};

export class NfeCompraXmlService {
  public async porChave(enterpriseId: string, chave: string) {
    await this.assertCiencia(enterpriseId, chave);
    const contexto = await this.contexto(enterpriseId);
    const result = await consultarDistribuicaoDfe({
      ...contexto,
      chave,
    });
    if (result.cStat === "656") {
      const cursor = await this.cursor(enterpriseId);
      const blockedUntil = new Date(Date.now() + HORA_MS);
      await this.salvarCursor(enterpriseId, {
        ultNsu: cursor.ultNsu,
        maxNsu: result.maxNsu ?? cursor.maxNsu,
        blockedUntil,
      });
      throw new ConflictError(bloqueioDfe(blockedUntil), "NFE_DFE_CONSUMO_INDEVIDO");
    }
    this.assertDistribuicao(result);
    const proc = result.documentos.find(
      (doc) => classifyDfeDocument(doc.schema, doc.xml) === "proc",
    );
    if (!proc) {
      throw new BadRequestError(
        "A SEFAZ ainda nao liberou o procNFe desta chave. Registre a ciencia e consulte de novo",
        "NFE_DFE_RESUMO",
      );
    }
    const nota = await persistInboundProcNFe(
      enterpriseId,
      contexto.cnpj,
      proc.xml,
    );
    if (nota.chave !== chave) {
      throw new BadRequestError(
        "A SEFAZ devolveu o XML de outra chave de acesso",
        "NFE_DFE_REJECTED",
      );
    }
    return nota;
  }

  public async sincronizar(enterpriseId: string, recovered = false): Promise<SincroniaCompras> {
    const contexto = await this.contexto(enterpriseId);
    const cursor = await this.cursor(enterpriseId);
    if (cursor.blockedUntil && cursor.blockedUntil.getTime() > Date.now()) {
      throw new ConflictError(
        bloqueioDfe(cursor.blockedUntil),
        "NFE_DFE_CONSUMO_INDEVIDO",
      );
    }
    const result = await consultarDistribuicaoDfe({
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
      throw new ConflictError(bloqueioDfe(blockedUntil), "NFE_DFE_CONSUMO_INDEVIDO");
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
        `SEFAZ rejeitou a distribuicao: ${result.cStat} - ${result.xMotivo}`,
        "NFE_DFE_REJECTED",
      );
    }
    const notas: CompraXmlGravada[] = [];
    let procNFe = 0;
    let resumos = 0;
    let eventos = 0;
    for (const doc of result.documentos) {
      const tipo = classifyDfeDocument(doc.schema, doc.xml);
      if (tipo === "resumo") {
        resumos += 1;
        continue;
      }
      if (tipo === "evento") {
        eventos += 1;
        continue;
      }
      if (tipo !== "proc") continue;
      try {
        notas.push(
          await persistInboundProcNFe(enterpriseId, contexto.cnpj, doc.xml),
        );
        procNFe += 1;
      } catch (error) {
        if (
          error instanceof BadRequestError &&
          (error.code === "NFE_COMPRA_DESTINATARIO" ||
            error.code === "NFE_COMPRA_XML_INVALID")
        ) {
          continue;
        }
        if (
          error instanceof ConflictError &&
          error.code === "NFE_COMPRA_CHAVE_PROPRIA"
        ) {
          continue;
        }
        throw error;
      }
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
      procNFe,
      resumos,
      eventos,
      notas,
    };
  }

  public async upload(enterpriseId: string, xml: string) {
    const cnpj = await this.enterpriseCnpj(enterpriseId);
    return persistInboundProcNFe(enterpriseId, cnpj, xml);
  }

  private assertDistribuicao(result: DistDfeParsed): void {
    if (result.cStat === "656") {
      throw new ConflictError(
        bloqueioDfe(new Date(Date.now() + HORA_MS)),
        "NFE_DFE_CONSUMO_INDEVIDO",
      );
    }
    if (result.cStat !== "138") {
      throw new BadRequestError(
        `SEFAZ rejeitou a distribuicao: ${result.cStat} - ${result.xMotivo}`,
        result.cStat === "137" ? "NFE_DFE_RESUMO" : "NFE_DFE_REJECTED",
      );
    }
  }

  private async assertCiencia(enterpriseId: string, chave: string) {
    const rows = await db
      .select({ eventType: nfeRecipientManifestations.eventType })
      .from(nfeRecipientManifestations)
      .where(
        and(
          eq(nfeRecipientManifestations.enterpriseId, enterpriseId),
          eq(nfeRecipientManifestations.chave, chave),
        ),
      );
    const liberada = rows.some(
      (row) => row.eventType === "CIENCIA" || row.eventType === "CONFIRMACAO",
    );
    if (!liberada) {
      throw new BadRequestError(
        "Registre a ciencia ou a confirmacao da operacao antes de buscar o XML",
        "NFE_DFE_CIENCIA_REQUIRED",
      );
    }
  }

  private async contexto(enterpriseId: string) {
    const cnpj = await this.enterpriseCnpj(enterpriseId);
    const cUfAutor = await this.enterpriseCuf(enterpriseId);
    const { ambiente, certificate } =
      await nfeConfiguracaoService.loadCredentials(enterpriseId);
    return { ambiente: tpAmbOf(ambiente), certificate, cnpj, cUfAutor };
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
        "A nota de compra exige CNPJ da empresa",
        "NFE_COMPRA_CNPJ",
      );
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
        "Empresa sem endereco principal para consultar a distribuicao de DF-e",
        "NFE_DFE_UF_REQUIRED",
      );
    }
    return getCufFromUf(uf);
  }

  private async cursor(enterpriseId: string) {
    const [row] = await db
      .select({
        ultNsu: nfeDfeCursors.ultNsu,
        maxNsu: nfeDfeCursors.maxNsu,
        blockedUntil: nfeDfeCursors.blockedUntil,
      })
      .from(nfeDfeCursors)
      .where(eq(nfeDfeCursors.enterpriseId, enterpriseId))
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
      .insert(nfeDfeCursors)
      .values({
        enterpriseId,
        ultNsu: input.ultNsu,
        maxNsu: input.maxNsu,
        blockedUntil: input.blockedUntil,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: nfeDfeCursors.enterpriseId,
        set: {
          ultNsu: input.ultNsu,
          maxNsu: input.maxNsu,
          blockedUntil: input.blockedUntil,
          updatedAt: new Date(),
        },
      });
  }
}

export const nfeCompraXmlService = new NfeCompraXmlService();
