import { and, asc, count, eq, getTableColumns, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../../db/index.js";
import {
  enterprisesMembers,
  paymentMethods,
  paymentTypes,
  paymentTypesMethodsFlags,
  typeFlags,
  users,
} from "../../../db/schema.js";
import {
  BadRequestError,
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
  CreatePaymentTypesMethodsFlagsInput,
  ListPaymentTypesMethodsFlagsQuery,
  PatchPaymentTypesMethodsFlagsInput,
} from "./schema.js";

const PAYMENT_CONFIG_MEMBER_CLASSES = ["FORNECEDOR", "PARCEIRO"] as const;

const bandMembers = alias(enterprisesMembers, "band_members");
const bandUsers = alias(users, "band_users");
const intermediaryMembers = alias(enterprisesMembers, "intermediary_members");
const intermediaryUsers = alias(users, "intermediary_users");

const detailSelection = {
  ...getTableColumns(paymentTypesMethodsFlags),
  paymentType: {
    id: paymentTypes.id,
    description: paymentTypes.description,
    paymentType: paymentTypes.paymentType,
  },
  paymentMethod: {
    id: paymentMethods.id,
    paymentCode: paymentMethods.paymentCode,
    description: paymentMethods.description,
    type: paymentMethods.type,
  },
  typeFlag: {
    id: typeFlags.id,
    flagCode: typeFlags.flagCode,
    description: typeFlags.description,
  },
  bandMember: {
    id: bandMembers.id,
    code: bandMembers.code,
    name: bandUsers.userName,
    cnpj: bandUsers.userRegistration,
  },
  intermediaryMember: {
    id: intermediaryMembers.id,
    code: intermediaryMembers.code,
    name: intermediaryUsers.userName,
    cnpj: intermediaryUsers.userRegistration,
  },
};

const detailQuery = () =>
  db
    .select(detailSelection)
    .from(paymentTypesMethodsFlags)
    .innerJoin(
      paymentTypes,
      eq(paymentTypes.id, paymentTypesMethodsFlags.paymentTypesId),
    )
    .innerJoin(
      paymentMethods,
      eq(paymentMethods.id, paymentTypesMethodsFlags.paymentMethodsId),
    )
    .leftJoin(typeFlags, eq(typeFlags.id, paymentTypesMethodsFlags.typeFlagsId))
    .leftJoin(
      bandMembers,
      eq(bandMembers.id, paymentTypesMethodsFlags.bandMemberId),
    )
    .leftJoin(bandUsers, eq(bandUsers.id, bandMembers.userId))
    .leftJoin(
      intermediaryMembers,
      eq(intermediaryMembers.id, paymentTypesMethodsFlags.intermediaryMemberId),
    )
    .leftJoin(intermediaryUsers, eq(intermediaryUsers.id, intermediaryMembers.userId));

export type PaymentConfigCatalog = {
  id: string;
  paymentTypesId: string;
  status: string;
  paymentCode: string;
  integration: string;
  flagCode: string | null;
  flagDescription: string | null;
  cnpj: string | null;
};

/** Dados de meio, bandeira e CNPJ (intermediador, senão bandeira) usados no detPag da NF-e. */
export const loadPaymentConfigCatalog = async (
  enterpriseId: string,
  ids: string[],
): Promise<Map<string, PaymentConfigCatalog>> => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({
      id: paymentTypesMethodsFlags.id,
      paymentTypesId: paymentTypesMethodsFlags.paymentTypesId,
      status: paymentTypesMethodsFlags.status,
      integration: paymentTypesMethodsFlags.integration,
      paymentCode: paymentMethods.paymentCode,
      flagCode: typeFlags.flagCode,
      flagDescription: typeFlags.description,
      bandCnpj: bandUsers.userRegistration,
      intermediaryCnpj: intermediaryUsers.userRegistration,
    })
    .from(paymentTypesMethodsFlags)
    .innerJoin(
      paymentMethods,
      eq(paymentMethods.id, paymentTypesMethodsFlags.paymentMethodsId),
    )
    .leftJoin(typeFlags, eq(typeFlags.id, paymentTypesMethodsFlags.typeFlagsId))
    .leftJoin(bandMembers, eq(bandMembers.id, paymentTypesMethodsFlags.bandMemberId))
    .leftJoin(bandUsers, eq(bandUsers.id, bandMembers.userId))
    .leftJoin(
      intermediaryMembers,
      eq(intermediaryMembers.id, paymentTypesMethodsFlags.intermediaryMemberId),
    )
    .leftJoin(intermediaryUsers, eq(intermediaryUsers.id, intermediaryMembers.userId))
    .where(
      and(
        inArray(paymentTypesMethodsFlags.id, unique),
        eq(paymentTypesMethodsFlags.enterprisesId, enterpriseId),
      ),
    );
  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        paymentTypesId: row.paymentTypesId,
        status: row.status,
        paymentCode: row.paymentCode,
        integration: row.integration,
        flagCode: row.flagCode,
        flagDescription: row.flagDescription,
        cnpj: row.intermediaryCnpj || row.bandCnpj || null,
      },
    ]),
  );
};

/** Garante que cada configuração informada é ativa, da empresa e do mesmo tipo de pagamento. */
export const assertPaymentConfigsMatch = async (
  enterpriseId: string,
  payments: Array<{
    paymentTypeId: string;
    paymentTypesMethodsFlagsId?: string | null;
  }>,
) => {
  const catalog = await loadPaymentConfigCatalog(
    enterpriseId,
    payments.flatMap((payment) =>
      payment.paymentTypesMethodsFlagsId ? [payment.paymentTypesMethodsFlagsId] : [],
    ),
  );
  for (const payment of payments) {
    const configId = payment.paymentTypesMethodsFlagsId;
    if (!configId) continue;
    const config = catalog.get(configId);
    if (!config || config.status !== "ATIVO") {
      throw new NotFoundError(
        "Configuracao de pagamento nao encontrada",
        "PAYMENT_CONFIG_NOT_FOUND",
      );
    }
    if (config.paymentTypesId !== payment.paymentTypeId) {
      throw new BadRequestError(
        "Configuracao de pagamento pertence a outro tipo de pagamento",
        "PAYMENT_CONFIG_TYPE_MISMATCH",
      );
    }
  }
  return catalog;
};

type ReferenceInput = {
  paymentTypesId?: string;
  paymentMethodsId?: string;
  typeFlagsId?: string | null;
  bandMemberId?: string | null;
  intermediaryMemberId?: string | null;
};

export class PaymentTypesMethodsFlagsService {
  public async list(
    enterpriseId: string,
    query: ListPaymentTypesMethodsFlagsQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const where = eq(paymentTypesMethodsFlags.enterprisesId, enterpriseId);
    const [items, totalRows] = await Promise.all([
      detailQuery()
        .where(where)
        .orderBy(
          asc(paymentTypes.description),
          asc(paymentMethods.description),
          asc(paymentTypesMethodsFlags.id),
        )
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(paymentTypesMethodsFlags).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const [row] = await detailQuery()
      .where(
        and(
          eq(paymentTypesMethodsFlags.id, id),
          eq(paymentTypesMethodsFlags.enterprisesId, enterpriseId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        "Configuracao de pagamento nao encontrada",
        "PAYMENT_CONFIG_NOT_FOUND",
      );
    }
    return row;
  }

  private async findRow(enterpriseId: string, id: string) {
    const [row] = await db
      .select()
      .from(paymentTypesMethodsFlags)
      .where(
        and(
          eq(paymentTypesMethodsFlags.id, id),
          eq(paymentTypesMethodsFlags.enterprisesId, enterpriseId),
        ),
      )
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        "Configuracao de pagamento nao encontrada",
        "PAYMENT_CONFIG_NOT_FOUND",
      );
    }
    return row;
  }

  private async assertMember(enterpriseId: string, memberId: string, role: string) {
    const [member] = await db
      .select({ cnpj: users.userRegistration })
      .from(enterprisesMembers)
      .innerJoin(users, eq(users.id, enterprisesMembers.userId))
      .where(
        and(
          eq(enterprisesMembers.id, memberId),
          eq(enterprisesMembers.enterpriseId, enterpriseId),
          eq(enterprisesMembers.status, "ATIVO"),
          isNull(enterprisesMembers.deletedAt),
          inArray(enterprisesMembers.class, [...PAYMENT_CONFIG_MEMBER_CLASSES]),
        ),
      )
      .limit(1);
    const cnpj = (member?.cnpj ?? "").replace(/\D/g, "");
    if (!member || cnpj.length !== 14) {
      throw new BadRequestError(
        `Membro ${role} deve ser FORNECEDOR ou PARCEIRO ativo da empresa e possuir CNPJ`,
        "PAYMENT_CONFIG_MEMBER_INVALID",
      );
    }
  }

  private async assertReferences(enterpriseId: string, input: ReferenceInput) {
    if (input.paymentTypesId) {
      const [row] = await db
        .select({ status: paymentTypes.status })
        .from(paymentTypes)
        .where(eq(paymentTypes.id, input.paymentTypesId))
        .limit(1);
      if (!row || row.status !== "ATIVO") {
        throw new NotFoundError(
          "Tipo de pagamento nao encontrado",
          "PAYMENT_TYPE_NOT_FOUND",
        );
      }
    }
    if (input.paymentMethodsId) {
      const [row] = await db
        .select({ status: paymentMethods.status })
        .from(paymentMethods)
        .where(eq(paymentMethods.id, input.paymentMethodsId))
        .limit(1);
      if (!row || row.status !== "ATIVO") {
        throw new NotFoundError(
          "Meio de pagamento nao encontrado",
          "PAYMENT_METHOD_NOT_FOUND",
        );
      }
    }
    if (input.typeFlagsId) {
      const [row] = await db
        .select({ status: typeFlags.status })
        .from(typeFlags)
        .where(eq(typeFlags.id, input.typeFlagsId))
        .limit(1);
      if (!row || row.status !== "ATIVO") {
        throw new NotFoundError("Bandeira nao encontrada", "TYPE_FLAG_NOT_FOUND");
      }
    }
    if (input.bandMemberId) {
      await this.assertMember(enterpriseId, input.bandMemberId, "da bandeira");
    }
    if (input.intermediaryMemberId) {
      await this.assertMember(
        enterpriseId,
        input.intermediaryMemberId,
        "intermediador",
      );
    }
  }

  private mapWriteError(err: unknown): never {
    if (isPostgresUniqueViolation(err)) {
      throw new ConflictError(
        "Ja existe configuracao para este tipo, meio de pagamento e bandeira na empresa",
        "PAYMENT_CONFIG_CONFLICT",
      );
    }
    if (isPostgresForeignKeyViolation(err)) {
      throw new ConflictError(
        "Referencia invalida ou configuracao em uso",
        "PAYMENT_CONFIG_REFERENCE_CONFLICT",
      );
    }
    throw err;
  }

  public async create(
    enterpriseId: string,
    input: CreatePaymentTypesMethodsFlagsInput,
    audit: EntityAuditContext,
  ) {
    await this.assertReferences(enterpriseId, input);
    try {
      const [row] = await db
        .insert(paymentTypesMethodsFlags)
        .values({
          enterprisesId: enterpriseId,
          paymentTypesId: input.paymentTypesId,
          paymentMethodsId: input.paymentMethodsId,
          typeFlagsId: input.typeFlagsId ?? null,
          status: input.status ?? "ATIVO",
          sped1601: input.sped1601 ?? false,
          generateCharge: input.generateCharge ?? false,
          integration: input.integration,
          bandMemberId: input.bandMemberId ?? null,
          intermediaryMemberId: input.intermediaryMemberId ?? null,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar configuracao de pagamento");
      await recordCreateAudit({
        entityType: EntityTypes.PAYMENT_TYPES_METHODS_FLAGS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return this.getById(enterpriseId, row.id);
    } catch (err) {
      this.mapWriteError(err);
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchPaymentTypesMethodsFlagsInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.findRow(enterpriseId, id);
    await this.assertReferences(enterpriseId, input);
    try {
      const [row] = await db
        .update(paymentTypesMethodsFlags)
        .set({
          ...(input.paymentTypesId !== undefined
            ? { paymentTypesId: input.paymentTypesId }
            : {}),
          ...(input.paymentMethodsId !== undefined
            ? { paymentMethodsId: input.paymentMethodsId }
            : {}),
          ...(input.typeFlagsId !== undefined
            ? { typeFlagsId: input.typeFlagsId }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.sped1601 !== undefined ? { sped1601: input.sped1601 } : {}),
          ...(input.generateCharge !== undefined
            ? { generateCharge: input.generateCharge }
            : {}),
          ...(input.integration !== undefined
            ? { integration: input.integration }
            : {}),
          ...(input.bandMemberId !== undefined
            ? { bandMemberId: input.bandMemberId }
            : {}),
          ...(input.intermediaryMemberId !== undefined
            ? { intermediaryMemberId: input.intermediaryMemberId }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(paymentTypesMethodsFlags.id, id),
            eq(paymentTypesMethodsFlags.enterprisesId, enterpriseId),
          ),
        )
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Configuracao de pagamento nao encontrada",
          "PAYMENT_CONFIG_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PAYMENT_TYPES_METHODS_FLAGS,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return this.getById(enterpriseId, id);
    } catch (err) {
      this.mapWriteError(err);
    }
  }

  public async delete(enterpriseId: string, id: string, audit: EntityAuditContext) {
    const existing = await this.findRow(enterpriseId, id);
    try {
      const [row] = await db
        .delete(paymentTypesMethodsFlags)
        .where(
          and(
            eq(paymentTypesMethodsFlags.id, id),
            eq(paymentTypesMethodsFlags.enterprisesId, enterpriseId),
          ),
        )
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Configuracao de pagamento nao encontrada",
          "PAYMENT_CONFIG_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PAYMENT_TYPES_METHODS_FLAGS,
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
          "Configuracao de pagamento vinculada a vendas ou notas fiscais",
          "PAYMENT_CONFIG_IN_USE",
        );
      }
      throw err;
    }
  }
}

export const paymentTypesMethodsFlagsService = new PaymentTypesMethodsFlagsService();
