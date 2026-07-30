import { and, asc, count, eq, ilike } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productTypes, typeSped } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
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
  private toResponse(row: ProductTypeWithTypeSped) {
    const { typeSpedId: _typeSpedId, typeSped: typeSpedRow, ...rest } = row;
    return { ...rest, typeSped: typeSpedRow };
  }

  private async assertTypeSpedExists(typeSpedId: string) {
    const rows = await db
      .select({ id: typeSped.id })
      .from(typeSped)
      .where(eq(typeSped.id, typeSpedId))
      .limit(1);
    if (!rows[0]) {
      throw new NotFoundError(
        "Tipo SPED nao encontrado",
        "TYPE_SPED_NOT_FOUND",
      );
    }
  }

  private async getPlainById(id: string) {
    const rows = await db
      .select()
      .from(productTypes)
      .where(eq(productTypes.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundError(
        "Tipo de produto nao encontrado",
        "TYPE_PRODUCT_NOT_FOUND",
      );
    }
    return row;
  }

  public async list(query: ListTypesProductsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [];
    if (query.description) {
      conditions.push(
        ilike(productTypes.description, `%${query.description.toUpperCase()}%`),
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
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

  public async getById(id: string) {
    const row = await db.query.productTypes.findFirst({
      where: eq(productTypes.id, id),
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
    input: CreateTypeProductInput,
    audit: EntityAuditContext,
  ) {
    await this.assertTypeSpedExists(input.typeSpedId);
    try {
      const [row] = await db
        .insert(productTypes)
        .values({
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
          "Tipo de produto em conflito (tipo duplicado)",
          "TYPE_PRODUCT_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    typeProductId: string,
    input: PatchTypeProductInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(productTypes)
      .where(and(eq(productTypes.id, typeProductId)))
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "Tipo de produto nao encontrado",
        "TYPE_PRODUCT_NOT_FOUND",
      );
    }

    if (input.typeSpedId !== undefined) {
      await this.assertTypeSpedExists(input.typeSpedId);
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
        .where(and(eq(productTypes.id, typeProductId)))
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
          "Tipo de produto em conflito (tipo duplicado)",
          "TYPE_PRODUCT_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(typeProductId: string, audit: EntityAuditContext) {
    const existing = await this.getPlainById(typeProductId);
    const [row] = await db
      .delete(productTypes)
      .where(eq(productTypes.id, typeProductId))
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
  }
}

export const typesProductsService = new TypesProductsService();
