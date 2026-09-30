import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { typeSupplierCustomers } from "../../../db/schema.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type {
  CreateTypeSupplierCustomerInput,
  ListTypeSupplierCustomersQuery,
  PatchTypeSupplierCustomerInput,
} from "./schema.js";

const scoped = (enterpriseId: string, id: string) =>
  and(
    eq(typeSupplierCustomers.id, id),
    eq(typeSupplierCustomers.enterpriseId, enterpriseId),
  );

export class TypeSupplierCustomersService {
  public async list(
    enterpriseId: string,
    query: ListTypeSupplierCustomersQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const where = eq(typeSupplierCustomers.enterpriseId, enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(typeSupplierCustomers)
        .where(where)
        .orderBy(
          asc(typeSupplierCustomers.description),
          asc(typeSupplierCustomers.id),
        )
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(typeSupplierCustomers).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select()
        .from(typeSupplierCustomers)
        .where(scoped(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Tipo de fornecedor/cliente nao encontrado",
        "TYPE_SUPPLIER_CUSTOMER_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateTypeSupplierCustomerInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(typeSupplierCustomers)
        .values({
          enterpriseId,
          description: input.description.trim(),
          status: input.status ?? "ATIVO",
          low: input.low ?? false,
          generatesSt: input.generatesSt ?? false,
          endConsumer: input.endConsumer ?? false,
          classification: input.classification ?? "CLIENTE",
          customerDiscount:
            input.customerDiscount != null
              ? input.customerDiscount.toString()
              : null,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar tipo de fornecedor/cliente");
      await recordCreateAudit({
        entityType: EntityTypes.TYPE_SUPPLIER_CUSTOMERS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Tipo de fornecedor/cliente em conflito (descricao duplicada)",
          "TYPE_SUPPLIER_CUSTOMER_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchTypeSupplierCustomerInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    try {
      const [row] = await db
        .update(typeSupplierCustomers)
        .set({
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.low !== undefined ? { low: input.low } : {}),
          ...(input.generatesSt !== undefined
            ? { generatesSt: input.generatesSt }
            : {}),
          ...(input.endConsumer !== undefined
            ? { endConsumer: input.endConsumer }
            : {}),
          ...(input.classification !== undefined
            ? { classification: input.classification }
            : {}),
          ...(input.customerDiscount !== undefined
            ? {
                customerDiscount:
                  input.customerDiscount != null
                    ? input.customerDiscount.toString()
                    : null,
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(scoped(enterpriseId, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Tipo de fornecedor/cliente nao encontrado",
          "TYPE_SUPPLIER_CUSTOMER_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.TYPE_SUPPLIER_CUSTOMERS,
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
          "Tipo de fornecedor/cliente em conflito (descricao duplicada)",
          "TYPE_SUPPLIER_CUSTOMER_CONFLICT",
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
    const existing = await this.getById(enterpriseId, id);
    const [row] = await db
      .delete(typeSupplierCustomers)
      .where(scoped(enterpriseId, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Tipo de fornecedor/cliente nao encontrado",
        "TYPE_SUPPLIER_CUSTOMER_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.TYPE_SUPPLIER_CUSTOMERS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const typeSupplierCustomersService = new TypeSupplierCustomersService();
