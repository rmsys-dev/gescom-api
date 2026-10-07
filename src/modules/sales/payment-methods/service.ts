import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { paymentMethods } from "../../../db/schema.js";
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
  CreatePaymentMethodInput,
  ListPaymentMethodsQuery,
  PatchPaymentMethodInput,
} from "./schema.js";

export class PaymentMethodsService {
  public async list(query: ListPaymentMethodsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(paymentMethods)
        .orderBy(asc(paymentMethods.description), asc(paymentMethods.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(paymentMethods),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.id, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Meio de pagamento nao encontrado",
        "PAYMENT_METHOD_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreatePaymentMethodInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(paymentMethods)
        .values({
          paymentCode: input.paymentCode.trim(),
          description: input.description.trim(),
          status: input.status ?? "ATIVO",
          type: input.type,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar meio de pagamento");
      await recordCreateAudit({
        entityType: EntityTypes.PAYMENT_METHODS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Meio de pagamento em conflito (codigo duplicado)",
          "PAYMENT_METHOD_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    id: string,
    input: PatchPaymentMethodInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(id);
    try {
      const [row] = await db
        .update(paymentMethods)
        .set({
          ...(input.paymentCode !== undefined
            ? { paymentCode: input.paymentCode.trim() }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          updatedAt: new Date(),
        })
        .where(eq(paymentMethods.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Meio de pagamento nao encontrado",
          "PAYMENT_METHOD_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PAYMENT_METHODS,
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
          "Meio de pagamento em conflito (codigo duplicado)",
          "PAYMENT_METHOD_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(id: string, audit: EntityAuditContext) {
    const existing = await this.getById(id);
    try {
      const [row] = await db
        .delete(paymentMethods)
        .where(eq(paymentMethods.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Meio de pagamento nao encontrado",
          "PAYMENT_METHOD_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PAYMENT_METHODS,
        entityId: id,
        action: "DELETE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresForeignKeyViolation(err)) {
        throw new ConflictError(
          "Meio de pagamento vinculado a configuracoes de pagamento das empresas",
          "PAYMENT_METHOD_IN_USE",
        );
      }
      throw err;
    }
  }
}

export const paymentMethodsService = new PaymentMethodsService();
