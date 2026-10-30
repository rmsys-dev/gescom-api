import { and, eq, isNull } from "drizzle-orm";
import { db, nfeHeaders } from "../../../db/schema.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import {
  BadRequestError,
  ConflictError,
} from "../../../shared/errors/app-error.js";
import { nfeInboundXmlRelativePath } from "../sefaz/xml-path.js";
import { writeNfeXmlFile } from "../sefaz/xml-store.js";
import { parseProcNFeCompra, type ProcNFeCompra } from "./proc-nfe.js";

export type CompraXmlGravada = {
  id: string;
  chave: string;
  xmlArquivo: string;
  criada: boolean;
};

const gravarArquivo = async (
  enterpriseCnpj: string,
  nota: ProcNFeCompra,
  xml: string,
): Promise<string> => {
  const xmlArquivo = nfeInboundXmlRelativePath({
    cnpj: enterpriseCnpj,
    emitCnpj: nota.emitCnpj || nota.chave.slice(6, 20),
    dhEmi: nota.dhEmi,
    chave: nota.chave,
  });
  await writeNfeXmlFile(xmlArquivo, xml);
  return xmlArquivo;
};

const atualizarCaminho = async (
  id: string,
  nota: ProcNFeCompra,
  xmlArquivo: string,
): Promise<void> => {
  await db
    .update(nfeHeaders)
    .set({
      xmlArquivo,
      nProt: nota.nProt,
      cStat: nota.cStat,
      xMotivo: nota.xMotivo,
      dhRecbto: nota.dhRecbto,
      digVal: nota.digVal,
      updatedAt: new Date(),
    })
    .where(eq(nfeHeaders.id, id));
};

export const persistInboundProcNFe = async (
  enterpriseId: string,
  enterpriseCnpj: string,
  xml: string,
): Promise<CompraXmlGravada> => {
  const nota = parseProcNFeCompra(xml);
  if (nota.destCnpj !== enterpriseCnpj) {
    throw new BadRequestError(
      "O destinatario do procNFe nao e o CNPJ desta empresa",
      "NFE_COMPRA_DESTINATARIO",
    );
  }
  const [existente] = await db
    .select({
      id: nfeHeaders.id,
      issuanceType: nfeHeaders.issuanceType,
    })
    .from(nfeHeaders)
    .where(
      and(
        eq(nfeHeaders.enterpriseId, enterpriseId),
        eq(nfeHeaders.chave, nota.chave),
        isNull(nfeHeaders.deletedAt),
      ),
    )
    .limit(1);
  if (existente?.issuanceType === "PROPRIA") {
    throw new ConflictError(
      "Esta chave ja pertence a uma nota emitida pela empresa",
      "NFE_COMPRA_CHAVE_PROPRIA",
    );
  }
  const xmlArquivo = await gravarArquivo(enterpriseCnpj, nota, xml);
  if (existente) {
    await atualizarCaminho(existente.id, nota, xmlArquivo);
    return { id: existente.id, chave: nota.chave, xmlArquivo, criada: false };
  }
  try {
    const [row] = await db
      .insert(nfeHeaders)
      .values({
        enterpriseId,
        issuanceType: "TERCEIRO",
        moviments: "ENTRADA",
        status: "AUTORIZADA",
        chave: nota.chave,
        cUf: nota.cUf,
        cNf: nota.cNf,
        mod: "55",
        serie: nota.serie,
        nNf: nota.nNf,
        dhEmi: nota.dhEmi,
        cMunFg: nota.cMunFg,
        tpEmis: nota.tpEmis,
        tpAmb: nota.tpAmb,
        cDv: nota.chave.slice(43),
        emitCnpj: nota.emitCnpj || null,
        emitCpf: nota.emitCpf,
        emitXNome: nota.emitXNome,
        destCnpj: nota.destCnpj || null,
        destCpf: nota.destCpf,
        nProt: nota.nProt,
        cStat: nota.cStat,
        xMotivo: nota.xMotivo,
        dhRecbto: nota.dhRecbto,
        digVal: nota.digVal,
        vNf: nota.vNf,
        xmlArquivo,
      })
      .returning({ id: nfeHeaders.id });
    if (!row) {
      throw new BadRequestError(
        "Nao foi possivel gravar o cabecalho da nota de compra",
        "NFE_COMPRA_XML_INVALID",
      );
    }
    return { id: row.id, chave: nota.chave, xmlArquivo, criada: true };
  } catch (error) {
    if (!isPostgresUniqueViolation(error)) throw error;
    const [again] = await db
      .select({
        id: nfeHeaders.id,
        issuanceType: nfeHeaders.issuanceType,
      })
      .from(nfeHeaders)
      .where(
        and(
          eq(nfeHeaders.enterpriseId, enterpriseId),
          eq(nfeHeaders.chave, nota.chave),
          isNull(nfeHeaders.deletedAt),
        ),
      )
      .limit(1);
    if (!again || again.issuanceType === "PROPRIA") {
      throw new ConflictError(
        "Esta chave ja pertence a uma nota emitida pela empresa",
        "NFE_COMPRA_CHAVE_PROPRIA",
      );
    }
    await atualizarCaminho(again.id, nota, xmlArquivo);
    return { id: again.id, chave: nota.chave, xmlArquivo, criada: false };
  }
};
