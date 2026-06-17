import { and, asc, count, eq } from "drizzle-orm";
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

export class TypesProductsService {
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

  public async list(query: ListTypesProductsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productTypes)
        .orderBy(asc(productTypes.description), asc(productTypes.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productTypes),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
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
    const existing = await this.getById(typeProductId);
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
