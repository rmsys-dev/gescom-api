import { and, asc, eq, gte, ilike, inArray, isNull, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ceps, cities, countries, states } from "../../../db/entities/addresses.js";
import { enterprises, enterprisesAddress } from "../../../db/entities/enterprises.js";
import { enterprisesMembers } from "../../../db/entities/members.js";
import {
  icmsTaxation,
  pisCofinsSituation,
  productTaxation,
  productTypes,
  productsEnterprises,
} from "../../../db/entities/products.js";
import {
  anexosRt,
  cfops,
  cfopsEnterprises,
  classificationIbsCbs,
  cstIbsCbs,
  nfeOperations,
  nfeOperationsStates,
} from "../../../db/entities/nfe.js";
import { db } from "../../../db/schema.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../../shared/errors/app-error.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  toAuditRecord,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import type { CreateNfeInput } from "../document/schema.js";
import { resolveBenefit } from "../benefits/resolve.js";
import { ICMS_CST_WITH_DESON } from "../tax/calculate.js";
import { resolveReformRates, type ReformRates } from "../tax/reform-rates.js";
import { buscaAnexoNRT, type AnexoNrtOption } from "./busca-anexo-nrt.js";
import {
  fillItemDifal,
  fillItemPisCofins,
  fillItemReform,
  applyPriorityClassification,
  cstForProductIcms,
  findPriorityOperation,
  icmsAliquotForCrt,
  requiresBenefit,
  resolveItemFiscal,
  type ProductPisCofins,
  type ResolvedStateOperation,
} from "./product-icms.js";
import type {
  CreateNfeOperationStateInput,
  PatchNfeOperationStateInput,
} from "./schema.js";

type OperationStateDraft = {
  stateId: string;
  nfeOperationsId: string;
  cfopEnterprisesId: string;
  icmsTaxationId: string;
};

const operationSelect = {
  id: nfeOperationsStates.id,
  enterpriseId: nfeOperationsStates.enterpriseId,
  stateId: nfeOperationsStates.stateId,
  uf: states.acronym,
  interstateAliquot: states.interstateAliquot,
  internalAliquot: states.internalAliquot,
  fcpAliquot: states.fcpAliquot,
  difalCalculation: states.difalCalculation,
  calculatesDifal: cfopsEnterprises.calculatesDifal,
  nfeOperationsId: nfeOperationsStates.nfeOperationsId,
  operationDescription: nfeOperations.description,
  operationStatus: nfeOperations.status,
  suframa: nfeOperations.suframa,
  priority: nfeOperations.priority,
  onerous: nfeOperations.onerous,
  tributada: nfeOperations.tributada,
  presumedCreditId: nfeOperations.presumedCreditId,
  cfopEnterprisesId: nfeOperationsStates.cfopEnterprisesId,
  cfop: cfops.cfop,
  cfopDescription: cfops.description,
  icmsTaxationId: nfeOperationsStates.icmsTaxationId,
  icms: icmsTaxation.icms,
  icmsDescription: icmsTaxation.description,
  classificationIbsCbsId: nfeOperations.classificationIbsCbsId,
  cClassTrib: classificationIbsCbs.cClassTrib,
  pRedIbs: classificationIbsCbs.pRedIbs,
  pRedCbs: classificationIbsCbs.pRedCbs,
  ibsCbsCst: cstIbsCbs.cst,
};

const selectOperationState = () =>
  db
    .select(operationSelect)
    .from(nfeOperationsStates)
    .innerJoin(states, eq(states.id, nfeOperationsStates.stateId))
    .innerJoin(
      cfopsEnterprises,
      eq(cfopsEnterprises.id, nfeOperationsStates.cfopEnterprisesId),
    )
    .innerJoin(cfops, eq(cfops.id, cfopsEnterprises.cfopId))
    .innerJoin(nfeOperations, eq(nfeOperations.id, nfeOperationsStates.nfeOperationsId))
    .innerJoin(icmsTaxation, eq(icmsTaxation.id, nfeOperationsStates.icmsTaxationId))
    .innerJoin(
      classificationIbsCbs,
      eq(classificationIbsCbs.id, nfeOperations.classificationIbsCbsId),
    )
    .innerJoin(cstIbsCbs, eq(cstIbsCbs.id, classificationIbsCbs.cstIbsCbsId));

const mapOperationState = (row: {
  id: string;
  enterpriseId: string;
  stateId: string;
  uf: string;
  nfeOperationsId: string;
  operationDescription: string;
  operationStatus: boolean;
  suframa: boolean;
  priority: boolean;
  onerous: boolean;
  tributada: boolean;
  presumedCreditId: string | null;
  cfopEnterprisesId: string;
  cfop: string;
  cfopDescription: string;
  icmsTaxationId: string;
  icms: string;
  icmsDescription: string;
  classificationIbsCbsId: string;
  cClassTrib: string;
}) => ({
  id: row.id,
  enterpriseId: row.enterpriseId,
  stateId: row.stateId,
  uf: row.uf,
  nfeOperationsId: row.nfeOperationsId,
  operationDescription: row.operationDescription,
  operationStatus: row.operationStatus,
  suframa: row.suframa,
  priority: row.priority,
  onerous: row.onerous,
  tributada: row.tributada,
  presumedCreditId: row.presumedCreditId,
  cfopEnterprisesId: row.cfopEnterprisesId,
  cfop: row.cfop,
  cfopDescription: row.cfopDescription,
  icmsTaxationId: row.icmsTaxationId,
  icms: row.icms,
  icmsDescription: row.icmsDescription,
  classificationIbsCbsId: row.classificationIbsCbsId,
  cClassTrib: row.cClassTrib,
});

class NfeOperationsStatesService {
  public async list(enterpriseId: string) {
    const rows = await selectOperationState()
      .where(eq(nfeOperationsStates.enterpriseId, enterpriseId))
      .orderBy(asc(states.acronym));
    return rows.map(mapOperationState);
  }

  public async get(enterpriseId: string, operationStateId: string) {
    const [row] = await selectOperationState()
      .where(
        and(
          eq(nfeOperationsStates.id, operationStateId),
          eq(nfeOperationsStates.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        "Operacao fiscal do estado nao encontrada",
        "NFE_OPERATION_STATE_NOT_FOUND",
      );
    }
    return mapOperationState(row);
  }

  public async create(
    enterpriseId: string,
    input: CreateNfeOperationStateInput,
    audit: EntityAuditContext,
  ) {
    await this.assertRules(enterpriseId, input);
    const [created] = await db
      .insert(nfeOperationsStates)
      .values({ ...input, enterpriseId })
      .returning();
    if (!created) {
      throw new Error("Falha ao gravar operacao fiscal do estado");
    }
    await recordCreateAudit({
      entityType: EntityTypes.NFE_OPERATIONS_STATES,
      entityId: created.id,
      after: created,
      ctx: { ...audit, enterpriseId },
    });
    return this.get(enterpriseId, created.id);
  }

  public async patch(
    enterpriseId: string,
    operationStateId: string,
    input: PatchNfeOperationStateInput,
    audit: EntityAuditContext,
  ) {
    const current = await this.get(enterpriseId, operationStateId);
    const [before] = await db
      .select()
      .from(nfeOperationsStates)
      .where(eq(nfeOperationsStates.id, operationStateId))
      .limit(1);
    const draft: OperationStateDraft = {
      stateId: input.stateId ?? current.stateId,
      nfeOperationsId: input.nfeOperationsId ?? current.nfeOperationsId,
      cfopEnterprisesId: input.cfopEnterprisesId ?? current.cfopEnterprisesId,
      icmsTaxationId: input.icmsTaxationId ?? current.icmsTaxationId,
    };
    await this.assertRules(enterpriseId, draft, operationStateId);
    const [after] = await db
      .update(nfeOperationsStates)
      .set({ ...draft, updatedAt: new Date() })
      .where(
        and(
          eq(nfeOperationsStates.id, operationStateId),
          eq(nfeOperationsStates.enterpriseId, enterpriseId),
        ),
      )
      .returning();
    if (before && after) {
      await recordEntityAudit({
        entityType: EntityTypes.NFE_OPERATIONS_STATES,
        entityId: operationStateId,
        action: "UPDATE",
        before: toAuditRecord(before),
        after: toAuditRecord(after),
        ctx: { ...audit, enterpriseId },
      });
    }
    return this.get(enterpriseId, operationStateId);
  }

  public async remove(
    enterpriseId: string,
    operationStateId: string,
    audit: EntityAuditContext,
  ) {
    await this.get(enterpriseId, operationStateId);
    const [deleted] = await db
      .delete(nfeOperationsStates)
      .where(
        and(
          eq(nfeOperationsStates.id, operationStateId),
          eq(nfeOperationsStates.enterpriseId, enterpriseId),
        ),
      )
      .returning();
    if (deleted) {
      await recordEntityAudit({
        entityType: EntityTypes.NFE_OPERATIONS_STATES,
        entityId: operationStateId,
        action: "DELETE",
        before: toAuditRecord(deleted),
        after: {},
        ctx: { ...audit, enterpriseId },
      });
    }
  }

  public async findActiveByDescription(description: string) {
    const [row] = await db
      .select({ id: nfeOperations.id, description: nfeOperations.description })
      .from(nfeOperations)
      .where(and(eq(nfeOperations.status, true), ilike(nfeOperations.description, description)))
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        `Operacao fiscal ${description} nao encontrada`,
        "NFE_OPERATION_NOT_FOUND",
      );
    }
    return row;
  }

  public async requireActive(id: string) {
    const [row] = await db
      .select({ id: nfeOperations.id, description: nfeOperations.description })
      .from(nfeOperations)
      .where(and(eq(nfeOperations.id, id), eq(nfeOperations.status, true)))
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        "Operacao fiscal nao encontrada ou inativa",
        "NFE_OPERATION_NOT_FOUND",
      );
    }
    return row;
  }

  public async listByUf(
    enterpriseId: string,
    uf: string,
    nfeOperationsId: string,
  ): Promise<ResolvedStateOperation[]> {
    const rows = await selectOperationState()
      .where(
        and(
          eq(nfeOperationsStates.enterpriseId, enterpriseId),
          eq(nfeOperationsStates.nfeOperationsId, nfeOperationsId),
          eq(sql`upper(${states.acronym})`, uf.toUpperCase()),
          eq(nfeOperations.status, true),
          isNull(states.deletedAt),
        ),
      )
      .orderBy(asc(icmsTaxation.icms), asc(cfops.cfop));
    if (rows.length === 0) {
      throw new NotFoundError(
        "Operacao fiscal nao encontrada para a UF",
        "NFE_OPERATION_STATE_NOT_FOUND",
      );
    }
    return rows.map((row) => ({
      id: row.id,
      uf: row.uf,
      cfop: row.cfop,
      cfopDescription: row.cfopDescription,
      icms: row.icms,
      ...cstForProductIcms(row.icms, "3"),
      stateId: row.stateId,
      interstateAliquot: row.interstateAliquot,
      internalAliquot: row.internalAliquot,
      fcpAliquot: row.fcpAliquot,
      difalCalculation: row.difalCalculation,
      calculatesDifal: row.calculatesDifal,
      classificationIbsCbsId: row.classificationIbsCbsId,
      ibsCbsCst: row.ibsCbsCst,
      pRedIbs: row.pRedIbs,
      pRedCbs: row.pRedCbs,
      priority: row.priority,
    }));
  }

  private async assertRules(
    enterpriseId: string,
    draft: OperationStateDraft,
    ignoreId?: string,
  ) {
    const [enterprise] = await db
      .select({ id: enterprises.id })
      .from(enterprises)
      .where(and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)))
      .limit(1);
    if (!enterprise) {
      throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
    }

    const [state] = await db
      .select({ id: states.id })
      .from(states)
      .where(and(eq(states.id, draft.stateId), isNull(states.deletedAt)))
      .limit(1);
    if (!state) {
      throw new BadRequestError("Estado nao encontrado", "NFE_OPERATION_STATE");
    }

    const [cfopLink] = await db
      .select({ enterprisesId: cfopsEnterprises.enterprisesId })
      .from(cfopsEnterprises)
      .where(eq(cfopsEnterprises.id, draft.cfopEnterprisesId))
      .limit(1);
    if (!cfopLink || cfopLink.enterprisesId !== enterpriseId) {
      throw new BadRequestError(
        "CFOP nao habilitado para esta empresa",
        "NFE_OPERATION_CFOP",
      );
    }

    const [operation] = await db
      .select({ id: nfeOperations.id })
      .from(nfeOperations)
      .where(eq(nfeOperations.id, draft.nfeOperationsId))
      .limit(1);
    if (!operation) {
      throw new BadRequestError(
        "Operacao fiscal nao encontrada",
        "NFE_OPERATION_NOT_FOUND",
      );
    }

    const [icms] = await db
      .select({ id: icmsTaxation.id })
      .from(icmsTaxation)
      .where(eq(icmsTaxation.id, draft.icmsTaxationId))
      .limit(1);
    if (!icms) {
      throw new BadRequestError(
        "Tributacao de ICMS nao encontrada",
        "NFE_OPERATION_ICMS_TAXATION",
      );
    }

    const filters = [
      eq(nfeOperationsStates.enterpriseId, enterpriseId),
      eq(nfeOperationsStates.stateId, draft.stateId),
      eq(nfeOperationsStates.nfeOperationsId, draft.nfeOperationsId),
      eq(nfeOperationsStates.cfopEnterprisesId, draft.cfopEnterprisesId),
      eq(nfeOperationsStates.icmsTaxationId, draft.icmsTaxationId),
    ];
    if (ignoreId) {
      filters.push(ne(nfeOperationsStates.id, ignoreId));
    }
    const [existing] = await db
      .select({ id: nfeOperationsStates.id })
      .from(nfeOperationsStates)
      .where(and(...filters))
      .limit(1);
    if (existing) {
      throw new ConflictError(
        "Ja existe este vinculo de operacao fiscal para o estado, CFOP e tributacao de ICMS",
        "NFE_OPERATION_STATE_DUPLICATED",
      );
    }
  }
}

type ProductFiscalRow = {
  productType: string;
  icms: string;
  icmsRate: string | null;
  simplesIcmsRate: string | null;
  pisCofins: ProductPisCofins;
  classificationIbsCbsId: string | null;
  ibsCbsCst: string | null;
  pRedIbs: string | null;
  pRedCbs: string | null;
  productNcmId: string | null;
};

const loadProductFiscal = async (
  items: CreateNfeInput["items"],
  moviment: "ENTRADA" | "SAIDA",
): Promise<Map<string, ProductFiscalRow>> => {
  const ids = [...new Set(items.map((item) => item.productsEnterprisesId))];
  if (ids.length === 0) return new Map();
  const pisSituation = alias(pisCofinsSituation, "nfe_product_pis_situation");
  const cofinsSituation = alias(pisCofinsSituation, "nfe_product_cofins_situation");
  const entrada = moviment === "ENTRADA";
  const rows = await db
    .select({
      id: productsEnterprises.id,
      productType: productTypes.type,
      icms: icmsTaxation.icms,
      icmsRate: icmsTaxation.icmsRate,
      simplesIcmsRate: icmsTaxation.simplesIcmsRate,
      pisCst: pisSituation.cst,
      pisRate: pisSituation.pisRate,
      cofinsCst: cofinsSituation.cst,
      cofinsRate: cofinsSituation.cofinsRate,
      classificationIbsCbsId: productsEnterprises.classificationIbsCbsId,
      productNcmId: productsEnterprises.productNcmId,
      ibsCbsCst: cstIbsCbs.cst,
      pRedIbs: classificationIbsCbs.pRedIbs,
      pRedCbs: classificationIbsCbs.pRedCbs,
    })
    .from(productsEnterprises)
    .innerJoin(productTypes, eq(productTypes.id, productsEnterprises.productTypeId))
    .innerJoin(
      productTaxation,
      eq(productTaxation.id, productsEnterprises.productTaxationId),
    )
    .innerJoin(icmsTaxation, eq(icmsTaxation.id, productTaxation.icmsTaxationId))
    .innerJoin(
      pisSituation,
      eq(
        pisSituation.id,
        entrada ? productTaxation.cstPisEntradaId : productTaxation.cstPisSaidaId,
      ),
    )
    .innerJoin(
      cofinsSituation,
      eq(
        cofinsSituation.id,
        entrada
          ? productTaxation.cstCofinsEntradaId
          : productTaxation.cstCofinsSaidaId,
      ),
    )
    .leftJoin(
      classificationIbsCbs,
      eq(classificationIbsCbs.id, productsEnterprises.classificationIbsCbsId),
    )
    .leftJoin(cstIbsCbs, eq(cstIbsCbs.id, classificationIbsCbs.cstIbsCbsId))
    .where(inArray(productsEnterprises.id, ids));
  return new Map(
    rows.map((row) => [
      row.id,
      {
        productType: row.productType,
        icms: row.icms,
        icmsRate: row.icmsRate,
        simplesIcmsRate: row.simplesIcmsRate,
        pisCofins: {
          pisCst: row.pisCst,
          pisRate: row.pisRate,
          cofinsCst: row.cofinsCst,
          cofinsRate: row.cofinsRate,
        },
        classificationIbsCbsId: row.classificationIbsCbsId,
        productNcmId: row.productNcmId,
        ibsCbsCst: row.ibsCbsCst,
        pRedIbs: row.pRedIbs,
        pRedCbs: row.pRedCbs,
      },
    ]),
  );
};

const requireEnterpriseCrt = async (enterpriseId: string): Promise<string> => {
  const [enterprise] = await db
    .select({ crt: enterprises.crt })
    .from(enterprises)
    .where(and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)))
    .limit(1);
  if (!enterprise) {
    throw new NotFoundError("Empresa nao encontrada", "ENTERPRISE_NOT_FOUND");
  }
  if (!enterprise.crt) {
    throw new BadRequestError(
      "A empresa nao tem CRT cadastrado",
      "NFE_OPERATION_CRT_REQUIRED",
    );
  }
  return enterprise.crt;
};

const requireEnterpriseUf = async (enterpriseId: string): Promise<string> => {
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
  const uf = address?.uf?.trim().toUpperCase();
  if (!uf) {
    throw new BadRequestError(
      "Empresa sem endereco principal para a operacao fiscal",
      "NFE_OPERATION_UF_REQUIRED",
    );
  }
  return uf;
};

export const loadReformRates = async (
  ibgeCode: number | string | null | undefined,
): Promise<ReformRates | null> => {
  const code = Number(ibgeCode);
  if (!Number.isInteger(code) || code <= 0) return null;
  const [row] = await db
    .select({
      cityIbsMun: cities.ibs_municipal_tax,
      stateIbsUf: states.ibs_uf_tax,
      stateIbsMun: states.ibs_municipal_tax,
      countryIbsUf: countries.ibs_uf_tax,
      countryIbsMun: countries.ibs_municipal_tax,
      countryCbs: countries.cbsTax,
      countryIs: countries.isTax,
    })
    .from(cities)
    .innerJoin(states, eq(states.id, cities.stateId))
    .innerJoin(countries, eq(countries.id, states.countryId))
    .where(
      and(
        eq(cities.ibgeCode, code),
        isNull(cities.deletedAt),
        isNull(states.deletedAt),
        isNull(countries.deletedAt),
      ),
    )
    .limit(1);
  return row ? resolveReformRates(row) : null;
};

const findMemberCustomerType = async (
  enterpriseId: string,
  memberId: string,
): Promise<string | null> => {
  const [member] = await db
    .select({ typeSupplierCustomerId: enterprisesMembers.typeSupplierCustomerId })
    .from(enterprisesMembers)
    .where(
      and(
        eq(enterprisesMembers.id, memberId),
        eq(enterprisesMembers.enterpriseId, enterpriseId),
        isNull(enterprisesMembers.deletedAt),
      ),
    )
    .limit(1);
  return member?.typeSupplierCustomerId ?? null;
};

const applyBenefitToItem = async (
  enterpriseId: string,
  item: CreateNfeInput["items"][number],
  operation: ResolvedStateOperation,
  context: {
    crt: string;
    finNfe: string | undefined;
    typeSupplierCustomerId: string | null;
    aliquot: number | undefined;
    suframa: boolean;
  },
): Promise<CreateNfeInput["items"][number]> => {
  if (item.cBenef || !requiresBenefit(context.crt, context.finNfe, operation)) {
    return item;
  }
  const cfop = item.cfop ?? operation.cfop;
  const cst = item.tax?.icmsCst ?? operation.cst;
  const benefit = operation.stateId
    ? await resolveBenefit({
        enterpriseId,
        typeSupplierCustomerId: context.typeSupplierCustomerId,
        stateId: operation.stateId,
        productsEnterprisesId: item.productsEnterprisesId,
        cfop,
        cst,
      })
    : null;
  if (!benefit) {
    throw new BadRequestError(
      `Codigo Beneficio Fiscal nao parametrizado para o item ${item.nItem} (CFOP ${cfop}, CST ${cst})`,
      "NFE_BENEFIT_NOT_CONFIGURED",
    );
  }
  const reduction =
    benefit.reductionPercentage === null ? undefined : Number(benefit.reductionPercentage);
  const tax = { ...item.tax };
  if (tax.pRedBc === undefined && reduction !== undefined && reduction > 0) {
    tax.pRedBc = reduction;
  }
  if (ICMS_CST_WITH_DESON.has(cst)) {
    if (tax.pIcms === undefined && context.aliquot !== undefined) {
      tax.pIcms = context.aliquot;
    }
    tax.motDesIcms ??= context.suframa ? "7" : "9";
    tax.indDeduzDeson ??= context.suframa ? "1" : "0";
  }
  return { ...item, cBenef: benefit.codeBenefit, tax };
};

const loadAnexosNrtByNcm = async (
  ncmIds: string[],
  onDate: string,
): Promise<Map<string, AnexoNrtOption[]>> => {
  const unique = [...new Set(ncmIds)];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({
      id: anexosRt.id,
      productsNcmId: anexosRt.productsNcmId,
      anexo: anexosRt.anexo,
      legislation: anexosRt.legislation,
      classificationIbsCbsId: anexosRt.classificationIbsCbsId,
      ibsCbsCst: cstIbsCbs.cst,
      pRedIbs: classificationIbsCbs.pRedIbs,
      pRedCbs: classificationIbsCbs.pRedCbs,
    })
    .from(anexosRt)
    .innerJoin(
      classificationIbsCbs,
      eq(classificationIbsCbs.id, anexosRt.classificationIbsCbsId),
    )
    .innerJoin(cstIbsCbs, eq(cstIbsCbs.id, classificationIbsCbs.cstIbsCbsId))
    .where(
      and(inArray(anexosRt.productsNcmId, unique), gte(anexosRt.dateFim, onDate)),
    )
    .orderBy(asc(anexosRt.anexo), asc(anexosRt.id));
  const byNcm = new Map<string, AnexoNrtOption[]>();
  for (const row of rows) {
    const current = byNcm.get(row.productsNcmId) ?? [];
    current.push({
      id: row.id,
      anexo: row.anexo,
      legislation: row.legislation,
      classificationIbsCbsId: row.classificationIbsCbsId,
      ibsCbsCst: row.ibsCbsCst,
      pRedIbs: row.pRedIbs,
      pRedCbs: row.pRedCbs,
    });
    byNcm.set(row.productsNcmId, current);
  }
  return byNcm;
};

const withClassification = (
  item: CreateNfeInput["items"][number],
  operation: ResolvedStateOperation,
  classification: {
    classificationIbsCbsId: string;
    ibsCbsCst?: string | null;
    pRedIbs?: string | null;
    pRedCbs?: string | null;
  },
) => ({
  item: {
    ...item,
    tax: {
      ...item.tax,
      classificationIbsCbsId: classification.classificationIbsCbsId,
    },
  },
  operation: {
    ...operation,
    classificationIbsCbsId: classification.classificationIbsCbsId,
    ibsCbsCst: classification.ibsCbsCst,
    pRedIbs: classification.pRedIbs,
    pRedCbs: classification.pRedCbs,
  },
});

export async function applyStateOperationToNote(
  enterpriseId: string,
  input: CreateNfeInput,
  destMemberId?: string,
): Promise<CreateNfeInput> {
  const enterpriseUf = await requireEnterpriseUf(enterpriseId);
  const destinationUf =
    input.mod === "65"
      ? enterpriseUf
      : input.dest?.uf?.trim().toUpperCase();
  if (!destinationUf) {
    throw new BadRequestError(
      "Informe a UF do destinatario para a operacao fiscal",
      "NFE_OPERATION_UF_REQUIRED",
    );
  }
  const operationId =
    input.nfeOperationsId ??
    (await nfeOperationsStatesService.findActiveByDescription("Venda")).id;
  const [listed, fiscalByProduct, crt, reformRates, typeSupplierCustomerId] = await Promise.all([
    nfeOperationsStatesService.listByUf(enterpriseId, destinationUf, operationId),
    loadProductFiscal(input.items, input.moviments ?? "SAIDA"),
    requireEnterpriseCrt(enterpriseId),
    loadReformRates(input.dest?.cmun?.trim() || input.cMunFg),
    destMemberId ? findMemberCustomerType(enterpriseId, destMemberId) : Promise.resolve(null),
  ]);
  const operations = listed.map((operation) => ({
    ...operation,
    ...(operation.icms ? cstForProductIcms(operation.icms, crt) : {}),
  }));
  const interstate = destinationUf !== enterpriseUf;
  const resolved = input.items.map((item) => {
    const fiscal = fiscalByProduct.get(item.productsEnterprisesId);
    if (!fiscal) {
      throw new BadRequestError(
        "Produto sem tributacao de ICMS para a operacao fiscal",
        "NFE_OPERATION_PRODUCT_ICMS",
      );
    }
    const entry = resolveItemFiscal(fillItemPisCofins(item, fiscal.pisCofins), operations, {
      icms: fiscal.icms,
      icmsRate: fiscal.icmsRate,
      simplesIcmsRate: fiscal.simplesIcmsRate,
      productType: fiscal.productType,
      crt,
      interstate,
    });
    const aliquot = icmsAliquotForCrt(
      crt,
      fiscal,
      interstate ? (entry.operation.interstateAliquot ?? null) : undefined,
    );
    return { ...entry, aliquot };
  });
  const suframa = Boolean(input.dest?.isuf?.trim());
  const difalContext = {
    interstate,
    mod: input.mod,
    indFinal: input.indFinal,
    indIeDest: input.dest?.indIeDest,
  };
  const priorityOperation = findPriorityOperation(operations);
  const noteDate = input.dhEmi.slice(0, 10);
  const anexosByNcm = priorityOperation
    ? new Map<string, AnexoNrtOption[]>()
    : await loadAnexosNrtByNcm(
        [...fiscalByProduct.values()].flatMap((fiscal) =>
          fiscal.classificationIbsCbsId || !fiscal.productNcmId ? [] : [fiscal.productNcmId],
        ),
        noteDate,
      );
  const items = await Promise.all(
    resolved.map(async ({ item, operation, aliquot }) => {
      const filled = fillItemDifal(
        await applyBenefitToItem(enterpriseId, item, operation, {
          crt,
          finNfe: input.finNfe,
          typeSupplierCustomerId,
          aliquot,
          suframa,
        }),
        operation,
        difalContext,
      );
      const forced = applyPriorityClassification(filled, operation, priorityOperation);
      if (priorityOperation?.classificationIbsCbsId) {
        return fillItemReform(forced.item, forced.operation, reformRates);
      }
      const productFiscal = fiscalByProduct.get(item.productsEnterprisesId);
      const manualClass = Boolean(item.tax?.classificationIbsCbsId);
      if (!manualClass && productFiscal?.classificationIbsCbsId) {
        const productClass = withClassification(forced.item, forced.operation, {
          classificationIbsCbsId: productFiscal.classificationIbsCbsId,
          ibsCbsCst: productFiscal.ibsCbsCst,
          pRedIbs: productFiscal.pRedIbs,
          pRedCbs: productFiscal.pRedCbs,
        });
        return fillItemReform(productClass.item, productClass.operation, reformRates);
      }
      if (!manualClass && productFiscal?.productNcmId) {
        const anexo = buscaAnexoNRT(
          anexosByNcm.get(productFiscal.productNcmId) ?? [],
          item.anexoRtId,
        );
        if (anexo) {
          const anexoClass = withClassification(forced.item, forced.operation, anexo);
          return fillItemReform(anexoClass.item, anexoClass.operation, reformRates);
        }
      }
      return fillItemReform(forced.item, forced.operation, reformRates);
    }),
  );
  const headerOperation = resolved[0]!.operation;
  const sameState = destinationUf === enterpriseUf;
  return {
    ...input,
    natOp: input.natOp?.trim()
      ? input.natOp
      : headerOperation.cfopDescription.slice(0, 60),
    idDest: input.idDest ?? (input.mod === "65" || sameState ? "1" : "2"),
    indPres: input.indPres ?? "1",
    items,
  };
}

export const nfeOperationsStatesService = new NfeOperationsStatesService();
