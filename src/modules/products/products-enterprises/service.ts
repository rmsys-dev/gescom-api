import { and, asc, count, eq, exists, ilike, or, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  measurementUnits,
  productApplication,
  productBrands,
  products,
  productsAnp,
  productGroups,
  productSubgroups,
  productTypes,
  productsCest,
  productsEnterprises,
  productsNcm,
  productsNbs,
} from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  withEnterpriseAuditContext,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import {
  getProductTypeCode,
  PRODUCT_TYPE_SERVICE_CODE,
} from "../../../shared/products/product-type-service.js";
import type {
  CreateProductEnterpriseInput,
  CreateProductEnterprisePayloadInput,
  ListProductsEnterprisesQuery,
  PatchProductEnterpriseInput,
} from "./schema.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | Tx;

const productEnterpriseSelectFields = {
  id: productsEnterprises.id,
  productId: productsEnterprises.productId,
  enterprisesId: productsEnterprises.enterprisesId,
  code: productsEnterprises.code,
  description: productsEnterprises.description,
  origin: productsEnterprises.origin,
  manufacturer: productsEnterprises.manufacturer,
  measurementUnitId: productsEnterprises.measurementUnitId,
  productTypeId: productsEnterprises.productTypeId,
  productNcmId: productsEnterprises.productNcmId,
  productCestId: productsEnterprises.productCestId,
  productAnpId: productsEnterprises.productAnpId,
  productNbsId: productsEnterprises.productNbsId,
  productGroupId: productsEnterprises.productGroupId,
  productSubgroupId: productsEnterprises.productSubgroupId,
  productBrandId: productsEnterprises.productBrandId,
  controlsBatch: productsEnterprises.controlsBatch,
  status: products.status,
  barCode: products.barCode,
  createdAt: productsEnterprises.createdAt,
  updatedAt: productsEnterprises.updatedAt,
};

export class ProductsEnterprisesService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(productsEnterprises.enterprisesId, enterpriseId)];
    if (id) base.push(eq(productsEnterprises.id, id));
    return and(...base);
  }

  private async assertProductExists(productId: string) {
    const row = (
      await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Produto nao encontrado", "PRODUCT_NOT_FOUND");
    }
  }

  private async assertFkExists(enterpriseId: string) {
    return {
      measurementUnit: async (id: string) => {
        const row = (
          await db
            .select({ id: measurementUnits.id })
            .from(measurementUnits)
            .where(eq(measurementUnits.id, id))
            .limit(1)
        )[0];
        if (!row) {
          throw new NotFoundError(
            "Unidade de medida nao encontrada",
            "UNIT_NOT_FOUND",
          );
        }
      },
      productType: async (id: string) => {
        const row = (
          await db
            .select({ id: productTypes.id })
            .from(productTypes)
            .where(eq(productTypes.id, id))
            .limit(1)
        )[0];
        if (!row) {
          throw new NotFoundError(
            "Tipo de produto nao encontrado",
            "PRODUCT_TYPE_NOT_FOUND",
          );
        }
      },
      ncm: async (id: string) => {
        const row = (
          await db
            .select({ id: productsNcm.id })
            .from(productsNcm)
            .where(eq(productsNcm.id, id))
            .limit(1)
        )[0];
        if (!row) {
          throw new NotFoundError(
            "NCM de produto nao encontrado",
            "PRODUCTS_NCM_NOT_FOUND",
          );
        }
      },
      cest: async (id: string) => {
        const row = (
          await db
            .select({ id: productsCest.id })
            .from(productsCest)
            .where(eq(productsCest.id, id))
            .limit(1)
        )[0];
        if (!row) {
          throw new NotFoundError(
            "CEST de produto nao encontrado",
            "PRODUCTS_CEST_NOT_FOUND",
          );
        }
      },
      anp: async (id: string) => {
        const row = (
          await db
            .select({ id: productsAnp.id })
            .from(productsAnp)
            .where(eq(productsAnp.id, id))
            .limit(1)
        )[0];
        if (!row) {
          throw new NotFoundError(
            "ANP de produto nao encontrado",
            "PRODUCTS_ANP_NOT_FOUND",
          );
        }
      },
      nbs: async (id: string) => {
        const row = (
          await db
            .select({ id: productsNbs.id })
            .from(productsNbs)
            .where(eq(productsNbs.id, id))
            .limit(1)
        )[0];
        if (!row) {
          throw new NotFoundError(
            "NBS de servico nao encontrado",
            "PRODUCTS_NBS_NOT_FOUND",
          );
        }
      },
      group: async (id: string) => {
        const row = (
          await db
            .select({ id: productGroups.id })
            .from(productGroups)
            .where(
              and(
                eq(productGroups.id, id),
                eq(productGroups.enterprisesId, enterpriseId),
              ),
            )
            .limit(1)
        )[0];
        if (!row) {
          throw new NotFoundError(
            "Grupo de produto nao encontrado",
            "PRODUCT_GROUP_NOT_FOUND",
          );
        }
      },
      subgroup: async (id: string) => {
        const row = (
          await db
            .select({ id: productSubgroups.id })
            .from(productSubgroups)
            .where(
              and(
                eq(productSubgroups.id, id),
                eq(productSubgroups.enterprisesId, enterpriseId),
              ),
            )
            .limit(1)
        )[0];
        if (!row) {
          throw new NotFoundError(
            "Subgrupo de produto nao encontrado",
            "PRODUCT_SUBGROUP_NOT_FOUND",
          );
        }
      },
      brand: async (id: string) => {
        const row = (
          await db
            .select({ id: productBrands.id })
            .from(productBrands)
            .where(
              and(
                eq(productBrands.id, id),
                eq(productBrands.enterprisesId, enterpriseId),
              ),
            )
            .limit(1)
        )[0];
        if (!row) {
          throw new NotFoundError(
            "Marca de produto nao encontrada",
            "PRODUCT_BRAND_NOT_FOUND",
          );
        }
      },
    };
  }

  private async validateProductTypeRules(input: {
    productTypeId: string;
    productNcmId?: string | null;
    productCestId?: string | null;
    productAnpId?: string | null;
    productNbsId?: string | null;
  }) {
    const typeCode = await getProductTypeCode(input.productTypeId);
    if (!typeCode) {
      throw new NotFoundError(
        "Tipo de produto nao encontrado",
        "PRODUCT_TYPE_NOT_FOUND",
      );
    }

    const isService = typeCode === PRODUCT_TYPE_SERVICE_CODE;

    if (isService) {
      if (!input.productNbsId) {
        throw new ValidationError(
          [
            {
              path: "productNbsId",
              message: "NBS obrigatorio para produto do tipo servico (09)",
            },
          ],
          "NBS obrigatorio para servico",
        );
      }
      return;
    }

    if (input.productNbsId) {
      throw new ValidationError(
        [
          {
            path: "productNbsId",
            message: "NBS permitido apenas para produto do tipo servico (09)",
          },
        ],
        "NBS nao permitido para este tipo de produto",
      );
    }

    const missing: { path: string; message: string }[] = [];
    if (!input.productNcmId) {
      missing.push({
        path: "productNcmId",
        message: "NCM obrigatorio para produto que nao e servico",
      });
    }
    if (!input.productCestId) {
      missing.push({
        path: "productCestId",
        message: "CEST obrigatorio para produto que nao e servico",
      });
    }
    if (!input.productAnpId) {
      missing.push({
        path: "productAnpId",
        message: "ANP obrigatorio para produto que nao e servico",
      });
    }
    if (missing.length > 0) {
      throw new ValidationError(
        missing,
        "Dados fiscais obrigatorios para produto",
      );
    }
  }

  private async validateProductFks(
    enterpriseId: string,
    input: {
    measurementUnitId: string;
    productTypeId: string;
    productNcmId?: string | null;
    productCestId?: string | null;
    productAnpId?: string | null;
    productNbsId?: string | null;
    productGroupId: string;
    productSubgroupId: string;
    productBrandId: string;
  },
  ) {
    await this.validateProductTypeRules(input);

    const fk = await this.assertFkExists(enterpriseId);
    const checks = [
      fk.measurementUnit(input.measurementUnitId),
      fk.productType(input.productTypeId),
      fk.group(input.productGroupId),
      fk.subgroup(input.productSubgroupId),
      fk.brand(input.productBrandId),
    ];
    if (input.productNcmId) {
      checks.push(fk.ncm(input.productNcmId));
    }
    if (input.productCestId) {
      checks.push(fk.cest(input.productCestId));
    }
    if (input.productAnpId) {
      checks.push(fk.anp(input.productAnpId));
    }
    if (input.productNbsId) {
      checks.push(fk.nbs(input.productNbsId));
    }
    await Promise.all(checks);
  }

  public async assertEnterprisePayload(
    enterpriseId: string,
    input: CreateProductEnterprisePayloadInput,
  ) {
    await this.validateProductFks(enterpriseId, input);
  }

  private async insertEnterpriseLink(
    client: DbClient,
    enterpriseId: string,
    productId: string,
    input: CreateProductEnterprisePayloadInput,
  ) {
    const [row] = await client
      .insert(productsEnterprises)
      .values({
        code: input.code ?? null,
        description: input.description.trim(),
        origin: input.origin?.trim() ?? null,
        manufacturer: input.manufacturer?.trim() ?? null,
        productId,
        enterprisesId: enterpriseId,
        measurementUnitId: input.measurementUnitId,
        productTypeId: input.productTypeId,
        productNcmId: input.productNcmId ?? null,
        productCestId: input.productCestId ?? null,
        productAnpId: input.productAnpId ?? null,
        productNbsId: input.productNbsId ?? null,
        productGroupId: input.productGroupId,
        productSubgroupId: input.productSubgroupId,
        productBrandId: input.productBrandId,
        controlsBatch: input.controlsBatch ?? false,
      })
      .returning({ id: productsEnterprises.id });
    if (!row) throw new Error("Falha ao vincular produto a empresa");
    return row.id;
  }

  private async getLinkedRow(
    enterpriseId: string,
    id: string,
    client: DbClient = db,
  ) {
    const row = (
      await client
        .select(productEnterpriseSelectFields)
        .from(productsEnterprises)
        .innerJoin(products, eq(productsEnterprises.productId, products.id))
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Vinculo produto/empresa nao encontrado",
        "PRODUCT_ENTERPRISE_NOT_FOUND",
      );
    }
    return row;
  }

  public async createForProduct(
    enterpriseId: string,
    productId: string,
    input: CreateProductEnterprisePayloadInput,
    tx?: Tx,
    audit?: EntityAuditContext,
  ) {
    const client = tx ?? db;
    try {
      const linkId = await this.insertEnterpriseLink(
        client,
        enterpriseId,
        productId,
        input,
      );
      const row = await this.getLinkedRow(enterpriseId, linkId, client);
      if (audit) {
        await recordCreateAudit({
          entityType: EntityTypes.PRODUCTS_ENTERPRISES,
          entityId: row.id,
          after: row,
          ctx: audit,
          tx,
        });
      }
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Produto ja vinculado a esta empresa",
          "PRODUCT_ENTERPRISE_CONFLICT",
        );
      }
      throw err;
    }
  }

  private buildListConditions(
    enterpriseId: string,
    query: ListProductsEnterprisesQuery,
  ) {
    const conditions = [eq(productsEnterprises.enterprisesId, enterpriseId)];

    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          ilike(productsEnterprises.description, term),
          ilike(products.barCode, term),
          ilike(products.description, term),
          sql`cast(${productsEnterprises.code} as text) ilike ${term}`,
        )!,
      );
    }

    if (query.description) {
      conditions.push(
        ilike(productsEnterprises.description, `%${query.description}%`),
      );
    }

    if (query.code) {
      conditions.push(
        sql`cast(${productsEnterprises.code} as text) ilike ${`%${query.code}%`}`,
      );
    }

    if (query.barCode) {
      conditions.push(ilike(products.barCode, `%${query.barCode}%`));
    }

    if (query.manufacturer) {
      conditions.push(
        ilike(productsEnterprises.manufacturer, `%${query.manufacturer}%`),
      );
    }

    if (query.origin) {
      conditions.push(ilike(productsEnterprises.origin, `%${query.origin}%`));
    }

    if (query.group) {
      const term = `%${query.group}%`;
      conditions.push(
        exists(
          db
            .select({ id: productGroups.id })
            .from(productGroups)
            .where(
              and(
                eq(productGroups.id, productsEnterprises.productGroupId),
                eq(productGroups.enterprisesId, enterpriseId),
                ilike(productGroups.description, term),
              ),
            ),
        ),
      );
    }

    if (query.subgroup) {
      const term = `%${query.subgroup}%`;
      conditions.push(
        exists(
          db
            .select({ id: productSubgroups.id })
            .from(productSubgroups)
            .where(
              and(
                eq(
                  productSubgroups.id,
                  productsEnterprises.productSubgroupId,
                ),
                eq(productSubgroups.enterprisesId, enterpriseId),
                ilike(productSubgroups.description, term),
              ),
            ),
        ),
      );
    }

    if (query.brand) {
      const term = `%${query.brand}%`;
      conditions.push(
        exists(
          db
            .select({ id: productBrands.id })
            .from(productBrands)
            .where(
              and(
                eq(productBrands.id, productsEnterprises.productBrandId),
                eq(productBrands.enterprisesId, enterpriseId),
                ilike(productBrands.description, term),
              ),
            ),
        ),
      );
    }

    if (query.application) {
      const term = `%${query.application}%`;
      conditions.push(
        exists(
          db
            .select({ id: productApplication.id })
            .from(productApplication)
            .where(
              and(
                eq(
                  productApplication.productsEnterprisesId,
                  productsEnterprises.id,
                ),
                ilike(productApplication.description, term),
              ),
            ),
        ),
      );
    }

    if (query.status) {
      conditions.push(eq(products.status, query.status));
    }

    return and(...conditions);
  }

  public async list(
    enterpriseId: string,
    query: ListProductsEnterprisesQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.buildListConditions(enterpriseId, query);
    const [items, totalRows] = await Promise.all([
      db
        .select(productEnterpriseSelectFields)
        .from(productsEnterprises)
        .innerJoin(products, eq(productsEnterprises.productId, products.id))
        .where(where)
        .orderBy(
          asc(productsEnterprises.description),
          asc(productsEnterprises.id),
        )
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(productsEnterprises)
        .innerJoin(products, eq(productsEnterprises.productId, products.id))
        .where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    return this.getLinkedRow(enterpriseId, id);
  }

  public async getByCode(enterpriseId: string, code: number) {
    const row = (
      await db
        .select(productEnterpriseSelectFields)
        .from(productsEnterprises)
        .innerJoin(products, eq(productsEnterprises.productId, products.id))
        .where(
          and(
            eq(productsEnterprises.enterprisesId, enterpriseId),
            eq(productsEnterprises.code, code),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Vinculo produto/empresa nao encontrado",
        "PRODUCT_ENTERPRISE_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateProductEnterpriseInput,
    audit: EntityAuditContext,
  ) {
    await Promise.all([
      this.assertProductExists(input.productId),
      this.validateProductFks(enterpriseId, input),
    ]);
    const { productId, ...payload } = input;
    return this.createForProduct(
      enterpriseId,
      productId,
      payload,
      undefined,
      withEnterpriseAuditContext(audit, enterpriseId),
    );
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchProductEnterpriseInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getLinkedRow(enterpriseId, id);
    const merged = {
      measurementUnitId: input.measurementUnitId ?? existing.measurementUnitId,
      productTypeId: input.productTypeId ?? existing.productTypeId,
      productNcmId:
        input.productNcmId !== undefined
          ? input.productNcmId
          : existing.productNcmId,
      productCestId:
        input.productCestId !== undefined
          ? input.productCestId
          : existing.productCestId,
      productAnpId:
        input.productAnpId !== undefined
          ? input.productAnpId
          : existing.productAnpId,
      productNbsId:
        input.productNbsId !== undefined
          ? input.productNbsId
          : existing.productNbsId,
      productGroupId: input.productGroupId ?? existing.productGroupId,
      productSubgroupId: input.productSubgroupId ?? existing.productSubgroupId,
      productBrandId: input.productBrandId ?? existing.productBrandId,
    };
    if (
      input.measurementUnitId ||
      input.productTypeId ||
      input.productNcmId !== undefined ||
      input.productCestId !== undefined ||
      input.productAnpId !== undefined ||
      input.productNbsId !== undefined ||
      input.productGroupId ||
      input.productSubgroupId ||
      input.productBrandId
    ) {
      await this.validateProductFks(enterpriseId, merged);
    }
    try {
      const [row] = await db
        .update(productsEnterprises)
        .set({
          ...(input.code !== undefined ? { code: input.code } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.origin !== undefined
            ? {
                origin: input.origin === null ? null : input.origin.trim(),
              }
            : {}),
          ...(input.manufacturer !== undefined
            ? {
                manufacturer:
                  input.manufacturer === null
                    ? null
                    : input.manufacturer.trim(),
              }
            : {}),
          ...(input.measurementUnitId !== undefined
            ? { measurementUnitId: input.measurementUnitId }
            : {}),
          ...(input.productTypeId !== undefined
            ? { productTypeId: input.productTypeId }
            : {}),
          ...(input.productNcmId !== undefined
            ? { productNcmId: input.productNcmId }
            : {}),
          ...(input.productCestId !== undefined
            ? { productCestId: input.productCestId }
            : {}),
          ...(input.productAnpId !== undefined
            ? { productAnpId: input.productAnpId }
            : {}),
          ...(input.productNbsId !== undefined
            ? { productNbsId: input.productNbsId }
            : {}),
          ...(input.productGroupId !== undefined
            ? { productGroupId: input.productGroupId }
            : {}),
          ...(input.productSubgroupId !== undefined
            ? { productSubgroupId: input.productSubgroupId }
            : {}),
          ...(input.productBrandId !== undefined
            ? { productBrandId: input.productBrandId }
            : {}),
          ...(input.controlsBatch !== undefined
            ? { controlsBatch: input.controlsBatch }
            : {}),
          updatedAt: new Date(),
        })
        .where(this.scope(enterpriseId, id))
        .returning({ id: productsEnterprises.id });
      if (!row) {
        throw new NotFoundError(
          "Vinculo produto/empresa nao encontrado",
          "PRODUCT_ENTERPRISE_NOT_FOUND",
        );
      }
      const updated = await this.getLinkedRow(enterpriseId, row.id);
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCTS_ENTERPRISES,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(updated),
        ctx: withEnterpriseAuditContext(audit, enterpriseId),
      });
      return updated;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Produto ja vinculado a esta empresa",
          "PRODUCT_ENTERPRISE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(
    enterpriseId: string,
    id: string,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getLinkedRow(enterpriseId, id);
    const ctx = withEnterpriseAuditContext(audit, enterpriseId);
    const [row] = await db
      .delete(productsEnterprises)
      .where(this.scope(enterpriseId, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Vinculo produto/empresa nao encontrado",
        "PRODUCT_ENTERPRISE_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCTS_ENTERPRISES,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx,
    });
    return row;
  }
}

export const productsEnterprisesService = new ProductsEnterprisesService();
