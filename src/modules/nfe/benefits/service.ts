import { and, asc, count, eq, getTableColumns, isNull, type SQL } from "drizzle-orm";
import {
  benefitCode,
  benefitCodeByCfop,
  benefitCodeByStateAndProducts,
  benefitTypeCostumers,
  cfops,
  cstCompativelBenefit,
  db,
  productsEnterprises,
  situationTributaryCst,
  states,
  typeSupplierCustomers,
} from "../../../db/schema.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  toAuditRecord,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type {
  CreateBenefitCfopInput,
  CreateBenefitCustomerTypeInput,
  CreateBenefitStateProductInput,
  ListBenefitsCfopQuery,
  ListBenefitsCustomerTypeQuery,
  ListBenefitsStateProductQuery,
  PatchBenefitCfopInput,
  PatchBenefitCustomerTypeInput,
  PatchBenefitStateProductInput,
} from "./schema.js";

type BenefitRule = { cfop: string; cst: string; benefitCodeId: string; uf?: string };

const benefitCodeFields = {
  codeBenefit: benefitCode.codeBenefit,
  uf: benefitCode.uf,
  descriptionBenefit: benefitCode.descriptionBenefit,
};

const toDecimal = (value: number | null | undefined) =>
  value === undefined ? undefined : value === null ? null : value.toFixed(10);

const assertBenefitRule = async (rule: BenefitRule) => {
  const [cfop] = await db
    .select({ id: cfops.id })
    .from(cfops)
    .where(eq(cfops.cfop, rule.cfop))
    .limit(1);
  if (!cfop) {
    throw new BadRequestError("CFOP nao encontrado", "NFE_BENEFIT_CFOP_NOT_FOUND");
  }

  const [benefit] = await db
    .select({ id: benefitCode.id, uf: benefitCode.uf })
    .from(benefitCode)
    .where(eq(benefitCode.id, rule.benefitCodeId))
    .limit(1);
  if (!benefit) {
    throw new BadRequestError(
      "Codigo de beneficio nao encontrado",
      "NFE_BENEFIT_CODE_NOT_FOUND",
    );
  }
  if (rule.uf && benefit.uf !== rule.uf) {
    throw new BadRequestError(
      `Codigo de beneficio e da UF ${benefit.uf}, mas o estado informado e ${rule.uf}`,
      "NFE_BENEFIT_CODE_UF_MISMATCH",
    );
  }

  const compatible = await db
    .select({ cst: situationTributaryCst.cst })
    .from(cstCompativelBenefit)
    .innerJoin(
      situationTributaryCst,
      eq(situationTributaryCst.id, cstCompativelBenefit.situationTributaryCstId),
    )
    .where(eq(cstCompativelBenefit.benefitCodeId, benefit.id));
  if (compatible.length > 0 && !compatible.some((row) => row.cst === rule.cst)) {
    throw new BadRequestError(
      "CST nao e compativel com o codigo de beneficio",
      "NFE_BENEFIT_CST_INCOMPATIBLE",
    );
  }
};

const assertTypeSupplierCustomer = async (enterpriseId: string, id: string) => {
  const [type] = await db
    .select({ id: typeSupplierCustomers.id })
    .from(typeSupplierCustomers)
    .where(
      and(
        eq(typeSupplierCustomers.id, id),
        eq(typeSupplierCustomers.enterpriseId, enterpriseId),
      ),
    )
    .limit(1);
  if (!type) {
    throw new NotFoundError(
      "Tipo de fornecedor/cliente nao encontrado",
      "TYPE_SUPPLIER_CUSTOMER_NOT_FOUND",
    );
  }
};

const findActiveStateAcronym = async (stateId: string) => {
  const [state] = await db
    .select({ acronym: states.acronym })
    .from(states)
    .where(and(eq(states.id, stateId), isNull(states.deletedAt)))
    .limit(1);
  if (!state) {
    throw new NotFoundError("Estado nao encontrado", "STATE_NOT_FOUND");
  }
  return state.acronym.trim().toUpperCase();
};

const assertProductEnterprise = async (enterpriseId: string, id: string) => {
  const [product] = await db
    .select({ id: productsEnterprises.id })
    .from(productsEnterprises)
    .where(
      and(
        eq(productsEnterprises.id, id),
        eq(productsEnterprises.enterprisesId, enterpriseId),
      ),
    )
    .limit(1);
  if (!product) {
    throw new NotFoundError(
      "Produto da empresa nao encontrado",
      "PRODUCT_ENTERPRISE_NOT_FOUND",
    );
  }
};

const STATE_PRODUCT_DUPLICATED_MESSAGE =
  "Ja existe um beneficio para este estado, produto, CFOP, CST e codigo";

const rethrowConflict = (
  err: unknown,
  message = "Ja existe um beneficio para este CFOP, CST e codigo",
): never => {
  if (isPostgresUniqueViolation(err)) {
    throw new ConflictError(message, "NFE_BENEFIT_DUPLICATED");
  }
  throw err;
};

class NfeBenefitsCfopService {
  private readonly view = () =>
    db
      .select({ ...getTableColumns(benefitCodeByCfop), ...benefitCodeFields })
      .from(benefitCodeByCfop)
      .innerJoin(benefitCode, eq(benefitCode.id, benefitCodeByCfop.benefitCodeId));

  private async findOwned(enterpriseId: string, id: string) {
    const [row] = await db
      .select()
      .from(benefitCodeByCfop)
      .where(
        and(
          eq(benefitCodeByCfop.id, id),
          eq(benefitCodeByCfop.enterprisesId, enterpriseId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        "Beneficio por CFOP nao encontrado",
        "NFE_BENEFIT_CFOP_NOT_FOUND",
      );
    }
    return row;
  }

  public async list(enterpriseId: string, query: ListBenefitsCfopQuery) {
    const { limit, offset } = resolveListPagination(query);
    const conditions: SQL[] = [eq(benefitCodeByCfop.enterprisesId, enterpriseId)];
    if (query.cfop) conditions.push(eq(benefitCodeByCfop.cfop, query.cfop));
    if (query.cst) conditions.push(eq(benefitCodeByCfop.cst, query.cst));
    if (query.benefitCodeId) {
      conditions.push(eq(benefitCodeByCfop.benefitCodeId, query.benefitCodeId));
    }
    const where = and(...conditions);
    const [items, totalRows] = await Promise.all([
      this.view()
        .where(where)
        .orderBy(
          asc(benefitCodeByCfop.cfop),
          asc(benefitCodeByCfop.cst),
          asc(benefitCodeByCfop.id),
        )
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(benefitCodeByCfop).where(where),
    ]);
    return { items, total: Number(totalRows[0]?.c ?? 0), limit, offset };
  }

  public async get(enterpriseId: string, id: string) {
    const [row] = await this.view()
      .where(
        and(
          eq(benefitCodeByCfop.id, id),
          eq(benefitCodeByCfop.enterprisesId, enterpriseId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        "Beneficio por CFOP nao encontrado",
        "NFE_BENEFIT_CFOP_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateBenefitCfopInput,
    audit: EntityAuditContext,
  ) {
    await assertBenefitRule(input);
    let row: typeof benefitCodeByCfop.$inferSelect | undefined;
    try {
      [row] = await db
        .insert(benefitCodeByCfop)
        .values({
          enterprisesId: enterpriseId,
          cfop: input.cfop,
          cst: input.cst,
          benefitCodeId: input.benefitCodeId,
          reductionPercentage: toDecimal(input.reductionPercentage) ?? null,
        })
        .returning();
    } catch (err) {
      return rethrowConflict(err);
    }
    if (!row) throw new Error("Falha ao gravar beneficio por CFOP");
    await recordCreateAudit({
      entityType: EntityTypes.BENEFIT_CODE_BY_CFOP,
      entityId: row.id,
      after: row,
      ctx: { ...audit, enterpriseId },
    });
    return this.get(enterpriseId, row.id);
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchBenefitCfopInput,
    audit: EntityAuditContext,
  ) {
    const current = await this.findOwned(enterpriseId, id);
    await assertBenefitRule({
      cfop: input.cfop ?? current.cfop,
      cst: input.cst ?? current.cst,
      benefitCodeId: input.benefitCodeId ?? current.benefitCodeId,
    });
    let row: typeof benefitCodeByCfop.$inferSelect | undefined;
    try {
      [row] = await db
        .update(benefitCodeByCfop)
        .set({
          ...(input.cfop !== undefined ? { cfop: input.cfop } : {}),
          ...(input.cst !== undefined ? { cst: input.cst } : {}),
          ...(input.benefitCodeId !== undefined
            ? { benefitCodeId: input.benefitCodeId }
            : {}),
          ...(input.reductionPercentage !== undefined
            ? { reductionPercentage: toDecimal(input.reductionPercentage) }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(benefitCodeByCfop.id, id))
        .returning();
    } catch (err) {
      return rethrowConflict(err);
    }
    await recordEntityAudit({
      entityType: EntityTypes.BENEFIT_CODE_BY_CFOP,
      entityId: id,
      action: "UPDATE",
      before: toAuditRecord(current),
      after: toAuditRecord(row!),
      ctx: { ...audit, enterpriseId },
    });
    return this.get(enterpriseId, id);
  }

  public async remove(enterpriseId: string, id: string, audit: EntityAuditContext) {
    const existing = await this.findOwned(enterpriseId, id);
    await db.delete(benefitCodeByCfop).where(eq(benefitCodeByCfop.id, id));
    await recordEntityAudit({
      entityType: EntityTypes.BENEFIT_CODE_BY_CFOP,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: {},
      ctx: { ...audit, enterpriseId },
    });
  }
}

class NfeBenefitsCustomerTypeService {
  private readonly view = () =>
    db
      .select({ ...getTableColumns(benefitTypeCostumers), ...benefitCodeFields })
      .from(benefitTypeCostumers)
      .innerJoin(benefitCode, eq(benefitCode.id, benefitTypeCostumers.benefitCodeId));

  private async findOwned(enterpriseId: string, id: string) {
    const [row] = await db
      .select()
      .from(benefitTypeCostumers)
      .where(
        and(
          eq(benefitTypeCostumers.id, id),
          eq(benefitTypeCostumers.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        "Beneficio por tipo de cliente nao encontrado",
        "NFE_BENEFIT_CUSTOMER_TYPE_NOT_FOUND",
      );
    }
    return row;
  }

  public async list(enterpriseId: string, query: ListBenefitsCustomerTypeQuery) {
    const { limit, offset } = resolveListPagination(query);
    const conditions: SQL[] = [eq(benefitTypeCostumers.enterpriseId, enterpriseId)];
    if (query.typeSupplierCustomerId) {
      conditions.push(
        eq(benefitTypeCostumers.typeSupplierCustomerId, query.typeSupplierCustomerId),
      );
    }
    if (query.cfop) conditions.push(eq(benefitTypeCostumers.cfop, query.cfop));
    if (query.cst) conditions.push(eq(benefitTypeCostumers.cst, query.cst));
    if (query.benefitCodeId) {
      conditions.push(eq(benefitTypeCostumers.benefitCodeId, query.benefitCodeId));
    }
    const where = and(...conditions);
    const [items, totalRows] = await Promise.all([
      this.view()
        .where(where)
        .orderBy(
          asc(benefitTypeCostumers.cfop),
          asc(benefitTypeCostumers.cst),
          asc(benefitTypeCostumers.id),
        )
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(benefitTypeCostumers).where(where),
    ]);
    return { items, total: Number(totalRows[0]?.c ?? 0), limit, offset };
  }

  public async get(enterpriseId: string, id: string) {
    const [row] = await this.view()
      .where(
        and(
          eq(benefitTypeCostumers.id, id),
          eq(benefitTypeCostumers.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        "Beneficio por tipo de cliente nao encontrado",
        "NFE_BENEFIT_CUSTOMER_TYPE_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateBenefitCustomerTypeInput,
    audit: EntityAuditContext,
  ) {
    await assertTypeSupplierCustomer(enterpriseId, input.typeSupplierCustomerId);
    await assertBenefitRule(input);
    let row: typeof benefitTypeCostumers.$inferSelect | undefined;
    try {
      [row] = await db
        .insert(benefitTypeCostumers)
        .values({
          enterpriseId,
          typeSupplierCustomerId: input.typeSupplierCustomerId,
          cfop: input.cfop,
          cst: input.cst,
          benefitCodeId: input.benefitCodeId,
          reductionPercentage: toDecimal(input.reductionPercentage) ?? null,
        })
        .returning();
    } catch (err) {
      return rethrowConflict(err);
    }
    if (!row) throw new Error("Falha ao gravar beneficio por tipo de cliente");
    await recordCreateAudit({
      entityType: EntityTypes.BENEFIT_TYPE_COSTUMERS,
      entityId: row.id,
      after: row,
      ctx: { ...audit, enterpriseId },
    });
    return this.get(enterpriseId, row.id);
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchBenefitCustomerTypeInput,
    audit: EntityAuditContext,
  ) {
    const current = await this.findOwned(enterpriseId, id);
    if (input.typeSupplierCustomerId !== undefined) {
      await assertTypeSupplierCustomer(enterpriseId, input.typeSupplierCustomerId);
    }
    await assertBenefitRule({
      cfop: input.cfop ?? current.cfop,
      cst: input.cst ?? current.cst,
      benefitCodeId: input.benefitCodeId ?? current.benefitCodeId,
    });
    let row: typeof benefitTypeCostumers.$inferSelect | undefined;
    try {
      [row] = await db
        .update(benefitTypeCostumers)
        .set({
          ...(input.typeSupplierCustomerId !== undefined
            ? { typeSupplierCustomerId: input.typeSupplierCustomerId }
            : {}),
          ...(input.cfop !== undefined ? { cfop: input.cfop } : {}),
          ...(input.cst !== undefined ? { cst: input.cst } : {}),
          ...(input.benefitCodeId !== undefined
            ? { benefitCodeId: input.benefitCodeId }
            : {}),
          ...(input.reductionPercentage !== undefined
            ? { reductionPercentage: toDecimal(input.reductionPercentage) }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(benefitTypeCostumers.id, id))
        .returning();
    } catch (err) {
      return rethrowConflict(err);
    }
    await recordEntityAudit({
      entityType: EntityTypes.BENEFIT_TYPE_COSTUMERS,
      entityId: id,
      action: "UPDATE",
      before: toAuditRecord(current),
      after: toAuditRecord(row!),
      ctx: { ...audit, enterpriseId },
    });
    return this.get(enterpriseId, id);
  }

  public async remove(enterpriseId: string, id: string, audit: EntityAuditContext) {
    const existing = await this.findOwned(enterpriseId, id);
    await db.delete(benefitTypeCostumers).where(eq(benefitTypeCostumers.id, id));
    await recordEntityAudit({
      entityType: EntityTypes.BENEFIT_TYPE_COSTUMERS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: {},
      ctx: { ...audit, enterpriseId },
    });
  }
}

class NfeBenefitsStateProductService {
  private readonly view = () =>
    db
      .select({
        ...getTableColumns(benefitCodeByStateAndProducts),
        ...benefitCodeFields,
        stateAcronym: states.acronym,
        productCode: productsEnterprises.code,
        productDescription: productsEnterprises.description,
      })
      .from(benefitCodeByStateAndProducts)
      .innerJoin(benefitCode, eq(benefitCode.id, benefitCodeByStateAndProducts.benefitCodeId))
      .innerJoin(states, eq(states.id, benefitCodeByStateAndProducts.stateId))
      .innerJoin(
        productsEnterprises,
        eq(productsEnterprises.id, benefitCodeByStateAndProducts.productsEnterprisesId),
      );

  private async findOwned(enterpriseId: string, id: string) {
    const [row] = await db
      .select()
      .from(benefitCodeByStateAndProducts)
      .where(
        and(
          eq(benefitCodeByStateAndProducts.id, id),
          eq(benefitCodeByStateAndProducts.enterprisesId, enterpriseId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        "Beneficio por estado e produto nao encontrado",
        "NFE_BENEFIT_STATE_PRODUCT_NOT_FOUND",
      );
    }
    return row;
  }

  public async list(enterpriseId: string, query: ListBenefitsStateProductQuery) {
    const { limit, offset } = resolveListPagination(query);
    const t = benefitCodeByStateAndProducts;
    const conditions: SQL[] = [eq(t.enterprisesId, enterpriseId)];
    if (query.stateId) conditions.push(eq(t.stateId, query.stateId));
    if (query.productsEnterprisesId) {
      conditions.push(eq(t.productsEnterprisesId, query.productsEnterprisesId));
    }
    if (query.cfop) conditions.push(eq(t.cfop, query.cfop));
    if (query.cst) conditions.push(eq(t.cst, query.cst));
    if (query.benefitCodeId) conditions.push(eq(t.benefitCodeId, query.benefitCodeId));
    const where = and(...conditions);
    const [items, totalRows] = await Promise.all([
      this.view()
        .where(where)
        .orderBy(
          asc(states.acronym),
          asc(productsEnterprises.description),
          asc(t.cfop),
          asc(t.cst),
          asc(t.id),
        )
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(t).where(where),
    ]);
    return { items, total: Number(totalRows[0]?.c ?? 0), limit, offset };
  }

  public async get(enterpriseId: string, id: string) {
    const [row] = await this.view()
      .where(
        and(
          eq(benefitCodeByStateAndProducts.id, id),
          eq(benefitCodeByStateAndProducts.enterprisesId, enterpriseId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        "Beneficio por estado e produto nao encontrado",
        "NFE_BENEFIT_STATE_PRODUCT_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateBenefitStateProductInput,
    audit: EntityAuditContext,
  ) {
    const uf = await findActiveStateAcronym(input.stateId);
    await assertProductEnterprise(enterpriseId, input.productsEnterprisesId);
    await assertBenefitRule({ ...input, uf });
    let row: typeof benefitCodeByStateAndProducts.$inferSelect | undefined;
    try {
      [row] = await db
        .insert(benefitCodeByStateAndProducts)
        .values({
          enterprisesId: enterpriseId,
          stateId: input.stateId,
          productsEnterprisesId: input.productsEnterprisesId,
          cfop: input.cfop,
          cst: input.cst,
          benefitCodeId: input.benefitCodeId,
          reductionPercentage: toDecimal(input.reductionPercentage) ?? null,
        })
        .returning();
    } catch (err) {
      return rethrowConflict(err, STATE_PRODUCT_DUPLICATED_MESSAGE);
    }
    if (!row) throw new Error("Falha ao gravar beneficio por estado e produto");
    await recordCreateAudit({
      entityType: EntityTypes.BENEFIT_CODE_BY_STATE_AND_PRODUCTS,
      entityId: row.id,
      after: row,
      ctx: { ...audit, enterpriseId },
    });
    return this.get(enterpriseId, row.id);
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchBenefitStateProductInput,
    audit: EntityAuditContext,
  ) {
    const current = await this.findOwned(enterpriseId, id);
    const uf = await findActiveStateAcronym(input.stateId ?? current.stateId);
    if (input.productsEnterprisesId !== undefined) {
      await assertProductEnterprise(enterpriseId, input.productsEnterprisesId);
    }
    await assertBenefitRule({
      cfop: input.cfop ?? current.cfop,
      cst: input.cst ?? current.cst,
      benefitCodeId: input.benefitCodeId ?? current.benefitCodeId,
      uf,
    });
    let row: typeof benefitCodeByStateAndProducts.$inferSelect | undefined;
    try {
      [row] = await db
        .update(benefitCodeByStateAndProducts)
        .set({
          ...(input.stateId !== undefined ? { stateId: input.stateId } : {}),
          ...(input.productsEnterprisesId !== undefined
            ? { productsEnterprisesId: input.productsEnterprisesId }
            : {}),
          ...(input.cfop !== undefined ? { cfop: input.cfop } : {}),
          ...(input.cst !== undefined ? { cst: input.cst } : {}),
          ...(input.benefitCodeId !== undefined
            ? { benefitCodeId: input.benefitCodeId }
            : {}),
          ...(input.reductionPercentage !== undefined
            ? { reductionPercentage: toDecimal(input.reductionPercentage) }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(benefitCodeByStateAndProducts.id, id))
        .returning();
    } catch (err) {
      return rethrowConflict(err, STATE_PRODUCT_DUPLICATED_MESSAGE);
    }
    await recordEntityAudit({
      entityType: EntityTypes.BENEFIT_CODE_BY_STATE_AND_PRODUCTS,
      entityId: id,
      action: "UPDATE",
      before: toAuditRecord(current),
      after: toAuditRecord(row!),
      ctx: { ...audit, enterpriseId },
    });
    return this.get(enterpriseId, id);
  }

  public async remove(enterpriseId: string, id: string, audit: EntityAuditContext) {
    const existing = await this.findOwned(enterpriseId, id);
    await db
      .delete(benefitCodeByStateAndProducts)
      .where(eq(benefitCodeByStateAndProducts.id, id));
    await recordEntityAudit({
      entityType: EntityTypes.BENEFIT_CODE_BY_STATE_AND_PRODUCTS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: {},
      ctx: { ...audit, enterpriseId },
    });
  }
}

export const nfeBenefitsCfopService = new NfeBenefitsCfopService();
export const nfeBenefitsCustomerTypeService = new NfeBenefitsCustomerTypeService();
export const nfeBenefitsStateProductService = new NfeBenefitsStateProductService();
