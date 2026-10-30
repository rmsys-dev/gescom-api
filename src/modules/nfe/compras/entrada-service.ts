import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import {
  ceps,
  cfops,
  cfopsEnterprises,
  cities,
  db,
  enterprisesMembers,
  nfeDuplicates,
  nfeEntryTransports,
  nfeSupplierProductLinks,
  nfeHeaders,
  nfeItemTaxes,
  nfePayments,
  paymentTypesMethodsFlags,
  measurementUnits,
  nfeItems,
  prices,
  stockMovements,
  productGroups,
  products,
  productsEnterprises,
  users,
  usersAddress,
  usersTaxInfos,
} from "../../../db/schema.js";
import {
  recordCreateAudit,
  withEnterpriseAuditContext,
} from "../../../shared/audit/entity-audit.js";
import type { EntityAuditContext } from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { isValidGtin, normalizeCpfCnpj } from "../../../shared/validation/data-normalizers.js";
import { createUser } from "../../auth/repository.js";
import { asDateOnly } from "../../financial/money.js";
import {
  createFreightPayableInTx,
  createPayableFromNfeInTx,
  voidPayablesOfNfeInTx,
} from "../../financial/service.js";
import { resolveMemberCode } from "../../memberships/member-code.js";
import { productsEnterprisesService } from "../../products/products-enterprises/service.js";
import type { CreateProductEnterprisePayloadInput } from "../../products/products-enterprises/schema.js";
import { getProductEnterpriseForStock, getStockBalance } from "../../stock/balance.js";
import {
  createStockMovementInTx,
  stockMovementExistsByDocumentRef,
} from "../../stock/movement.js";
import { readStoredNfeXml } from "../sefaz/xml-store.js";
import { sugerirCfopEntrada } from "./entrada-cfop.js";
import {
  custoMedioPonderado,
  custoUnitarioComFrete,
  custoUnitarioEntrada,
  parcelasFreteEntrada,
  precoVendaSugerido,
} from "./entrada-custo.js";
import { paraCentavos } from "./conferencia.js";
import { cteDistribuicaoService } from "./cte-service.js";
import { conferirEntrada, mensagemBloqueio } from "./entrada-conferir.js";
import type {
  LancarEntradaInput,
  LancarEntradaItemInput,
} from "./entrada-schema.js";
import {
  parseEntradaProcNFe,
  type EntradaEmitente,
  type EntradaItemXml,
  type EntradaProcNFe,
} from "./entrada-xml.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const ORIGENS = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8"]);

const eanUtil = (ean: string | null): string | null => {
  const text = ean?.trim();
  if (!text || text.toUpperCase() === "SEM GTIN") return null;
  return text;
};

const documentoEmitente = (cnpj: string | null | undefined, cpf: string | null | undefined): string | null => {
  const empresa = normalizeCpfCnpj(cnpj ?? "");
  if (/^\d{14}$/.test(empresa)) return empresa;
  const pessoa = normalizeCpfCnpj(cpf ?? "");
  if (/^\d{11}$/.test(pessoa)) return pessoa;
  return null;
};

type SugestaoProduto = {
  productsEnterprisesId: string;
  code: number | null;
  description: string;
  barCode: string | null;
  precoVenda: string | null;
  custoMedio: string | null;
  profitMargin: number | null;
  controlsBatch: boolean;
  controlsRental: boolean;
  unit: string | null;
};

const money2 = (value: number): string => value.toFixed(2);

const resumoEndereco = (emitente: EntradaEmitente): string | null => {
  const cidade = [emitente.municipio, emitente.uf].filter(Boolean).join("/");
  const texto = [
    emitente.logradouro,
    emitente.numero,
    emitente.complemento,
    emitente.bairro,
    cidade || null,
    emitente.cep ? `CEP ${emitente.cep}` : null,
    emitente.ie ? `IE ${emitente.ie}` : null,
  ]
    .filter((parte): parte is string => Boolean(parte))
    .join(", ");
  return texto ? texto.slice(0, 500) : null;
};

const contarItensXml = (xml: string | null) => xml?.match(/<det\b/g)?.length ?? 0;

const dataDaEntrada = (iso: string | undefined) => {
  if (!iso) return new Date();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new BadRequestError("Data da entrada invalida", "NFE_ENTRADA_DATA");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day ||
    year < 1900 ||
    year > 2100
  ) {
    throw new BadRequestError("Data da entrada invalida", "NFE_ENTRADA_DATA");
  }
  return new Date(`${iso}T15:00:00.000Z`);
};

export class NfeEntradaService {
  private comQuantidadeItens = async <T extends { xmlArquivo: string | null }>(rows: T[]) => {
    return Promise.all(
      rows.map(async (row) => {
        const xml = await readStoredNfeXml(row.xmlArquivo).catch(() => null);
        const { xmlArquivo: _arquivo, ...resto } = row;
        return { ...resto, qtdItens: contarItensXml(xml) };
      }),
    );
  };

  public listarPendentes = async (enterpriseId: string) => {
    const rows = await db
      .select({
        id: nfeHeaders.id,
        chave: nfeHeaders.chave,
        nNf: nfeHeaders.nNf,
        serie: nfeHeaders.serie,
        dhEmi: nfeHeaders.dhEmi,
        emitCnpj: nfeHeaders.emitCnpj,
        emitXNome: nfeHeaders.emitXNome,
        vNf: nfeHeaders.vNf,
        xmlArquivo: nfeHeaders.xmlArquivo,
      })
      .from(nfeHeaders)
      .where(
        and(
          eq(nfeHeaders.enterpriseId, enterpriseId),
          eq(nfeHeaders.issuanceType, "TERCEIRO"),
          eq(nfeHeaders.moviments, "ENTRADA"),
          isNull(nfeHeaders.entryDate),
          isNull(nfeHeaders.entryDispensedAt),
          isNotNull(nfeHeaders.xmlArquivo),
          isNull(nfeHeaders.deletedAt),
        ),
      )
      .orderBy(desc(nfeHeaders.dhEmi))
      .limit(200);
    return this.comQuantidadeItens(rows);
  };

  public listarDispensadas = async (enterpriseId: string) => {
    const rows = await db
      .select({
        id: nfeHeaders.id,
        chave: nfeHeaders.chave,
        nNf: nfeHeaders.nNf,
        serie: nfeHeaders.serie,
        dhEmi: nfeHeaders.dhEmi,
        emitCnpj: nfeHeaders.emitCnpj,
        emitXNome: nfeHeaders.emitXNome,
        vNf: nfeHeaders.vNf,
        xmlArquivo: nfeHeaders.xmlArquivo,
      })
      .from(nfeHeaders)
      .where(
        and(
          eq(nfeHeaders.enterpriseId, enterpriseId),
          eq(nfeHeaders.issuanceType, "TERCEIRO"),
          eq(nfeHeaders.moviments, "ENTRADA"),
          isNull(nfeHeaders.entryDate),
          isNotNull(nfeHeaders.entryDispensedAt),
          isNotNull(nfeHeaders.xmlArquivo),
          isNull(nfeHeaders.deletedAt),
        ),
      )
      .orderBy(desc(nfeHeaders.entryDispensedAt))
      .limit(200);
    return this.comQuantidadeItens(rows);
  };

  public dispensar = async (enterpriseId: string, nfeId: string) => {
    const header = await this.cabecalhoEntrada(enterpriseId, nfeId);
    if (header.entryDate) {
      throw new ConflictError("Esta nota de compra ja foi lancada", "NFE_ENTRADA_JA_LANCADA");
    }
    if (!header.entryDispensedAt) {
      await db
        .update(nfeHeaders)
        .set({ entryDispensedAt: new Date(), updatedAt: new Date() })
        .where(eq(nfeHeaders.id, header.id));
    }
    return { id: header.id, dispensada: true };
  };

  public repor = async (enterpriseId: string, nfeId: string) => {
    const header = await this.cabecalhoEntrada(enterpriseId, nfeId);
    if (header.entryDate) {
      throw new ConflictError("Esta nota de compra ja foi lancada", "NFE_ENTRADA_JA_LANCADA");
    }
    await db
      .update(nfeHeaders)
      .set({ entryDispensedAt: null, updatedAt: new Date() })
      .where(eq(nfeHeaders.id, header.id));
    return { id: header.id, dispensada: false };
  };

  public previa = async (enterpriseId: string, nfeId: string) => {
    const nota = await this.lerNota(enterpriseId, nfeId);
    const conferencia = conferirEntrada(nota.itens, nota.totais);
    const documento = documentoEmitente(nota.emitCnpj, nota.emitCpf);
    const [sugestoes, vinculos] = await Promise.all([
      this.sugestoesPorEan(enterpriseId, conferencia.itens),
      this.vinculosPorCprod(enterpriseId, documento, conferencia.itens),
    ]);
    return {
      id: nfeId,
      chave: nota.chave,
      nNf: nota.nNf,
      serie: nota.serie,
      dhEmi: nota.dhEmi,
      emitCnpj: nota.emitCnpj,
      emitCpf: nota.emitCpf,
      emitXNome: nota.emitXNome,
      emitente: nota.emitente,
      fornecedor: await this.buscarFornecedor(enterpriseId, nota),
      totais: nota.totais,
      duplicatas: nota.duplicatas,
      itens: conferencia.itens.map((item) => {
        const custo = custoUnitarioEntrada({
          vProd: item.vProd,
          vDesc: item.vDesc,
          vFrete: item.vFrete,
          vSeg: item.vSeg,
          vOutro: item.vOutro,
          vIpi: item.imposto.ipiVIpi,
          vIcmsSt: item.imposto.icmsVIcmsSt,
          qCom: item.qCom,
        });
        const cProd = item.cProd?.trim() ?? "";
        const vinculado = cProd ? vinculos.get(cProd) : undefined;
        const sugestao = vinculado
          ? [vinculado]
          : eanUtil(item.cEan)
            ? (sugestoes.get(eanUtil(item.cEan)!) ?? [])
            : [];
        const margem =
          sugestao.length === 1 ? sugestao[0]?.profitMargin ?? null : null;
        return {
          ...item,
          cfopXml: item.cfop,
          cfopSugerido: sugerirCfopEntrada(item.cfop),
          custoUnitario: custo,
          precoVendaSugerido:
            custo === null
              ? null
              : precoVendaSugerido(Number(custo), margem),
          sugestoes: sugestao.map(({ profitMargin: _margem, ...row }) => row),
        };
      }),
      conferencia: {
        ajustes: conferencia.ajustes,
        bloqueios: conferencia.bloqueios.map((bloqueio) => ({
          ...bloqueio,
          mensagem: mensagemBloqueio(bloqueio),
        })),
      },
      conhecimentos: await cteDistribuicaoService.porNota(enterpriseId, nota.chave),
    };
  };

  public conhecimentos = async (enterpriseId: string, nfeId: string) => {
    const header = await this.cabecalhoEntrada(enterpriseId, nfeId);
    return cteDistribuicaoService.porNota(enterpriseId, header.chave);
  };

  public lancar = async (
    enterpriseId: string,
    nfeId: string,
    input: LancarEntradaInput,
    userId: string | null,
    audit: EntityAuditContext,
  ) => {
    const nota = await this.lerNota(enterpriseId, nfeId);
    this.assertItensInformados(nota, input);
    const conferencia = conferirEntrada(nota.itens, nota.totais);
    if (conferencia.bloqueios.length > 0) {
      throw new BadRequestError(
        conferencia.bloqueios.map(mensagemBloqueio).join("; "),
        "NFE_ENTRADA_CONFERENCIA",
      );
    }
    const cfopsPorItem = await this.resolverCfops(enterpriseId, conferencia.itens, input);
    for (const pedido of input.itens) {
      if (!pedido.produto) continue;
      const item = conferencia.itens.find((row) => row.nItem === pedido.nItem);
      await productsEnterprisesService.assertEnterprisePayload(enterpriseId, {
        ...pedido.produto,
        description: pedido.produto.description ?? item?.xProd ?? "Produto",
      });
    }

    const entradaEm = dataDaEntrada(input.entryDate);
    return db.transaction(async (tx) => {
      const header = await this.travarCabecalho(tx, enterpriseId, nfeId);
      const pagamento = await this.gravarPagamentos(
        tx,
        enterpriseId,
        header.id,
        Number(nota.totais.vNf ?? nota.totais.vLiq ?? 0),
        input.pagamentos,
      );
      const memberId = await this.resolverFornecedor(
        tx,
        enterpriseId,
        nota,
        input.memberId,
        userId,
        audit,
      );
      const produtos = new Map<number, string>();
      for (const pedido of input.itens) {
        const item = conferencia.itens.find((row) => row.nItem === pedido.nItem);
        if (!item) continue;
        const productsEnterprisesId = pedido.productsEnterprisesId
          ? pedido.productsEnterprisesId
          : await this.criarProduto(tx, enterpriseId, item, pedido, audit);
        produtos.set(pedido.nItem, productsEnterprisesId);
      }
      await this.gravarVinculosCprod(
        tx,
        enterpriseId,
        documentoEmitente(nota.emitCnpj, nota.emitCpf),
        conferencia.itens,
        produtos,
      );

      await tx.delete(nfeItems).where(eq(nfeItems.nfeHeaderId, nfeId));
      await tx.delete(nfeDuplicates).where(eq(nfeDuplicates.nfeHeaderId, nfeId));

      for (const item of conferencia.itens) {
        const productsEnterprisesId = produtos.get(item.nItem);
        if (!productsEnterprisesId) {
          throw new BadRequestError(
            `Item ${item.nItem} sem produto vinculado`,
            "NFE_ENTRADA_PRODUTO",
          );
        }
        const [created] = await tx
          .insert(nfeItems)
          .values({
            nfeHeaderId: nfeId,
            productsEnterprisesId,
            nItem: item.nItem,
            cProd: item.cProd,
            cEan: item.cEan,
            xProd: item.xProd,
            ncm: item.ncm,
            cest: item.cest,
            cfop: cfopsPorItem.get(item.nItem) ?? item.cfop,
            uCom: item.uCom,
            qCom: item.qCom,
            vUnCom: item.vUnCom,
            vProd: item.vProd,
            uTrib: item.uTrib,
            qTrib: item.qTrib,
            vUnTrib: item.vUnTrib,
            vFrete: item.vFrete,
            vSeg: item.vSeg,
            vDesc: item.vDesc,
            vOutro: item.vOutro,
            indTot: item.indTot,
          })
          .returning({ id: nfeItems.id });
        if (!created) {
          throw new BadRequestError(
            "Nao foi possivel gravar o item da entrada",
            "NFE_ENTRADA_ITEM",
          );
        }
        const tax = item.imposto;
        const pedido = input.itens.find((row) => row.nItem === item.nItem);
        const origem = tax.icmsOrig && ORIGENS.has(tax.icmsOrig) ? tax.icmsOrig : null;
        await tx.insert(nfeItemTaxes).values({
          nfeItemId: created.id,
          vTotTrib: tax.vTotTrib,
          icmsGrupo: tax.icmsGrupo,
          icmsOrig: origem as "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | null,
          icmsCst: tax.icmsCst,
          icmsCsosn: tax.icmsCsosn,
          icmsModBc: tax.icmsModBc,
          icmsVBc: tax.icmsVBc,
          icmsPIcms: tax.icmsPIcms,
          icmsVIcms: tax.icmsVIcms,
          icmsPFcp: tax.icmsPFcp,
          icmsVFcp: tax.icmsVFcp,
          icmsPRedBc: tax.icmsPRedBc,
          icmsVIcmsDeson: tax.icmsVIcmsDeson,
          icmsMotDesIcms: tax.icmsMotDesIcms,
          icmsIndDeduzDeson: tax.icmsIndDeduzDeson,
          icmsModBcSt: tax.icmsModBcSt,
          icmsPMvaSt: tax.icmsPMvaSt,
          icmsPRedBcSt: tax.icmsPRedBcSt,
          icmsVBcSt: tax.icmsVBcSt,
          icmsPIcmsSt: tax.icmsPIcmsSt,
          icmsVIcmsSt: tax.icmsVIcmsSt,
          icmsVBcFcpSt: tax.icmsVBcFcpSt,
          icmsPFcpSt: tax.icmsPFcpSt,
          icmsVFcpSt: tax.icmsVFcpSt,
          icmsVBcFcpStRet: tax.icmsVBcFcpStRet,
          icmsPFcpStRet: tax.icmsPFcpStRet,
          icmsVFcpStRet: tax.icmsVFcpStRet,
          ipiCst: tax.ipiCst,
          ipiCEnq: tax.ipiCEnq,
          ipiVBc: tax.ipiVBc,
          ipiPIpi: tax.ipiPIpi,
          ipiVIpi: tax.ipiVIpi,
          pisGrupo: tax.pisGrupo,
          pisCst: pedido?.pisCst ?? tax.pisCst,
          pisVBc: tax.pisVBc,
          pisPPis: tax.pisPPis,
          pisVPis: pedido?.pisValue != null ? pedido.pisValue.toFixed(2) : tax.pisVPis,
          cofinsGrupo: tax.cofinsGrupo,
          cofinsCst: pedido?.cofinsCst ?? tax.cofinsCst,
          cofinsVBc: tax.cofinsVBc,
          cofinsPCofins: tax.cofinsPCofins,
          cofinsVCofins: pedido?.cofinsValue != null ? pedido.cofinsValue.toFixed(2) : tax.cofinsVCofins,
          iiVIi: tax.iiVIi,
          vIpiDevol: tax.vIpiDevol,
          ibsCbsCst: tax.ibsCbsCst,
          ibsCbsCClassTrib: tax.ibsCbsCClassTrib,
          ibsCbsVBc: tax.ibsCbsVBc,
          ibsUfPIbs: tax.ibsUfPIbs,
          ibsUfVIbs: tax.ibsUfVIbs,
          ibsMunPIbs: tax.ibsMunPIbs,
          ibsMunVIbs: tax.ibsMunVIbs,
          ibsVIbs: tax.ibsVIbs,
          cbsPCbs: tax.cbsPCbs,
          cbsVCbs: tax.cbsVCbs,
          isCst: tax.isCst,
          isCClassTrib: tax.isCClassTrib,
          isVBc: tax.isVBc,
          isPIs: tax.isPIs,
          isVIs: tax.isVIs,
        });
      }

      if (nota.duplicatas.length > 0) {
        await tx.insert(nfeDuplicates).values(
          nota.duplicatas.map((dup) => ({
            nfeHeaderId: nfeId,
            nDup: dup.nDup,
            dVenc: dup.dVenc,
            vDup: dup.vDup,
          })),
        );
      }

      await tx
        .update(nfeHeaders)
        .set({
          ...nota.totais,
          emitMemberId: memberId,
          entryDate: entradaEm,
          updatedAt: new Date(),
        })
        .where(eq(nfeHeaders.id, header.id));

      const freteCentavos = await this.gravarTransportes(
        tx,
        enterpriseId,
        header.id,
        input.transportes ?? [],
      );
      const parcelas = parcelasFreteEntrada(conferencia.itens, freteCentavos);
      if (!parcelas) {
        throw new BadRequestError(
          "Frete sem valor de produto para ratear",
          "NFE_ENTRADA_FRETE",
        );
      }

      const lancados = [];
      for (const item of conferencia.itens) {
        const productsEnterprisesId = produtos.get(item.nItem)!;
        const pedido = input.itens.find((row) => row.nItem === item.nItem)!;
        const custo = custoUnitarioComFrete({
          vProd: item.vProd,
          vDesc: item.vDesc,
          vFrete: item.vFrete,
          vSeg: item.vSeg,
          vOutro: item.vOutro,
          vIpi: item.imposto.ipiVIpi,
          vIcmsSt: item.imposto.icmsVIcmsSt,
          qCom: item.qCom,
        }, parcelas.get(item.nItem) ?? 0);
        if (custo === null || Number(custo) < 0) {
          throw new BadRequestError(
            `Custo do item ${item.nItem} invalido`,
            "NFE_ENTRADA_CUSTO",
          );
        }
        const referencia = `COMPRA:${nfeId}:ITEM:${item.nItem}`;
        if (await stockMovementExistsByDocumentRef(tx, referencia)) {
          throw new ConflictError(
            `Estoque do item ${item.nItem} ja foi movimentado`,
            "NFE_ENTRADA_ESTOQUE_DUPLICADO",
          );
        }
        const preco = await this.atualizarPreco(tx, enterpriseId, productsEnterprisesId, {
          quantidade: Number(item.qCom),
          custoUnitario: Number(custo),
          precoInformado: pedido.precoVenda,
        });
        await createStockMovementInTx(tx, {
          enterpriseId,
          userId,
          input: {
            type: "COMPRA",
            productsEnterprisesId,
            quantity: Number(item.qCom),
            toLocationsId: pedido.toLocationsId,
            toStockBatchId: pedido.toStockBatchId,
            documentRef: referencia,
            notes: `Entrada da NF-e ${nota.chave}`,
          },
        });
        await tx
          .update(nfeItems)
          .set({ entryUnitCost: custo, entrySalePrice: preco, updatedAt: new Date() })
          .where(and(eq(nfeItems.nfeHeaderId, header.id), eq(nfeItems.nItem, item.nItem)));
        lancados.push({
          nItem: item.nItem,
          productsEnterprisesId,
          custoUnitario: custo,
          precoVenda: preco,
        });
      }

      const titleId = await createPayableFromNfeInTx(tx, enterpriseId, {
        nfeHeaderId: header.id,
        memberId,
        paymentTypesId: pagamento.paymentTypesId,
        installments: pagamento.installments,
      });
      await this.lancarFretes(
        tx,
        enterpriseId,
        header.id,
        userId,
        input.entryDate ?? asDateOnly(entradaEm),
        input.transportes ?? [],
      );

      return {
        id: header.id,
        chave: nota.chave,
        entryDate: entradaEm,
        emitMemberId: memberId,
        titleId,
        ajustes: conferencia.ajustes,
        itens: lancados,
      };
    });
  };

  public excluir = async (enterpriseId: string, nfeId: string, userId: string | null) => {
    return db.transaction(async (tx) => {
      const [header] = await tx
        .select({
          id: nfeHeaders.id,
          chave: nfeHeaders.chave,
          entryDate: nfeHeaders.entryDate,
          issuanceType: nfeHeaders.issuanceType,
          moviments: nfeHeaders.moviments,
        })
        .from(nfeHeaders)
        .where(
          and(
            eq(nfeHeaders.id, nfeId),
            eq(nfeHeaders.enterpriseId, enterpriseId),
            isNull(nfeHeaders.deletedAt),
          ),
        )
        .for("update")
        .limit(1);
      if (!header) {
        throw new NotFoundError(
          "Nota de compra nao encontrada",
          "NFE_ENTRADA_NAO_ENCONTRADA",
        );
      }
      if (header.issuanceType !== "TERCEIRO" || header.moviments !== "ENTRADA") {
        throw new BadRequestError(
          "Somente nota de compra pode ter o lancamento excluido",
          "NFE_ENTRADA_NAO_COMPRA",
        );
      }
      if (!header.entryDate) {
        throw new ConflictError(
          "Esta nota de compra ainda nao foi lancada",
          "NFE_ENTRADA_NAO_LANCADA",
        );
      }

      await this.estornarEstoque(tx, enterpriseId, header.id, header.chave, userId);
      await voidPayablesOfNfeInTx(tx, enterpriseId, header.id, userId);
      await tx.delete(nfePayments).where(eq(nfePayments.nfeHeaderId, header.id));
      await tx.delete(nfeEntryTransports).where(eq(nfeEntryTransports.nfeHeaderId, header.id));
      await tx
        .update(nfeHeaders)
        .set({ entryDate: null, updatedAt: new Date() })
        .where(eq(nfeHeaders.id, header.id));
      return { id: header.id, chave: header.chave };
    });
  };

  private estornarEstoque = async (
    tx: Tx,
    enterpriseId: string,
    nfeId: string,
    chave: string,
    userId: string | null,
  ) => {
    const movements = await tx
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.type, "COMPRA"),
          sql`${stockMovements.documentRef} ~ ${`^COMPRA:${nfeId}:ITEM:[0-9]+$`}`,
        ),
      )
      .orderBy(desc(stockMovements.createdAt));
    const itens = await tx
      .select({ nItem: nfeItems.nItem, entryUnitCost: nfeItems.entryUnitCost })
      .from(nfeItems)
      .where(eq(nfeItems.nfeHeaderId, nfeId));
    const custoPorItem = new Map(itens.map((item) => [item.nItem, item.entryUnitCost]));

    const porProduto = new Map<string, typeof movements>();
    for (const movement of movements) {
      const linhas = porProduto.get(movement.productsEnterprisesId) ?? [];
      linhas.push(movement);
      porProduto.set(movement.productsEnterprisesId, linhas);
    }
    for (const [productsEnterprisesId, linhas] of porProduto) {
      await this.reverterCusto(tx, enterpriseId, productsEnterprisesId, linhas, custoPorItem);
    }

    for (const movement of movements) {
      const referencia = movement.documentRef ?? "";
      await createStockMovementInTx(tx, {
        enterpriseId,
        userId,
        input: {
          type: "SAIDA",
          productsEnterprisesId: movement.productsEnterprisesId,
          quantity: Number(movement.quantity),
          fromLocationsId: movement.toLocationsId ?? undefined,
          fromStockBatchId: movement.toStockBatchId,
          documentRef: `${referencia}:ESTORNO`,
          notes: `Exclusao da entrada da NF-e ${chave}`,
        },
      });
      await tx
        .update(stockMovements)
        .set({ documentRef: `${referencia}:EXCLUIDA` })
        .where(eq(stockMovements.id, movement.id));
    }
  };

  /** Devolve custo e custo médio só enquanto esta entrada ainda é o custo vigente do produto. */
  private reverterCusto = async (
    tx: Tx,
    enterpriseId: string,
    productsEnterprisesId: string,
    linhas: Array<{ documentRef: string | null; quantity: string }>,
    custoPorItem: Map<number, string | null>,
  ) => {
    const produto = await getProductEnterpriseForStock(enterpriseId, productsEnterprisesId, tx);
    let saldo = await getStockBalance(tx, { productsEnterprises: produto, lock: true });
    const [preco] = await tx
      .select({
        id: prices.id,
        priceCost: prices.priceCost,
        previousCost: prices.previousCost,
        averageCost: prices.averageCost,
      })
      .from(prices)
      .where(eq(prices.productsEnterprisesId, productsEnterprisesId))
      .limit(1);
    if (!preco) return;

    let priceCost = preco.priceCost === null ? null : Number(preco.priceCost);
    let previousCost = preco.previousCost === null ? null : Number(preco.previousCost);
    let averageCost = preco.averageCost === null ? null : Number(preco.averageCost);

    for (const linha of linhas) {
      const quantidade = Number(linha.quantity);
      const nItem = Number(/^COMPRA:[0-9a-f-]+:ITEM:(\d+)$/i.exec(linha.documentRef ?? "")?.[1]);
      const gravado = custoPorItem.get(nItem);
      const custo = gravado === null || gravado === undefined ? null : Number(gravado);
      const vigente =
        custo !== null &&
        priceCost !== null &&
        custo.toFixed(4) === priceCost.toFixed(4);
      const saldoAntes = saldo - quantidade;
      if (vigente && saldoAntes >= 0) {
        const medioAntes =
          saldoAntes > 0 && averageCost !== null
            ? (averageCost * saldo - quantidade * custo) / saldoAntes
            : null;
        const custoAntes = previousCost;
        await tx
          .update(prices)
          .set({
            priceCost: custoAntes === null ? null : custoAntes.toFixed(4),
            actualRealCost: custoAntes === null ? null : custoAntes.toFixed(4),
            averageCost: medioAntes === null ? null : medioAntes.toFixed(4),
            previousCost: null,
            updatedAt: new Date(),
          })
          .where(eq(prices.id, preco.id));
        priceCost = custoAntes;
        previousCost = null;
        averageCost = medioAntes;
      }
      saldo = saldoAntes;
    }
  };

  private gravarPagamentos = async (
    tx: Tx,
    enterpriseId: string,
    nfeId: string,
    valorNota: number,
    pagamentos: LancarEntradaInput["pagamentos"],
  ) => {
    const centavos = (value: number) => Math.round(value * 100);
    const ids = [...new Set(pagamentos.map((row) => row.paymentTypesMethodsFlagsId))];
    const configs = await tx
      .select({
        id: paymentTypesMethodsFlags.id,
        paymentTypesId: paymentTypesMethodsFlags.paymentTypesId,
      })
      .from(paymentTypesMethodsFlags)
      .where(
        and(
          inArray(paymentTypesMethodsFlags.id, ids),
          eq(paymentTypesMethodsFlags.enterprisesId, enterpriseId),
          eq(paymentTypesMethodsFlags.status, "ATIVO"),
        ),
      );
    const tipoPorConfig = new Map(configs.map((row) => [row.id, row.paymentTypesId]));
    let soma = 0;
    for (const [index, payment] of pagamentos.entries()) {
      const tipo = tipoPorConfig.get(payment.paymentTypesMethodsFlagsId);
      if (!tipo || tipo !== payment.paymentTypeId) {
        throw new BadRequestError(
          `Forma de pagamento ${index + 1} nao encontrada ou inativa nesta empresa`,
          "NFE_ENTRADA_PAGAMENTO",
        );
      }
      const parcelas = payment.dues.reduce((sum, due) => sum + centavos(due.valueInstallment), 0);
      if (parcelas !== centavos(payment.valueTotal)) {
        throw new BadRequestError(
          `A soma das parcelas do pagamento ${index + 1} difere do valor informado`,
          "NFE_ENTRADA_PAGAMENTO",
        );
      }
      soma += centavos(payment.valueTotal);
    }
    if (soma !== centavos(valorNota)) {
      throw new BadRequestError("A soma dos pagamentos difere do valor da nota", "NFE_ENTRADA_PAGAMENTO");
    }
    await tx.delete(nfePayments).where(eq(nfePayments.nfeHeaderId, nfeId));
    await tx.insert(nfePayments).values(
      pagamentos.map((payment, index) => ({
        nfeHeaderId: nfeId,
        paymentTypeId: payment.paymentTypeId,
        paymentTypesMethodsFlagsId: payment.paymentTypesMethodsFlagsId,
        nSeq: index + 1,
        vPag: payment.valueTotal.toFixed(2),
      })),
    );
    const tipos = new Set(pagamentos.map((row) => row.paymentTypeId));
    return {
      paymentTypesId: tipos.size === 1 ? pagamentos[0]?.paymentTypeId : undefined,
      installments: pagamentos
        .flatMap((payment) => payment.dues.map((due) => ({ dueDate: due.dueDate, amount: due.valueInstallment })))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    };
  };

  private resolverCfops = async (
    enterpriseId: string,
    itens: EntradaItemXml[],
    input: LancarEntradaInput,
  ) => {
    const mapa = new Map<number, string>();
    for (const item of itens) {
      const pedido = input.itens.find((row) => row.nItem === item.nItem);
      const codigo = pedido?.cfop ?? sugerirCfopEntrada(item.cfop);
      if (!codigo) {
        throw new BadRequestError(
          `Item ${item.nItem} sem CFOP de entrada`,
          "NFE_ENTRADA_CFOP",
        );
      }
      const [cadastrado] = await db
        .select({ id: cfops.id })
        .from(cfops)
        .innerJoin(cfopsEnterprises, eq(cfopsEnterprises.cfopId, cfops.id))
        .where(
          and(
            eq(cfops.cfop, codigo),
            eq(cfops.movimentType, "ENTRADA"),
            eq(cfopsEnterprises.enterprisesId, enterpriseId),
          ),
        )
        .limit(1);
      if (!cadastrado) {
        throw new BadRequestError(
          `CFOP ${codigo} do item ${item.nItem} nao esta cadastrado para entrada nesta empresa`,
          "NFE_ENTRADA_CFOP",
        );
      }
      mapa.set(item.nItem, codigo);
    }
    return mapa;
  };

  private buscarFornecedor = async (
    enterpriseId: string,
    nota: EntradaProcNFe,
    executor: Tx | typeof db = db,
  ) => {
    const documento = normalizeCpfCnpj(nota.emitCnpj || nota.emitCpf || "");
    if (!documento) return null;
    const opcoes = await this.membrosPorDocumento(executor, enterpriseId, documento);
    if (opcoes.length === 1) return opcoes[0] ?? null;
    if (opcoes.length > 1) return { ambiguo: true as const, opcoes };
    return {
      cadastrar: true as const,
      nome: nota.emitente.nome || nota.emitXNome || `Fornecedor ${documento}`,
    };
  };

  private resolverFornecedor = async (
    tx: Tx,
    enterpriseId: string,
    nota: EntradaProcNFe,
    memberId: string | undefined,
    actorUserId: string | null,
    audit: EntityAuditContext,
  ) => {
    const encontrado = await this.buscarFornecedor(enterpriseId, nota, tx);
    if (encontrado && "memberId" in encontrado) return encontrado.memberId;
    if (memberId) return memberId;
    if (encontrado && "ambiguo" in encontrado) {
      throw new BadRequestError("Informe o fornecedor da nota", "SUPPLIER_REQUIRED");
    }
    return this.cadastrarFornecedor(tx, enterpriseId, nota, actorUserId, audit);
  };

  private cadastrarFornecedor = async (
    tx: Tx,
    enterpriseId: string,
    nota: EntradaProcNFe,
    actorUserId: string | null,
    audit: EntityAuditContext,
  ) => {
    const documento = normalizeCpfCnpj(nota.emitCnpj || nota.emitCpf || "");
    if (documento.length !== 11 && documento.length !== 14) {
      throw new BadRequestError(
        "O XML nao tem CPF ou CNPJ do emitente para cadastrar o fornecedor",
        "SUPPLIER_REQUIRED",
      );
    }
    if (!actorUserId) {
      throw new BadRequestError(
        "Usuario autenticado ausente para cadastrar o fornecedor",
        "SUPPLIER_REQUIRED",
      );
    }
    const usuarios = await tx
      .select({
        id: users.id,
        userPhone: users.userPhone,
      })
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          sql`regexp_replace(coalesce(${users.userRegistration}, ''), '\\D', '', 'g') = ${documento}`,
        ),
      )
      .limit(2);
    if (usuarios.length > 1) {
      throw new BadRequestError(
        "Ha mais de um usuario com o documento do emitente. Informe o fornecedor",
        "SUPPLIER_REQUIRED",
      );
    }
    const auditCtx = withEnterpriseAuditContext(
      { ...audit, actorUserId: audit.actorUserId ?? actorUserId },
      enterpriseId,
    );
    const existente = usuarios[0];
    const userId = existente
      ? existente.id
      : await this.criarUsuarioFornecedor(tx, nota, documento, auditCtx);
    const [jaMembro] = await tx
      .select({ id: enterprisesMembers.id })
      .from(enterprisesMembers)
      .where(
        and(
          eq(enterprisesMembers.userId, userId),
          eq(enterprisesMembers.enterpriseId, enterpriseId),
          eq(enterprisesMembers.class, "FORNECEDOR"),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .limit(1);
    if (jaMembro) return jaMembro.id;

    const emitente = nota.emitente;
    const cepId = await this.cepDoEmitente(tx, emitente);
    const code = await resolveMemberCode(enterpriseId, undefined, tx);
    const [member] = await tx
      .insert(enterprisesMembers)
      .values({
        code,
        userId,
        enterpriseId,
        class: "FORNECEDOR",
        status: "ATIVO",
        includedBy: actorUserId,
        approvedAt: new Date(),
        approvedBy: actorUserId,
        observations: cepId ? null : resumoEndereco(emitente),
      })
      .returning();
    if (!member) {
      throw new BadRequestError(
        "Nao foi possivel cadastrar o fornecedor",
        "SUPPLIER_REQUIRED",
      );
    }
    await recordCreateAudit({
      entityType: EntityTypes.ENTERPRISES_MEMBERS,
      entityId: member.id,
      after: member,
      ctx: auditCtx,
      tx,
    });
    if (existente && !existente.userPhone && emitente.fone) {
      await tx
        .update(users)
        .set({ userPhone: emitente.fone, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }
    await this.gravarDadosFiscais(tx, userId, emitente, auditCtx);
    if (cepId) await this.gravarEndereco(tx, userId, emitente, cepId, auditCtx);
    return member.id;
  };

  private criarUsuarioFornecedor = async (
    tx: Tx,
    nota: EntradaProcNFe,
    documento: string,
    audit: EntityAuditContext,
  ) => {
    const created = await createUser(
      {
        userName: (nota.emitente.nome || nota.emitXNome || `Fornecedor ${documento}`).slice(0, 255),
        userRegistration: documento,
        userEmail: null,
        userPhone: nota.emitente.fone,
      },
      tx,
    );
    await recordCreateAudit({
      entityType: EntityTypes.USERS,
      entityId: created.id,
      after: created,
      ctx: audit,
      tx,
    });
    return created.id;
  };

  private gravarDadosFiscais = async (
    tx: Tx,
    userId: string,
    emitente: EntradaEmitente,
    audit: EntityAuditContext,
  ) => {
    if (!emitente.fantasia && !emitente.im) return;
    const [existe] = await tx
      .select({ id: usersTaxInfos.id })
      .from(usersTaxInfos)
      .where(and(eq(usersTaxInfos.userId, userId), isNull(usersTaxInfos.deletedAt)))
      .limit(1);
    if (existe) return;
    const [row] = await tx
      .insert(usersTaxInfos)
      .values({
        userId,
        userLegalName: emitente.fantasia,
        municipalRegistration: emitente.im,
      })
      .returning();
    if (!row) return;
    await recordCreateAudit({
      entityType: EntityTypes.USERS_TAX_INFOS,
      entityId: row.id,
      after: row,
      ctx: audit,
      tx,
    });
  };

  private gravarEndereco = async (
    tx: Tx,
    userId: string,
    emitente: EntradaEmitente,
    cepId: string,
    audit: EntityAuditContext,
  ) => {
    const [existe] = await tx
      .select({ id: usersAddress.id })
      .from(usersAddress)
      .where(
        and(
          eq(usersAddress.userId, userId),
          eq(usersAddress.adressType, "COMERCIAL"),
          isNull(usersAddress.deletedAt),
        ),
      )
      .limit(1);
    if (existe) return;
    const [row] = await tx
      .insert(usersAddress)
      .values({
        userId,
        cepId,
        number: emitente.numero || "S/N",
        complement: emitente.complemento,
        stateRegistration: emitente.ie,
        adressType: "COMERCIAL",
      })
      .returning();
    if (!row) return;
    await recordCreateAudit({
      entityType: EntityTypes.USERS_ADDRESS,
      entityId: row.id,
      after: row,
      ctx: audit,
      tx,
    });
  };

  private cepDoEmitente = async (tx: Tx, emitente: EntradaEmitente) => {
    if (!emitente.cep) return null;
    const rows = await tx
      .select({ id: ceps.id, ibge: cities.ibgeCode })
      .from(ceps)
      .innerJoin(cities, eq(cities.id, ceps.cityId))
      .where(
        and(
          sql`regexp_replace(coalesce(${ceps.cepNumber}, ''), '\\D', '', 'g') = ${emitente.cep}`,
          isNull(ceps.deletedAt),
          isNull(cities.deletedAt),
        ),
      )
      .limit(20);
    const ibge = emitente.codigoMunicipio ? Number(emitente.codigoMunicipio) : null;
    return (rows.find((row) => ibge !== null && row.ibge === ibge) ?? rows[0])?.id ?? null;
  };

  private membrosPorDocumento = async (
    executor: Tx | typeof db,
    enterpriseId: string,
    documento: string,
  ) => {
    return executor
      .select({
        memberId: enterprisesMembers.id,
        nome: users.userName,
      })
      .from(enterprisesMembers)
      .innerJoin(users, eq(users.id, enterprisesMembers.userId))
      .where(
        and(
          eq(enterprisesMembers.enterpriseId, enterpriseId),
          eq(enterprisesMembers.class, "FORNECEDOR"),
          isNull(enterprisesMembers.deletedAt),
          isNull(users.deletedAt),
          sql`regexp_replace(coalesce(${users.userRegistration}, ''), '\\D', '', 'g') = ${documento}`,
        ),
      );
  };

  private lerNota = async (
    enterpriseId: string,
    nfeId: string,
  ): Promise<EntradaProcNFe> => {
    const [header] = await db
      .select({
        id: nfeHeaders.id,
        issuanceType: nfeHeaders.issuanceType,
        moviments: nfeHeaders.moviments,
        entryDate: nfeHeaders.entryDate,
        entryDispensedAt: nfeHeaders.entryDispensedAt,
        xmlArquivo: nfeHeaders.xmlArquivo,
      })
      .from(nfeHeaders)
      .where(
        and(
          eq(nfeHeaders.id, nfeId),
          eq(nfeHeaders.enterpriseId, enterpriseId),
          isNull(nfeHeaders.deletedAt),
        ),
      )
      .limit(1);
    if (!header || header.issuanceType !== "TERCEIRO" || header.moviments !== "ENTRADA") {
      throw new NotFoundError(
        "Nota de compra nao encontrada",
        "NFE_ENTRADA_NAO_ENCONTRADA",
      );
    }
    if (header.entryDate) {
      throw new ConflictError(
        "Esta nota de compra ja foi lancada",
        "NFE_ENTRADA_JA_LANCADA",
      );
    }
    if (header.entryDispensedAt) {
      throw new ConflictError(
        "Esta nota foi dispensada da lista de entrada",
        "NFE_ENTRADA_DISPENSADA",
      );
    }
    const xml = await readStoredNfeXml(header.xmlArquivo);
    if (!xml) {
      throw new BadRequestError(
        "XML da nota de compra nao encontrado na pasta",
        "NFE_ENTRADA_XML_AUSENTE",
      );
    }
    return parseEntradaProcNFe(xml);
  };

  private lancarFretes = async (
    tx: Tx,
    enterpriseId: string,
    nfeHeaderId: string,
    userId: string | null,
    issueDate: string,
    transportes: NonNullable<LancarEntradaInput["transportes"]>,
  ) => {
    const fimDoAno = `${issueDate.slice(0, 4)}-12-31`;
    for (const row of transportes) {
      const frete = row.freightValue ?? 0;
      if (frete <= 0) continue;
      if (!row.memberId) {
        throw new BadRequestError(
          "Frete precisa do transportador",
          "NFE_ENTRADA_TRANSPORTADOR",
        );
      }
      const nome = row.kind === "DESPACHO" ? "Frete de despacho" : "Frete de redespacho";
      const pago = row.paid === true;
      await createFreightPayableInTx(tx, enterpriseId, {
        nfeHeaderId,
        memberId: row.memberId,
        issueDate,
        amount: frete,
        description: row.knowledge ? `${nome} CT ${row.knowledge}` : nome,
        dueDate: pago ? row.paidAt! : fimDoAno,
        paid: pago,
        paidAt: row.paidAt,
        paymentTypesMethodsFlagsId: row.paymentTypesMethodsFlagsId,
        userId,
      });
    }
  };

  private gravarTransportes = async (
    tx: Tx,
    enterpriseId: string,
    nfeHeaderId: string,
    transportes: NonNullable<LancarEntradaInput["transportes"]>,
  ) => {
    await tx
      .delete(nfeEntryTransports)
      .where(eq(nfeEntryTransports.nfeHeaderId, nfeHeaderId));
    let freteCentavos = 0;
    for (const row of transportes) {
      if (row.memberId) {
        const [member] = await tx
          .select({ id: enterprisesMembers.id })
          .from(enterprisesMembers)
          .where(
            and(
              eq(enterprisesMembers.id, row.memberId),
              eq(enterprisesMembers.enterpriseId, enterpriseId),
              eq(enterprisesMembers.class, "TRANSPORTADOR"),
              eq(enterprisesMembers.status, "ATIVO"),
            ),
          )
          .limit(1);
        if (!member) {
          throw new BadRequestError(
            "Transportador não encontrado",
            "NFE_ENTRADA_TRANSPORTADOR",
          );
        }
      }
      freteCentavos += paraCentavos(row.freightValue ?? 0);
      await tx.insert(nfeEntryTransports).values({
        nfeHeaderId,
        kind: row.kind,
        memberId: row.memberId ?? null,
        paid: row.paid === true,
        freightValue:
          row.freightValue === undefined ? null : row.freightValue.toFixed(2),
        ipi: row.ipi === true,
        calculationBase: row.calculationBase === true,
        incidenceRate:
          row.incidenceRate === undefined ? null : String(row.incidenceRate),
        incidenceValue:
          row.incidenceValue === undefined ? null : row.incidenceValue.toFixed(2),
        knowledge: row.knowledge?.trim() || null,
      });
    }
    return freteCentavos;
  };

  private travarCabecalho = async (
    tx: Tx,
    enterpriseId: string,
    nfeId: string,
  ) => {
    const [header] = await tx
      .select({
        id: nfeHeaders.id,
        entryDate: nfeHeaders.entryDate,
        entryDispensedAt: nfeHeaders.entryDispensedAt,
      })
      .from(nfeHeaders)
      .where(
        and(
          eq(nfeHeaders.id, nfeId),
          eq(nfeHeaders.enterpriseId, enterpriseId),
          isNull(nfeHeaders.deletedAt),
        ),
      )
      .for("update")
      .limit(1);
    if (!header) {
      throw new NotFoundError(
        "Nota de compra nao encontrada",
        "NFE_ENTRADA_NAO_ENCONTRADA",
      );
    }
    if (header.entryDate) {
      throw new ConflictError(
        "Esta nota de compra ja foi lancada",
        "NFE_ENTRADA_JA_LANCADA",
      );
    }
    if (header.entryDispensedAt) {
      throw new ConflictError(
        "Esta nota foi dispensada da lista de entrada",
        "NFE_ENTRADA_DISPENSADA",
      );
    }
    return header;
  };

  private cabecalhoEntrada = async (enterpriseId: string, nfeId: string) => {
    const [header] = await db
      .select({
        id: nfeHeaders.id,
        chave: nfeHeaders.chave,
        issuanceType: nfeHeaders.issuanceType,
        moviments: nfeHeaders.moviments,
        entryDate: nfeHeaders.entryDate,
        entryDispensedAt: nfeHeaders.entryDispensedAt,
        xmlArquivo: nfeHeaders.xmlArquivo,
      })
      .from(nfeHeaders)
      .where(
        and(
          eq(nfeHeaders.id, nfeId),
          eq(nfeHeaders.enterpriseId, enterpriseId),
          isNull(nfeHeaders.deletedAt),
        ),
      )
      .limit(1);
    if (
      !header ||
      header.issuanceType !== "TERCEIRO" ||
      header.moviments !== "ENTRADA" ||
      !header.xmlArquivo
    ) {
      throw new NotFoundError(
        "Nota de compra nao encontrada",
        "NFE_ENTRADA_NAO_ENCONTRADA",
      );
    }
    return header;
  };

  private assertItensInformados = (
    nota: EntradaProcNFe,
    input: LancarEntradaInput,
  ) => {
    const esperados = new Set(nota.itens.map((item) => item.nItem));
    const recebidos = new Set(input.itens.map((item) => item.nItem));
    const iguais =
      esperados.size === recebidos.size &&
      [...esperados].every((nItem) => recebidos.has(nItem));
    if (!iguais) {
      throw new BadRequestError(
        "Informe todos os itens do XML, sem repetir numero",
        "NFE_ENTRADA_ITENS",
      );
    }
  };

  private vinculosPorCprod = async (
    enterpriseId: string,
    documento: string | null,
    itens: EntradaItemXml[],
  ) => {
    const mapa = new Map<string, SugestaoProduto>();
    const codigos = [
      ...new Set(
        itens.flatMap((item) => {
          const cProd = item.cProd?.trim();
          return cProd ? [cProd] : [];
        }),
      ),
    ];
    if (!documento || codigos.length === 0) return mapa;
    const rows = await db
      .select({
        cProd: nfeSupplierProductLinks.cProd,
        productsEnterprisesId: productsEnterprises.id,
        code: productsEnterprises.code,
        description: productsEnterprises.description,
        barCode: products.barCode,
        precoVenda: prices.price,
        custoMedio: prices.averageCost,
        profitMargin: productGroups.profitMargin,
        controlsBatch: productsEnterprises.controlsBatch,
        controlsRental: productsEnterprises.controlsRental,
        unit: measurementUnits.unit,
        unitDescription: measurementUnits.description,
      })
      .from(nfeSupplierProductLinks)
      .innerJoin(
        productsEnterprises,
        eq(productsEnterprises.id, nfeSupplierProductLinks.productsEnterprisesId),
      )
      .innerJoin(products, eq(products.id, productsEnterprises.productId))
      .innerJoin(productGroups, eq(productGroups.id, productsEnterprises.productGroupId))
      .leftJoin(
        measurementUnits,
        eq(measurementUnits.id, productsEnterprises.measurementUnitId),
      )
      .leftJoin(prices, eq(prices.productsEnterprisesId, productsEnterprises.id))
      .where(
        and(
          eq(nfeSupplierProductLinks.enterpriseId, enterpriseId),
          eq(nfeSupplierProductLinks.supplierDocument, documento),
          inArray(nfeSupplierProductLinks.cProd, codigos),
          eq(productsEnterprises.enterprisesId, enterpriseId),
          eq(products.status, "ATIVO"),
        ),
      );
    for (const row of rows) {
      const unit = row.unit?.trim() || row.unitDescription?.trim() || null;
      mapa.set(row.cProd, {
        productsEnterprisesId: row.productsEnterprisesId,
        code: row.code,
        description: row.description,
        barCode: row.barCode,
        precoVenda: row.precoVenda,
        custoMedio: row.custoMedio,
        controlsBatch: row.controlsBatch,
        controlsRental: row.controlsRental,
        unit,
        profitMargin: row.profitMargin === null ? null : Number(row.profitMargin),
      });
    }
    return mapa;
  };

  private gravarVinculosCprod = async (
    tx: Tx,
    enterpriseId: string,
    documento: string | null,
    itens: EntradaItemXml[],
    produtos: Map<number, string>,
  ) => {
    if (!documento) return;
    const escolhidos = new Map<string, string>();
    for (const item of itens) {
      const cProd = item.cProd?.trim();
      const productsEnterprisesId = produtos.get(item.nItem);
      if (!cProd || !productsEnterprisesId) continue;
      escolhidos.set(cProd, productsEnterprisesId);
    }
    for (const [cProd, productsEnterprisesId] of escolhidos) {
      await tx
        .insert(nfeSupplierProductLinks)
        .values({
          enterpriseId,
          supplierDocument: documento,
          cProd,
          productsEnterprisesId,
        })
        .onConflictDoUpdate({
          target: [
            nfeSupplierProductLinks.enterpriseId,
            nfeSupplierProductLinks.supplierDocument,
            nfeSupplierProductLinks.cProd,
          ],
          set: {
            productsEnterprisesId,
            updatedAt: new Date(),
          },
        });
    }
  };

  private sugestoesPorEan = async (
    enterpriseId: string,
    itens: EntradaItemXml[],
  ) => {
    const eans = [
      ...new Set(
        itens.flatMap((item) => {
          const ean = eanUtil(item.cEan);
          return ean ? [ean] : [];
        }),
      ),
    ];
    const mapa = new Map<
      string,
      {
        productsEnterprisesId: string;
        code: number | null;
        description: string;
        barCode: string | null;
        precoVenda: string | null;
        custoMedio: string | null;
        profitMargin: number | null;
        controlsBatch: boolean;
        controlsRental: boolean;
        unit: string | null;
      }[]
    >();
    if (eans.length === 0) return mapa;
    const rows = await db
      .select({
        productsEnterprisesId: productsEnterprises.id,
        code: productsEnterprises.code,
        description: productsEnterprises.description,
        barCode: products.barCode,
        precoVenda: prices.price,
        custoMedio: prices.averageCost,
        profitMargin: productGroups.profitMargin,
        controlsBatch: productsEnterprises.controlsBatch,
        controlsRental: productsEnterprises.controlsRental,
        unit: measurementUnits.unit,
        unitDescription: measurementUnits.description,
      })
      .from(productsEnterprises)
      .innerJoin(products, eq(products.id, productsEnterprises.productId))
      .innerJoin(
        productGroups,
        eq(productGroups.id, productsEnterprises.productGroupId),
      )
      .leftJoin(
        measurementUnits,
        eq(measurementUnits.id, productsEnterprises.measurementUnitId),
      )
      .leftJoin(prices, eq(prices.productsEnterprisesId, productsEnterprises.id))
      .where(
        and(
          eq(productsEnterprises.enterprisesId, enterpriseId),
          inArray(products.barCode, eans),
        ),
      );
    for (const row of rows) {
      if (!row.barCode) continue;
      const lista = mapa.get(row.barCode) ?? [];
      const unit = row.unit?.trim() || row.unitDescription?.trim() || null;
      lista.push({
        productsEnterprisesId: row.productsEnterprisesId,
        code: row.code,
        description: row.description,
        barCode: row.barCode,
        precoVenda: row.precoVenda,
        custoMedio: row.custoMedio,
        controlsBatch: row.controlsBatch,
        controlsRental: row.controlsRental,
        unit,
        profitMargin:
          row.profitMargin === null ? null : Number(row.profitMargin),
      });
      mapa.set(row.barCode, lista);
    }
    return mapa;
  };

  private criarProduto = async (
    tx: Tx,
    enterpriseId: string,
    item: EntradaItemXml,
    pedido: LancarEntradaItemInput,
    audit: EntityAuditContext,
  ): Promise<string> => {
    const produto = pedido.produto;
    if (!produto) {
      throw new BadRequestError(
        `Item ${item.nItem} sem produto`,
        "NFE_ENTRADA_PRODUTO",
      );
    }
    const description = (produto.description ?? item.xProd).trim().slice(0, 255);
    const ean = eanUtil(item.cEan);
    const barCode = ean && isValidGtin(ean) ? ean : undefined;
    const payload: CreateProductEnterprisePayloadInput = {
      ...produto,
      description,
    };
    const existente = barCode
      ? (
          await tx
            .select({ id: products.id })
            .from(products)
            .where(eq(products.barCode, barCode))
            .limit(1)
        )[0]
      : undefined;
    const productId = existente
      ? existente.id
      : await this.inserirProdutoBase(tx, description, barCode, audit);
    const vinculado = (
      await tx
        .select({ id: productsEnterprises.id })
        .from(productsEnterprises)
        .where(
          and(
            eq(productsEnterprises.enterprisesId, enterpriseId),
            eq(productsEnterprises.productId, productId),
          ),
        )
        .limit(1)
    )[0];
    if (vinculado) return vinculado.id;
    const row = await productsEnterprisesService.createForProduct(
      enterpriseId,
      productId,
      payload,
      tx,
      audit,
    );
    return row.id;
  };

  private inserirProdutoBase = async (
    tx: Tx,
    description: string,
    barCode: string | undefined,
    audit: EntityAuditContext,
  ): Promise<string> => {
    const [product] = await tx
      .insert(products)
      .values({
        status: "ATIVO",
        description,
        ...(barCode ? { barCode } : {}),
      })
      .returning({ id: products.id });
    if (!product) {
      throw new BadRequestError(
        "Nao foi possivel cadastrar o produto da entrada",
        "NFE_ENTRADA_PRODUTO",
      );
    }
    await recordCreateAudit({
      entityType: EntityTypes.PRODUCTS,
      entityId: product.id,
      after: product,
      ctx: audit,
      tx,
    });
    return product.id;
  };

  private atualizarPreco = async (
    tx: Tx,
    enterpriseId: string,
    productsEnterprisesId: string,
    input: {
      quantidade: number;
      custoUnitario: number;
      precoInformado: number | undefined;
    },
  ): Promise<string> => {
    const produto = await getProductEnterpriseForStock(
      enterpriseId,
      productsEnterprisesId,
      tx,
    );
    const saldo = await getStockBalance(tx, {
      productsEnterprises: produto,
      lock: true,
    });
    const [grupo] = await tx
      .select({ profitMargin: productGroups.profitMargin })
      .from(productsEnterprises)
      .innerJoin(
        productGroups,
        eq(productGroups.id, productsEnterprises.productGroupId),
      )
      .where(eq(productsEnterprises.id, productsEnterprisesId))
      .limit(1);
    const [atual] = await tx
      .select({
        id: prices.id,
        price: prices.price,
        priceCost: prices.priceCost,
        averageCost: prices.averageCost,
      })
      .from(prices)
      .where(eq(prices.productsEnterprisesId, productsEnterprisesId))
      .limit(1);
    const medio = custoMedioPonderado({
      saldo,
      custoMedioAtual:
        atual?.averageCost === null || atual?.averageCost === undefined
          ? null
          : Number(atual.averageCost),
      quantidade: input.quantidade,
      custoUnitario: input.custoUnitario,
    });
    const margem =
      grupo?.profitMargin === null || grupo?.profitMargin === undefined
        ? null
        : Number(grupo.profitMargin);
    const sugerido = precoVendaSugerido(input.custoUnitario, margem);
    const venda =
      input.precoInformado !== undefined
        ? money2(input.precoInformado)
        : (sugerido ?? atual?.price ?? null);
    if (venda === null) {
      throw new BadRequestError(
        "Informe o preco de venda: o grupo do produto nao tem margem",
        "NFE_ENTRADA_PRECO",
      );
    }
    const custo = input.custoUnitario.toFixed(4);
    if (atual) {
      await tx
        .update(prices)
        .set({
          previousCost: atual.priceCost,
          priceCost: custo,
          actualRealCost: custo,
          averageCost: medio,
          price: venda,
          updatedAt: new Date(),
        })
        .where(eq(prices.id, atual.id));
    } else {
      await tx.insert(prices).values({
        productsEnterprisesId,
        price: venda,
        previousCost: null,
        priceCost: custo,
        actualRealCost: custo,
        averageCost: medio,
      });
    }
    return venda;
  };
}

export const nfeEntradaService = new NfeEntradaService();
