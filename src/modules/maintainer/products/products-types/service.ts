import { eq } from "drizzle-orm";
import { db, productTypes, typeSped } from "../../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";
import {
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from "../../../../shared/db/postgres-errors.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
import type {
  CreateMaintainerTypeProductInput,
  PatchMaintainerTypeProductInput,
} from "./schema.js";

export class MaintainerTypesProductsService {
  private async getById(id: string) {
    const row = (
      await db
        .select()
        .from(productTypes)
        .where(eq(productTypes.id, id))
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

  private async assertTypeSpedExists(typeSpedId: string) {
    const row = (
      await db
        .select({ id: typeSped.id })
        .from(typeSped)
        .where(eq(typeSped.id, typeSpedId))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Tipo SPED nao encontrado",
        "TYPE_SPED_NOT_FOUND",
      );
    }
  }

  public async create(
    input: CreateMaintainerTypeProductInput,
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
    input: PatchMaintainerTypeProductInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(typeProductId);

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
    try {
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
    } catch (err) {
      if (isPostgresForeignKeyViolation(err)) {
        throw new ConflictError(
          "Tipo de produto possui vinculos ativos e nao pode ser excluido",
          "TYPE_PRODUCT_IN_USE",
        );
      }
      throw err;
    }
  }
}

export const maintainerTypesProductsService =
  new MaintainerTypesProductsService();
