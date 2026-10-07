import { and, asc, count, desc, eq, ne, type SQL } from "drizzle-orm";
import { db } from "../../db/index.js";
import { printers } from "../../db/schema.js";
import { ConflictError, NotFoundError } from "../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../shared/audit/entity-types.js";
import {
  buildPrinterUncPath,
  type CreatePrinterInput,
  type ListPrintersQuery,
  type PatchPrinterInput,
} from "./schema.js";

type PrinterRow = typeof printers.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const withUncPath = (row: PrinterRow) => ({
  ...row,
  uncPath: buildPrinterUncPath(row.computerName, row.shareName),
});

const conflictError = () =>
  new ConflictError(
    "Ja existe uma impressora com este computador e compartilhamento",
    "PRINTER_CONFLICT",
  );

const notFoundError = () =>
  new NotFoundError("Impressora nao encontrada", "PRINTER_NOT_FOUND");

const clearDefault = async (tx: Tx, enterpriseId: string, exceptId?: string) => {
  const where = [eq(printers.enterprisesId, enterpriseId), eq(printers.isDefault, true)];
  if (exceptId) where.push(ne(printers.id, exceptId));
  await tx
    .update(printers)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(and(...where));
};

export class PrintersService {
  public async list(enterpriseId: string, query: ListPrintersQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const filters: SQL[] = [eq(printers.enterprisesId, enterpriseId)];
    if (query.status) filters.push(eq(printers.status, query.status));
    const where = and(...filters);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(printers)
        .where(where)
        .orderBy(desc(printers.isDefault), asc(printers.description), asc(printers.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(printers).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items: items.map(withUncPath), total, limit, offset };
  }

  private async findRow(enterpriseId: string, id: string) {
    const row = (
      await db
        .select()
        .from(printers)
        .where(and(eq(printers.id, id), eq(printers.enterprisesId, enterpriseId)))
        .limit(1)
    )[0];
    if (!row) throw notFoundError();
    return row;
  }

  public async getById(enterpriseId: string, id: string) {
    return withUncPath(await this.findRow(enterpriseId, id));
  }

  public async create(
    enterpriseId: string,
    input: CreatePrinterInput,
    audit: EntityAuditContext,
  ) {
    try {
      const row = await db.transaction(async (tx) => {
        if (input.isDefault) await clearDefault(tx, enterpriseId);
        const [created] = await tx
          .insert(printers)
          .values({
            enterprisesId: enterpriseId,
            description: input.description,
            computerName: input.computerName,
            shareName: input.shareName,
            paperType: input.paperType,
            isDefault: input.isDefault,
            status: input.status,
          })
          .returning();
        if (!created) throw new Error("Falha ao criar impressora");
        return created;
      });
      await recordCreateAudit({
        entityType: EntityTypes.PRINTERS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return withUncPath(row);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) throw conflictError();
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchPrinterInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.findRow(enterpriseId, id);
    try {
      const row = await db.transaction(async (tx) => {
        if (input.isDefault === true) await clearDefault(tx, enterpriseId, id);
        const [updated] = await tx
          .update(printers)
          .set({
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.computerName !== undefined ? { computerName: input.computerName } : {}),
            ...(input.shareName !== undefined ? { shareName: input.shareName } : {}),
            ...(input.paperType !== undefined ? { paperType: input.paperType } : {}),
            ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            updatedAt: new Date(),
          })
          .where(and(eq(printers.id, id), eq(printers.enterprisesId, enterpriseId)))
          .returning();
        if (!updated) throw notFoundError();
        return updated;
      });
      await recordEntityAudit({
        entityType: EntityTypes.PRINTERS,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return withUncPath(row);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) throw conflictError();
      throw err;
    }
  }

  public async delete(enterpriseId: string, id: string, audit: EntityAuditContext) {
    const existing = await this.findRow(enterpriseId, id);
    const [row] = await db
      .delete(printers)
      .where(and(eq(printers.id, id), eq(printers.enterprisesId, enterpriseId)))
      .returning();
    if (!row) throw notFoundError();
    await recordEntityAudit({
      entityType: EntityTypes.PRINTERS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return withUncPath(row);
  }
}

export const printersService = new PrintersService();
