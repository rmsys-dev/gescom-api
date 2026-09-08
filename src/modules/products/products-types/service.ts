import { and, asc, count, eq, ilike } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productTypes, typeSped } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import {
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import type {
  CreateTypeProductInput,
  ListTypesProductsQuery,
  PatchTypeProductInput,
} from "./schema.js";

type ProductTypeWithTypeSped = typeof productTypes.$inferSelect & {
  typeSped: typeof typeSped.$inferSelect;
};

export class TypesProductsService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(productTypes.enterprisesId, enterpriseId)];
    if (id) base.push(eq(productTypes.id, id));
    return and(...base);
  }

  private toResponse(row: ProductTypeWithTypeSped) {
    const { typeSpedId: _typeSpedId, typeSped: typeSpedRow, ...rest } = row;
    return { ...rest, typeSped: typeSpedRow };
  }

  private async assertTypeSpedExists(enterpriseId: string, typeSpedId: string) {
    const rows = await db
      .select({ id: typeSped.id })
      .from(typeSped)
      .where(
        and(eq(typeSped.id, typeSpedId), eq(typeSped.enterprisesId, enterpriseId)),
      )
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundError(
        "Tipo SPED nao encontrado",
        "TYPE_SPED_NOT_FOUND",
      );
    }
  }

  private async getPlainById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select()
        .from(productTypes)
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Tipo de produto nao encontrado",
        "TYPE_PRODUCT_NOT_FOUND",
      );
    }
    return row;
  }

  public async list(enterpriseId: string, query: ListTypesProductsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [eq(productTypes.enterprisesId, enterpriseId)];
    if (query.description) {
      conditions.push(
        ilike(productTypes.description, `%${query.description}%`),
      );
    }
    const where = and(...conditions);
    const [items, totalRows] = await Promise.all([
      db.query.productTypes.findMany({
        where,
        with: { typeSped: true },
        orderBy: [asc(productTypes.description), asc(productTypes.id)],
        limit,
        offset,
      }),
      db.select({ c: count() }).from(productTypes).where(where),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return {
      items: items.map((row) => this.toResponse(row)),
      total,
      limit,
      offset,
    };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = await db.query.productTypes.findFirst({
      where: this.scope(enterpriseId, id),
      with: { typeSped: true },
    });
    if (!row) {
      throw new NotFoundError(
        "Tipo de produto nao encontrado",
        "TYPE_PRODUCT_NOT_FOUND",
      );
    }
    return this.toResponse(row);
  }

  public async create(
    enterpriseId: string,
    input: CreateTypeProductInput,
    audit: EntityAuditContext,
  ) {
    await this.assertTypeSpedExists(enterpriseId, input.typeSpedId);
    try {
      const [row] = await db
        .insert(productTypes)
        .values({
          enterprisesId: enterpriseId,
          type: input.type,
          description: input.description.trim(),
          manufacturing: input.manufacturing ?? false,
          sales: input.sales ?? false,
          typeSpedId: input.typeSpedId,
        })
        .returning();
      if (!row) {
        throw new Error("Falha ao criar tipo de produto");
      }
      await recordCreateAudit({
        entityType: EntityTypes.PRODUCT_TYPES,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Tipo de produto em conflito (tipo duplicado na empresa)",
          "TYPE_PRODUCT_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    typeProductId: string,
    input: PatchTypeProductInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getPlainById(enterpriseId, typeProductId);

    if (input.typeSpedId !== undefined) {
      await this.assertTypeSpedExists(enterpriseId, input.typeSpedId);
    }

    const now = new Date();

    try {
      const [row] = await db
        .update(productTypes)
        .set({
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.manufacturing !== undefined
            ? { manufacturing: input.manufacturing }
            : {}),
          ...(input.sales !== undefined ? { sales: input.sales } : {}),
          ...(input.typeSpedId !== undefined
            ? { typeSpedId: input.typeSpedId }
            : {}),
          updatedAt: now,
        })
        .where(this.scope(enterpriseId, typeProductId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Tipo de produto nao encontrado",
          "TYPE_PRODUCT_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCT_TYPES,
        entityId: typeProductId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Tipo de produto em conflito (tipo duplicado na empresa)",
          "TYPE_PRODUCT_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(
    enterpriseId: string,
    typeProductId: string,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getPlainById(enterpriseId, typeProductId);
    try {
      const [row] = await db
        .delete(productTypes)
        .where(this.scope(enterpriseId, typeProductId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Tipo de produto nao encontrado",
          "TYPE_PRODUCT_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCT_TYPES,
        entityId: typeProductId,
        action: "DELETE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresForeignKeyViolation(err)) {
        throw new ConflictError(
          "Tipo de produto possui vinculos ativos e não pode ser excluido",
          "TYPE_PRODUCT_IN_USE",
        );
      }
      throw err;
    }
  }
}

export const typesProductsService = new TypesProductsService();
