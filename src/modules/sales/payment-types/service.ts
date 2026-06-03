import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { paymentTypes } from "../../../db/schema.js";
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
  CreatePaymentTypeInput,
  ListPaymentTypesQuery,
  PatchPaymentTypeInput,
} from "./schema.js";

export class PaymentTypesService {
  public async list(query: ListPaymentTypesQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(paymentTypes)
        .orderBy(asc(paymentTypes.description), asc(paymentTypes.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(paymentTypes),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db
        .select()
        .from(paymentTypes)
        .where(eq(paymentTypes.id, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Tipo de pagamento nao encontrado",
        "PAYMENT_TYPE_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(input: CreatePaymentTypeInput, audit: EntityAuditContext) {
    try {
      const [row] = await db
        .insert(paymentTypes)
        .values({
          description: input.description.trim(),
          status: input.status ?? "ATIVO",
        })
        .returning();
      if (!row) throw new Error("Falha ao criar tipo de pagamento");
      await recordCreateAudit({
        entityType: EntityTypes.PAYMENT_TYPES,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Tipo de pagamento em conflito (descricao duplicada ativa)",
          "PAYMENT_TYPE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    id: string,
    input: PatchPaymentTypeInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(id);
    try {
      const [row] = await db
        .update(paymentTypes)
        .set({
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedAt: new Date(),
        })
        .where(eq(paymentTypes.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Tipo de pagamento nao encontrado",
          "PAYMENT_TYPE_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PAYMENT_TYPES,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Tipo de pagamento em conflito (descricao duplicada ativa)",
          "PAYMENT_TYPE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(id: string, audit: EntityAuditContext) {
    const existing = await this.getById(id);
    const [row] = await db
      .delete(paymentTypes)
      .where(eq(paymentTypes.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Tipo de pagamento nao encontrado",
        "PAYMENT_TYPE_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PAYMENT_TYPES,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const paymentTypesService = new PaymentTypesService();
