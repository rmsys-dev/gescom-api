import { eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import {
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from "../../../shared/db/postgres-errors.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import type { EntityType } from "../../../shared/audit/entity-types.js";

type CatalogRow = { id: string };

export const createCatalogWriter = (options: {
  table: PgTable;
  idColumn: PgColumn;
  entityType: EntityType;
  notFoundMessage: string;
  notFoundCode: string;
  conflictMessage: string;
  conflictCode: string;
}) => {
  const table = options.table as never;
  const idColumn = options.idColumn as never;

  const find = async (id: string): Promise<CatalogRow & Record<string, unknown>> => {
    const rows = await db
      .select()
      .from(table)
      .where(eq(idColumn, id))
      .limit(1);
    const existing = rows[0] as (CatalogRow & Record<string, unknown>) | undefined;
    if (!existing) {
      throw new NotFoundError(options.notFoundMessage, options.notFoundCode);
    }
    return existing;
  };

  return {
    async create(values: Record<string, unknown>, audit: EntityAuditContext) {
      try {
        const inserted = (await db
          .insert(table)
          .values(values as never)
          .returning()) as CatalogRow[];
        const row = inserted[0];
        if (!row) {
          throw new Error(options.notFoundMessage);
        }
        const created = row as CatalogRow & Record<string, unknown>;
        await recordCreateAudit({
          entityType: options.entityType,
          entityId: created.id,
          after: created,
          ctx: audit,
        });
        return created;
      } catch (err) {
        if (isPostgresUniqueViolation(err)) {
          throw new ConflictError(options.conflictMessage, options.conflictCode);
        }
        throw err;
      }
    },

    async patch(
      id: string,
      values: Record<string, unknown>,
      audit: EntityAuditContext,
    ) {
      const existing = await find(id);
      try {
        const updated = (await db
          .update(table)
          .set({ ...values, updatedAt: new Date() } as never)
          .where(eq(idColumn, id))
          .returning()) as Array<CatalogRow & Record<string, unknown>>;
        const row = updated[0];
        if (!row) {
          throw new NotFoundError(options.notFoundMessage, options.notFoundCode);
        }
        await recordEntityAudit({
          entityType: options.entityType,
          entityId: id,
          action: "UPDATE",
          before: toAuditRecord(existing),
          after: toAuditRecord(row as Record<string, unknown>),
          ctx: audit,
        });
        return row as CatalogRow;
      } catch (err) {
        if (isPostgresUniqueViolation(err)) {
          throw new ConflictError(options.conflictMessage, options.conflictCode);
        }
        throw err;
      }
    },

    async remove(id: string, audit: EntityAuditContext) {
      const existing = await find(id);
      let deleted: Array<CatalogRow & Record<string, unknown>>;
      try {
        deleted = (await db
          .delete(table)
          .where(eq(idColumn, id))
          .returning()) as Array<CatalogRow & Record<string, unknown>>;
      } catch (err) {
        if (isPostgresForeignKeyViolation(err)) {
          throw new ConflictError(
            "Registro em uso por outros cadastros e nao pode ser excluido",
            "CATALOG_RECORD_IN_USE",
          );
        }
        throw err;
      }
      const row = deleted[0];
      if (!row) {
        throw new NotFoundError(options.notFoundMessage, options.notFoundCode);
      }
      await recordEntityAudit({
        entityType: options.entityType,
        entityId: id,
        action: "DELETE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row as Record<string, unknown>),
        ctx: audit,
      });
      return row as CatalogRow;
    },
  };
};
