import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  enterprisesMembers,
  measurementUnits,
  mechanicSalesItems,
  paymentTypes,
  productTypes,
  productsEnterprises,
  promotionalPrices,
  sales,
  saleConversionItems,
  saleConversions,
  saleUnclosedItems,
  type SaleConversionType,
  salesDues,
  salesItems,
  salesMembers,
  salesPayments,
  salesReturns,
  stockBatches,
  stockLocations,
  stockSectors,
  users,
  usersAddress,
  usersContact,
  vehicles,
  vehiclesEnterprisesMembers,
} from "../../db/schema.js";
import { ceps, cities, states } from "../../db/entities/addresses.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/app-error.js";
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
  getProductTypeCode,
  isServiceProductType,
  PRODUCT_TYPE_SERVICE_CODE,
} from "../../shared/products/product-type-service.js";
import {
  applyPromotionalUnitPrice,
  resolveEffectiveSalePrice,
} from "../../shared/products/resolve-sale-price.js";
import { PERM } from "../auth/default-permissions.js";
import { isAllowed, resolvePermissions } from "../auth/permissions.js";
import {
  assertEnterpriseParameter,
  resolveEnterpriseParameters,
} from "../enterprises/parameters/resolve.js";
import { resolveDefaultSaleItemStockRefs } from "../stock/balance.js";
import {
  assertSaleOrderNumberAvailable,
  nextSaleOrderNumber,
  syncSaleOrderSequenceFloor,
} from "./sequences.js";
import {
  applySaleItemStockOut,
  applySaleItemStockReturn,
  assertSaleItemStockAvailable,
  assertSaleItemsStockCommitted,
  syncSaleItemStockOnUpdate,
  validateSaleItemStock,
} from "./sale-stock.js";
import { resolveSaleClosingOrigin, type SaleOrigin } from "./sale-origin.js";
import { allocateValueLiquidItemsHeader } from "./sale-item-liquid.js";
import { effectiveCompletionDateSql } from "./analytics/scope.js";
import {
  computeItemValueTotal,
  convertBudgetItemInputSchema,
  convertOsItemInputSchema,
  type ConvertBudgetToOsInput,
  type ConvertBudgetToSaleInput,
  type ConvertOsToSaleInput,
  type CreateSaleInput,
  type CreateSaleItemInput,
  type ListSalesQuery,
  type PatchSaleInput,
  type PatchSaleItemInput,
  type SaleMemberOverrideInput,
  type SalePaymentInput,
} from "./schema.js";
import type { z } from "zod";

type ConvertBudgetItemLine = z.infer<typeof convertBudgetItemInputSchema>;
type ConvertOsItemLine = z.infer<typeof convertOsItemInputSchema>;
type ConversionStockLine = {
  stockSectorId?: string;
  stockLocationId?: string;
  stockBatchId?: string | null;
};

type BudgetStatus = "ABERTA" | "PARCIAL" | "FINALIZADA";
type SaleConversionClosureKind = "PARCIAL" | "TOTAL";

const POST_SALES_STATUS_TO_APPLY = [
  "INATIVO",
  "BLOQUEADO",
  "FUNCIONARIO",
] as const;

const CREDIT_SALE_ALLOWED_MEMBER_STATUSES = [
  "ATIVO",
  "ESPECIAL",
  "FUNCIONARIO",
] as const;

const dec = (v: number | undefined | null) =>
  v !== undefined && v !== null ? v.toString() : null;

const decNum = (v: string | number | null | undefined) =>
  v !== undefined && v !== null && v !== "" ? Number(v) : 0;

const formatQuantity = (value: number) => value.toFixed(4);

const moneyCents = (value: number) => Math.round(value * 100);

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Formata percentual 0–100 para numeric(6,2). */
const decPercentage = (v: number | undefined | null) =>
  v !== undefined && v !== null ? roundMoney(v).toFixed(2) : null;

const hasStoredPercentage = (value: string | null | undefined) =>
  value !== null && value !== undefined && value !== "";

const computeFinancialFromPercentage = (subTotal: number, percentage: number) =>
  roundMoney((subTotal * percentage) / 100);

const computePercentageFromFinancial = (subTotal: number, value: number) =>
  subTotal > 0 ? roundMoney((value / subTotal) * 100) : 0;

/** Diferença máxima entre % derivado e valor em R$ (arredondamento de centavos). */
const FINANCIAL_ROUNDING_TOLERANCE = 0.02;

const resolveAdjustmentFinancial = (
  subTotal: number,
  percentage: string | null,
  storedValue: string | null,
): { value: number; percentage: string | null } => {
  const stored = decNum(storedValue);
  if (hasStoredPercentage(percentage)) {
    const pct = decNum(percentage);
    const fromPct = computeFinancialFromPercentage(subTotal, pct);
    if (
      stored > 0 &&
      Math.abs(stored - fromPct) <= FINANCIAL_ROUNDING_TOLERANCE
    ) {
      return { value: stored, percentage: null };
    }
    return { value: fromPct, percentage };
  }

  return {
    value: stored,
    percentage: null,
  };
};

const resolveFinancialAdjustmentsByCategory = (
  sale: Pick<
    typeof sales.$inferSelect,
    | "percentageDiscountProduct"
    | "percentageDiscountService"
    | "percentageAcresceProduct"
    | "percentageAcresceService"
    | "valueDiscountFinancialProduct"
    | "valueDiscountFinancialService"
    | "valueAcresceFinancialProduct"
    | "valueAcresceFinancialService"
  >,
  valueProduct: number,
  valueService: number,
) => {
  const discountProduct = resolveAdjustmentFinancial(
    valueProduct,
    sale.percentageDiscountProduct,
    sale.valueDiscountFinancialProduct,
  );
  const discountService = resolveAdjustmentFinancial(
    valueService,
    sale.percentageDiscountService,
    sale.valueDiscountFinancialService,
  );
  const acresceProduct = resolveAdjustmentFinancial(
    valueProduct,
    sale.percentageAcresceProduct,
    sale.valueAcresceFinancialProduct,
  );
  const acresceService = resolveAdjustmentFinancial(
    valueService,
    sale.percentageAcresceService,
    sale.valueAcresceFinancialService,
  );

  return {
    valueDiscountFinancialProduct: discountProduct.value,
    percentageDiscountProduct: discountProduct.percentage,
    valueDiscountFinancialService: discountService.value,
    percentageDiscountService: discountService.percentage,
    valueAcresceFinancialProduct: acresceProduct.value,
    percentageAcresceProduct: acresceProduct.percentage,
    valueAcresceFinancialService: acresceService.value,
    percentageAcresceService: acresceService.percentage,
  };
};

type SaleFinancialAdjustmentInput = {
  percentageDiscountProduct?: number | null;
  valueDiscountFinancialProduct?: number;
  percentageDiscountService?: number | null;
  valueDiscountFinancialService?: number;
  percentageAcresceProduct?: number | null;
  valueAcresceFinancialProduct?: number;
  percentageAcresceService?: number | null;
  valueAcresceFinancialService?: number;
};

const buildSaleFinancialAdjustmentValues = (
  input: SaleFinancialAdjustmentInput,
): Partial<typeof sales.$inferInsert> => {
  const patch: Partial<typeof sales.$inferInsert> = {};
  const pairs = [
    {
      pct: "percentageDiscountProduct" as const,
      val: "valueDiscountFinancialProduct" as const,
    },
    {
      pct: "percentageDiscountService" as const,
      val: "valueDiscountFinancialService" as const,
    },
    {
      pct: "percentageAcresceProduct" as const,
      val: "valueAcresceFinancialProduct" as const,
    },
    {
      pct: "percentageAcresceService" as const,
      val: "valueAcresceFinancialService" as const,
    },
  ];

  for (const { pct, val } of pairs) {
    if (typeof input[pct] === "number") {
      patch[pct] = decPercentage(input[pct]);
    }
    if (input[pct] === null) {
      patch[pct] = null;
    }
    if (input[val] !== undefined) {
      patch[val] = dec(input[val]);
      if (typeof input[pct] !== "number") {
        patch[pct] = null;
      }
    }
  }

  return patch;
};

type SaleServiceFieldInput = {
  vehicleMileage?: number;
  observations?: string;
  defect?: string;
  serviceType?: "SERVICO" | "GARANTIA";
  modelService?: "VEICULO";
  type?: string;
};

const buildSaleServiceFieldValues = (
  input: SaleServiceFieldInput,
): Partial<typeof sales.$inferInsert> => {
  const patch: Partial<typeof sales.$inferInsert> = {};
  if (input.vehicleMileage !== undefined) {
    patch.vehicleMileage = input.vehicleMileage;
  }
  if (input.observations !== undefined) {
    patch.observations = input.observations.trim();
  }
  if (input.defect !== undefined) {
    patch.defect = input.defect.trim();
  }
  // serviceType e NOT NULL com default SERVICO; override so em ORDEM DE SERVICO.
  if (input.type === "ORDEM DE SERVICO" && input.serviceType !== undefined) {
    patch.serviceType = input.serviceType;
  }
  if (input.modelService !== undefined) {
    patch.modelService = input.modelService;
  } else if (input.type === "ORDEM DE SERVICO") {
    patch.modelService = "VEICULO";
  }
  return patch;
};

type SaleMemberSnapshot = {
  memberLegalName: string | null;
  memberAddress: string | null;
  memberCep: string | null;
  memberCity: string | null;
  memberState: string | null;
  registration: string | null;
  memberPhone: string | null;
  memberMobile: string | null;
};

const SALE_MEMBER_SNAPSHOT_KEYS = [
  "memberLegalName",
  "memberAddress",
  "memberCep",
  "memberCity",
  "memberState",
  "registration",
  "memberPhone",
  "memberMobile",
] as const satisfies readonly (keyof SaleMemberSnapshot)[];

const normalizeSaleMemberOverrides = (
  input?: SaleMemberOverrideInput,
): Partial<SaleMemberSnapshot> => {
  if (!input) {
    return {};
  }

  const result: Partial<SaleMemberSnapshot> = {};

  if (input.memberLegalName !== undefined) {
    result.memberLegalName = input.memberLegalName.trim();
  }
  if (input.memberAddress !== undefined) {
    result.memberAddress = input.memberAddress.trim();
  }
  if (input.memberCep !== undefined) {
    result.memberCep = input.memberCep.trim();
  }
  if (input.memberCity !== undefined) {
    result.memberCity = input.memberCity.trim();
  }
  if (input.memberState !== undefined) {
    result.memberState = input.memberState.trim();
  }
  if (input.registration !== undefined) {
    result.registration = input.registration.trim();
  }
  if (input.memberPhone !== undefined) {
    result.memberPhone = input.memberPhone.trim();
  }
  if (input.memberMobile !== undefined) {
    result.memberMobile = input.memberMobile.trim();
  }

  return result;
};

const mergeSaleMemberSnapshot = (
  base: SaleMemberSnapshot,
  overrides?: Partial<SaleMemberSnapshot>,
): SaleMemberSnapshot => {
  if (!overrides) {
    return { ...base };
  }

  const result = { ...base };
  for (const key of SALE_MEMBER_SNAPSHOT_KEYS) {
    if (overrides[key] !== undefined) {
      result[key] = overrides[key]!;
    }
  }
  return result;
};

const formatSaleMemberAddressLine = (street: string, number: string) => {
  const parts = [street.trim(), number.trim()].filter(
    (part) => part.length > 0,
  );
  return parts.join(", ");
};

const getPostgresConstraintName = (err: unknown): string | undefined => {
  let current: unknown = err;
  for (let depth = 0; depth < 4 && current != null; depth++) {
    if (
      typeof current === "object" &&
      "constraint_name" in current &&
      typeof (current as { constraint_name?: unknown }).constraint_name ===
        "string"
    ) {
      return (current as { constraint_name: string }).constraint_name;
    }
    if (
      typeof current === "object" &&
      "constraint" in current &&
      typeof (current as { constraint?: unknown }).constraint === "string"
    ) {
      return (current as { constraint: string }).constraint;
    }
    current =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause: unknown }).cause
        : undefined;
  }
  return undefined;
};

const mapSaleUniqueViolation = (err: unknown): ConflictError | null => {
  if (!isPostgresUniqueViolation(err)) return null;
  const constraint = getPostgresConstraintName(err);
  if (constraint === "sales_payments_sales_id_payment_type_id_unique") {
    return new ConflictError(
      "Tipo de pagamento duplicado na mesma venda",
      "SALE_PAYMENT_TYPE_DUPLICATE",
    );
  }
  if (constraint === "sales_dues_sales_payment_id_due_date_unique") {
    return new ConflictError(
      "Data de vencimento duplicada para o mesmo pagamento",
      "SALE_DUE_DATE_DUPLICATE",
    );
  }
  return new ConflictError(
    "Venda em conflito (numero do pedido)",
    "SALE_CONFLICT",
  );
};

/** Chave YYYY-MM-DD (UTC) para comparar vencimentos sem repetir o mesmo dia. */
const toUtcDateKey = (date: Date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type PriceSnapshot = {
  averageCost: string | null;
  actualRealCost: string | null;
  priceCost: string | null;
  priceSale: string | null;
  promotionalPriceId: string | null;
};

export type SaleAuthContext = {
  userId: string;
  memberId?: string;
};

const SELLER_INELIGIBLE_MEMBER_CLASSES = ["CLIENTE", "FORNECEDOR"] as const;

const saleWithMemberSelect = {
  id: sales.id,
  orderNumber: sales.orderNumber,
  userId: sales.userId,
  userLegalName: sales.userLegalName,
  sellerId: sales.sellerId,
  sellerLegalName: sales.sellerLegalName,
  memberId: sales.memberId,
  memberName: users.userName,
  type: sales.type,
  subTotal: sales.subTotal,
  discountValuetems: sales.discountValuetems,
  valueAcresceItems: sales.valueAcresceItems,
  percentageDiscountProduct: sales.percentageDiscountProduct,
  valueDiscountFinancialProduct: sales.valueDiscountFinancialProduct,
  percentageDiscountService: sales.percentageDiscountService,
  valueDiscountFinancialService: sales.valueDiscountFinancialService,
  percentageAcresceProduct: sales.percentageAcresceProduct,
  valueAcresceFinancialProduct: sales.valueAcresceFinancialProduct,
  percentageAcresceService: sales.percentageAcresceService,
  valueAcresceFinancialService: sales.valueAcresceFinancialService,
  valueProduct: sales.valueProduct,
  valueService: sales.valueService,
  valueLiquid: sales.valueLiquid,
  status: sales.status,
  returnSituation: sales.returnSituation,
  sourceBudgetSaleId: sales.sourceBudgetSaleId,
  sourceWorkOrderSaleId: sales.sourceWorkOrderSaleId,
  origin: sales.origin,
  completedionDate: sales.completedionDate,
  vehicleMileage: sales.vehicleMileage,
  observations: sales.observations,
  defect: sales.defect,
  serviceType: sales.serviceType,
  modelService: sales.modelService,
  userModificationServiceId: sales.userModificationServiceId,
  userClosedServiceId: sales.userClosedServiceId,
  vehiclesEnterprisesMembersId: sales.vehiclesEnterprisesMembersId,
  enterprisesId: sales.enterprisesId,
  createdAt: sales.createdAt,
  updatedAt: sales.updatedAt,
};

type SalePaymentTypeSummary = {
  id: string;
  description: string;
  paymentType: string;
  status: string;
};

type SalePaymentResponse = typeof salesPayments.$inferSelect & {
  paymentType: SalePaymentTypeSummary | null;
  dues: (typeof salesDues.$inferSelect)[];
};

export class SalesService {
  // Servico de vendas
  private async recordSaleUpdateAudit(
    enterpriseId: string,
    saleId: string,
    before: typeof sales.$inferSelect,
    ctx: EntityAuditContext,
  ) {
    const after = await this.getSaleRow(db, enterpriseId, saleId);
    await recordEntityAudit({
      entityType: EntityTypes.SALES,
      entityId: saleId,
      action: "UPDATE",
      before: toAuditRecord(before),
      after: toAuditRecord(after),
      ctx: { ...ctx, enterpriseId },
    });
  }

  private async assertTrabalhaOsEnabled(enterpriseId: string): Promise<void> {
    const parameters = await resolveEnterpriseParameters(enterpriseId);
    assertEnterpriseParameter({ parameters }, "trabalha_os");
  }

  private async assertSaleTypeAllowed(
    enterpriseId: string,
    saleType: string,
  ): Promise<void> {
    if (saleType === "ORDEM DE SERVICO") {
      await this.assertTrabalhaOsEnabled(enterpriseId);
    }
  }

  private scope(enterpriseId: string, id?: string) {
    // Scope para buscar vendas
    const base = [eq(sales.enterprisesId, enterpriseId)];
    if (id) base.push(eq(sales.id, id));
    return and(...base);
  }

  private listScope(enterpriseId: string, query?: ListSalesQuery) {
    const filters: SQL[] = [eq(sales.enterprisesId, enterpriseId)];
    if (query?.type) {
      filters.push(eq(sales.type, query.type));
    }
    if (query?.status) {
      filters.push(eq(sales.status, query.status));
    }
    if (query?.sellerId) {
      filters.push(
        or(
          eq(sales.sellerId, query.sellerId),
          eq(sales.userId, query.sellerId),
        )!,
      );
    }
    if (query?.orderNumber !== undefined) {
      filters.push(eq(sales.orderNumber, query.orderNumber));
    }
    if (query?.seller) {
      filters.push(ilike(sales.sellerLegalName, `%${query.seller}%`));
    }
    if (query?.client) {
      filters.push(
        or(
          ilike(users.userName, `%${query.client}%`),
          ilike(salesMembers.memberLegalName, `%${query.client}%`),
        )!,
      );
    }
    if (query?.memberId) {
      filters.push(eq(sales.memberId, query.memberId));
    }
    if (query?.vehiclesEnterprisesMembersId) {
      filters.push(
        eq(
          sales.vehiclesEnterprisesMembersId,
          query.vehiclesEnterprisesMembersId,
        ),
      );
    }
    if (query?.dateFrom && query?.dateTo) {
      // completedionDate quando houver; senão createdAt (orçamentos/vendas abertos).
      const timezone = "America/Sao_Paulo";
      const effective = effectiveCompletionDateSql(timezone);
      filters.push(
        and(
          gte(effective, sql`${query.dateFrom}::date`),
          lte(effective, sql`${query.dateTo}::date`),
        )!,
      );
    }
    return and(...filters);
  }

  private listFromWithMemberJoins() {
    return db
      .select(saleWithMemberSelect)
      .from(sales)
      .leftJoin(enterprisesMembers, eq(sales.memberId, enterprisesMembers.id))
      .leftJoin(users, eq(enterprisesMembers.userId, users.id))
      .leftJoin(salesMembers, eq(salesMembers.salesId, sales.id));
  }

  private listCountFromWithMemberJoins() {
    return db
      .select({ c: count() })
      .from(sales)
      .leftJoin(enterprisesMembers, eq(sales.memberId, enterprisesMembers.id))
      .leftJoin(users, eq(enterprisesMembers.userId, users.id))
      .leftJoin(salesMembers, eq(salesMembers.salesId, sales.id));
  }

  private mapSaleItemResponse(
    item: typeof salesItems.$inferSelect,
    product?: {
      productDescription: string;
      productCode: number | null;
    },
  ) {
    const quantity = decNum(item.quantity);
    const quantityConverted = decNum(item.quantityConverted);
    const customDescription = item.description?.trim() || null;
    return {
      ...item,
      description: customDescription,
      quantityConverted: item.quantityConverted,
      quantityRemaining: Math.max(0, quantity - quantityConverted),
      productDescription:
        customDescription ?? product?.productDescription ?? null,
      productCode: product?.productCode ?? null,
    };
  }

  private nullableById<T extends { id: string | null }>(
    row: T | null | undefined,
  ): (Omit<T, "id"> & { id: string }) | null {
    if (!row?.id) return null;
    return row as Omit<T, "id"> & { id: string };
  }

  private async loadSaleItems(saleId: string) {
    const rows = await db
      .select({
        item: salesItems,
        productsEnterprises: {
          id: productsEnterprises.id,
          code: productsEnterprises.code,
          description: productsEnterprises.description,
        },
        unit: {
          id: measurementUnits.id,
          unit: measurementUnits.unit,
          description: measurementUnits.description,
          compatible: measurementUnits.compatible,
          wholeFractional: measurementUnits.wholeFractional,
        },
        productType: {
          id: productTypes.id,
          type: productTypes.type,
          description: productTypes.description,
        },
        stockSector: {
          id: stockSectors.id,
          description: stockSectors.description,
        },
        stockLocation: {
          id: stockLocations.id,
          box: stockLocations.box,
          description: stockLocations.description,
          status: stockLocations.status,
        },
        stockBatch: {
          id: stockBatches.id,
          batchNumber: stockBatches.batchNumber,
          status: stockBatches.status,
          manufacturingDate: stockBatches.manufacturingDate,
          expiryDate: stockBatches.expiryDate,
          documentRef: stockBatches.documentRef,
        },
        promotionalPrice: {
          id: promotionalPrices.id,
          description: promotionalPrices.description,
          price: promotionalPrices.price,
          startDate: promotionalPrices.startDate,
          endDate: promotionalPrices.endDate,
        },
      })
      .from(salesItems)
      .innerJoin(
        productsEnterprises,
        eq(salesItems.productsEnterprisesId, productsEnterprises.id),
      )
      .innerJoin(measurementUnits, eq(salesItems.unitid, measurementUnits.id))
      .innerJoin(productTypes, eq(salesItems.productTypeId, productTypes.id))
      .leftJoin(stockSectors, eq(salesItems.stockSectorId, stockSectors.id))
      .leftJoin(
        stockLocations,
        eq(salesItems.stockLocationId, stockLocations.id),
      )
      .leftJoin(stockBatches, eq(salesItems.stockBatchId, stockBatches.id))
      .leftJoin(
        promotionalPrices,
        eq(salesItems.promotionalPriceId, promotionalPrices.id),
      )
      .where(eq(salesItems.salesId, saleId));

    const itemIds = rows.map(({ item }) => item.id);
    const mechanicsRows =
      itemIds.length > 0
        ? await db
            .select({
              id: mechanicSalesItems.id,
              mechanic: mechanicSalesItems.mechanic,
              salesItemsId: mechanicSalesItems.salesItemsId,
              comissionService: mechanicSalesItems.comissionService,
              createdAt: mechanicSalesItems.createdAt,
              updatedAt: mechanicSalesItems.updatedAt,
              member: {
                id: enterprisesMembers.id,
                code: enterprisesMembers.code,
                status: enterprisesMembers.status,
                class: enterprisesMembers.class,
                userName: users.userName,
              },
            })
            .from(mechanicSalesItems)
            .innerJoin(
              enterprisesMembers,
              eq(mechanicSalesItems.mechanic, enterprisesMembers.id),
            )
            .innerJoin(users, eq(enterprisesMembers.userId, users.id))
            .where(inArray(mechanicSalesItems.salesItemsId, itemIds))
            .orderBy(asc(mechanicSalesItems.id))
        : [];

    const mechanicsByItemId = new Map<
      string,
      {
        id: string;
        mechanic: string;
        salesItemsId: string;
        comissionService: string;
        createdAt: Date;
        updatedAt: Date | null;
        member: {
          id: string;
          code: number | null;
          status: string;
          class: string;
          userName: string;
        };
      }[]
    >();
    for (const row of mechanicsRows) {
      const list = mechanicsByItemId.get(row.salesItemsId) ?? [];
      list.push(row);
      mechanicsByItemId.set(row.salesItemsId, list);
    }

    return rows.map(
      ({
        item,
        productsEnterprises: pe,
        unit,
        productType,
        stockSector,
        stockLocation,
        stockBatch,
        promotionalPrice,
      }) => ({
        ...this.mapSaleItemResponse(item, {
          productDescription: pe.description,
          productCode: pe.code,
        }),
        user: { id: item.userId, userName: item.userLegalName },
        seller: { id: item.sellerId, userName: item.sellerLegalName },
        productsEnterprises: pe,
        unit,
        productType,
        stockSector: this.nullableById(stockSector),
        stockLocation: this.nullableById(stockLocation),
        stockBatch: this.nullableById(stockBatch),
        promotionalPrice: this.nullableById(promotionalPrice),
        mechanics: mechanicsByItemId.get(item.id) ?? [],
      }),
    );
  }

  private async loadSaleVehicleLink(
    enterpriseId: string,
    vehiclesEnterprisesMembersId: string | null,
  ) {
    if (!vehiclesEnterprisesMembersId) return null;
    const row = (
      await db
        .select({
          id: vehiclesEnterprisesMembers.id,
          status: vehiclesEnterprisesMembers.status,
          vehiclesId: vehiclesEnterprisesMembers.vehiclesId,
          enterprisesMembersId: vehiclesEnterprisesMembers.enterprisesMembersId,
          createdAt: vehiclesEnterprisesMembers.createdAt,
          updatedAt: vehiclesEnterprisesMembers.updatedAt,
          plate: vehicles.plate,
          model: vehicles.model,
          renavam: vehicles.renavam,
          color: vehicles.color,
          fuelType: vehicles.fuelType,
          vehicleYear: vehicles.vehicleYear,
          fleetNumber: vehicles.fleetNumber,
        })
        .from(vehiclesEnterprisesMembers)
        .innerJoin(
          enterprisesMembers,
          eq(
            vehiclesEnterprisesMembers.enterprisesMembersId,
            enterprisesMembers.id,
          ),
        )
        .innerJoin(
          vehicles,
          eq(vehiclesEnterprisesMembers.vehiclesId, vehicles.id),
        )
        .where(
          and(
            eq(vehiclesEnterprisesMembers.id, vehiclesEnterprisesMembersId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
          ),
        )
        .limit(1)
    )[0];
    return row ?? null;
  }

  private async loadUsersByIds(userIds: Array<string | null | undefined>) {
    const ids = [...new Set(userIds.filter((id): id is string => !!id))];
    if (ids.length === 0)
      return new Map<string, { id: string; userName: string }>();

    const rows = await db
      .select({
        id: users.id,
        userName: users.userName,
      })
      .from(users)
      .where(inArray(users.id, ids));

    return new Map(rows.map((row) => [row.id, row]));
  }

  private async loadPaymentTypesByIds(paymentTypeIds: string[]) {
    if (paymentTypeIds.length === 0) {
      return new Map<string, SalePaymentTypeSummary>();
    }

    const rows = await db
      .select({
        id: paymentTypes.id,
        description: paymentTypes.description,
        paymentType: paymentTypes.paymentType,
        status: paymentTypes.status,
      })
      .from(paymentTypes)
      .where(inArray(paymentTypes.id, paymentTypeIds));

    return new Map(rows.map((row) => [row.id, row]));
  }

  private async loadSalePaymentsBySaleIds(saleIds: string[]) {
    const paymentsBySaleId = new Map<string, SalePaymentResponse[]>();
    for (const saleId of saleIds) {
      paymentsBySaleId.set(saleId, []);
    }
    if (saleIds.length === 0) return paymentsBySaleId;

    const payments = await db
      .select()
      .from(salesPayments)
      .where(inArray(salesPayments.salesId, saleIds))
      .orderBy(asc(salesPayments.createdAt), asc(salesPayments.id));

    const paymentIds = payments.map((payment) => payment.id);
    const [allDues, paymentTypesById] = await Promise.all([
      paymentIds.length > 0
        ? db
            .select()
            .from(salesDues)
            .where(inArray(salesDues.salesPaymentId, paymentIds))
            .orderBy(asc(salesDues.dueDate), asc(salesDues.id))
        : Promise.resolve([]),
      this.loadPaymentTypesByIds(
        payments.map((payment) => payment.paymentTypeId),
      ),
    ]);

    const duesByPaymentId = new Map<
      string,
      (typeof salesDues.$inferSelect)[]
    >();
    for (const due of allDues) {
      const dues = duesByPaymentId.get(due.salesPaymentId) ?? [];
      dues.push(due);
      duesByPaymentId.set(due.salesPaymentId, dues);
    }

    for (const payment of payments) {
      const mapped: SalePaymentResponse = {
        ...payment,
        paymentType: paymentTypesById.get(payment.paymentTypeId) ?? null,
        dues: duesByPaymentId.get(payment.id) ?? [],
      };
      const list = paymentsBySaleId.get(payment.salesId) ?? [];
      list.push(mapped);
      paymentsBySaleId.set(payment.salesId, list);
    }

    return paymentsBySaleId;
  }

  private async assertMechanicMember(
    tx: Tx | typeof db,
    enterpriseId: string,
    enterprisesMembersId: string,
    path: string,
  ) {
    const row = (
      await tx
        .select({ id: enterprisesMembers.id })
        .from(enterprisesMembers)
        .where(
          and(
            eq(enterprisesMembers.id, enterprisesMembersId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            eq(enterprisesMembers.status, "ATIVO"),
            isNull(enterprisesMembers.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new ValidationError(
        [
          {
            path,
            message: "Mecanico nao encontrado na empresa",
          },
        ],
        "Mecanico invalido",
      );
    }
  }

  private async insertItemMechanics(
    tx: Tx,
    enterpriseId: string,
    saleType: string,
    salesItemsId: string,
    mechanics: NonNullable<CreateSaleItemInput["mechanics"]> | undefined,
    pathPrefix: string,
  ) {
    if (!mechanics?.length) return;

    if (saleType !== "ORDEM DE SERVICO") {
      throw new ValidationError(
        [
          {
            path: pathPrefix,
            message:
              "mechanics so pode ser informado em ORDEM DE SERVICO; omita o campo",
          },
        ],
        "Campo invalido",
      );
    }

    for (let i = 0; i < mechanics.length; i++) {
      const mechanic = mechanics[i];
      await this.assertMechanicMember(
        tx,
        enterpriseId,
        mechanic.mechanic,
        `${pathPrefix}.${i}.mechanic`,
      );
      try {
        await tx.insert(mechanicSalesItems).values({
          mechanic: mechanic.mechanic,
          salesItemsId,
          ...(mechanic.comissionService !== undefined
            ? { comissionService: mechanic.comissionService.toString() }
            : {}),
        });
      } catch (err) {
        if (isPostgresUniqueViolation(err)) {
          throw new ConflictError(
            "Ja existe comissao para este mecanico e item de venda",
            "MECHANIC_SALE_ITEM_COMMISSION_CONFLICT",
          );
        }
        throw err;
      }
    }
  }

  private computeBudgetStatus(
    items: Pick<
      typeof salesItems.$inferSelect,
      "quantity" | "quantityConverted"
    >[],
  ): BudgetStatus {
    if (items.length === 0) return "ABERTA";

    let anyConverted = false;
    let allFullyConverted = true;

    for (const item of items) {
      const qty = decNum(item.quantity);
      const converted = decNum(item.quantityConverted);
      if (converted > 0) anyConverted = true;
      if (converted + 1e-9 < qty) allFullyConverted = false;
    }

    if (allFullyConverted) return "FINALIZADA";
    if (anyConverted) return "PARCIAL";
    return "ABERTA";
  }

  private async insertSaleConversionAudit(
    tx: Tx,
    input: {
      enterprisesId: string;
      typeConversion: SaleConversionType;
      budgetSaleId?: string | null;
      workOrderSaleId?: string | null;
      generatedSaleId: string;
      closureKind: SaleConversionClosureKind;
      userId: string;
      userLegalName: string;
      items: { saleItemId: string; quantity: string }[];
      unclosedItems: {
        saleItemId: string;
        quantityNotConverted: number;
        justification: string;
      }[];
    },
  ) {
    const [conversion] = await tx
      .insert(saleConversions)
      .values({
        enterprisesId: input.enterprisesId,
        typeConversion: input.typeConversion,
        budgetSaleId: input.budgetSaleId ?? null,
        workOrderSaleId: input.workOrderSaleId ?? null,
        generatedSaleId: input.generatedSaleId,
        closureKind: input.closureKind,
        userId: input.userId,
        userLegalName: input.userLegalName,
      })
      .returning({ id: saleConversions.id });
    if (!conversion) throw new Error("Falha ao registrar conversao");

    if (input.items.length > 0) {
      await tx.insert(saleConversionItems).values(
        input.items.map((row) => ({
          saleConversionId: conversion.id,
          saleItemId: row.saleItemId,
          quantity: row.quantity,
        })),
      );
    }

    if (input.unclosedItems.length > 0) {
      await tx.insert(saleUnclosedItems).values(
        input.unclosedItems.map((row) => ({
          saleConversionId: conversion.id,
          saleItemId: row.saleItemId,
          quantityNotConverted: row.quantityNotConverted.toString(),
          justification: row.justification,
          userId: input.userId,
          userLegalName: input.userLegalName,
        })),
      );
    }
  }

  private assertBudgetOpenForConversion(budget: typeof sales.$inferSelect) {
    // Verifica se o orcamento esta aberto para conversao
    if (budget.type !== "ORCAMENTO") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Somente orcamentos podem ser convertidos",
          },
        ],
        "Tipo invalido",
      );
    }
    if (budget.status === "CANCELADA") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Orcamento cancelado nao pode ser convertido",
          },
        ],
        "Orcamento cancelado",
      );
    }
    if (budget.status === "FINALIZADA") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Orcamento ja foi totalmente convertido em vendas",
          },
        ],
        "Orcamento fechado",
      );
    }
  }

  /** VENDA e ORDEM DE SERVICO compartilham sequência e movimentam estoque de peças. */
  private movesInventory(saleType: string): boolean {
    return saleType === "VENDA" || saleType === "ORDEM DE SERVICO";
  }

  /**
   * Venda gerada a partir de OS já teve baixa na OS; não movimenta estoque de novo.
   */
  private shouldMoveStock(sale: {
    type: string;
    sourceWorkOrderSaleId?: string | null;
  }): boolean {
    if (sale.sourceWorkOrderSaleId) return false;
    return this.movesInventory(sale.type);
  }

  private async documentHasServiceItem(
    items: Pick<typeof salesItems.$inferSelect, "productTypeId">[],
  ): Promise<boolean> {
    for (const item of items) {
      const typeCode = await getProductTypeCode(item.productTypeId);
      if (typeCode && isServiceProductType(typeCode)) return true;
    }
    return false;
  }

  private async assertVendaDoesNotAcceptService(
    saleType: string,
    productTypeId: string,
    path: string,
    options?: { allowService?: boolean },
  ) {
    if (options?.allowService) return;
    if (saleType !== "VENDA") return;
    const typeCode = await getProductTypeCode(productTypeId);
    if (typeCode && isServiceProductType(typeCode)) {
      throw new ValidationError(
        [
          {
            path,
            message:
              "Venda nao aceita produto do tipo servico (09). Use type ORDEM DE SERVICO.",
          },
        ],
        "Produto servico nao permitido em venda",
      );
    }
  }

  /** Descrição livre do item só é permitida em produto tipo serviço (09). */
  private async assertServiceItemDescription(
    productTypeId: string,
    description: string | null | undefined,
    path: string,
  ) {
    if (description === undefined || description === null) return;
    const typeCode = await getProductTypeCode(productTypeId);
    if (!typeCode || !isServiceProductType(typeCode)) {
      throw new ValidationError(
        [
          {
            path,
            message: "Descricao livre so e permitida em item de servico",
          },
        ],
        "Descricao invalida",
      );
    }
  }

  /** typeService (PROPRIO/OUTROS) só é permitido em produto tipo serviço (09). */
  private async assertServiceItemTypeService(
    productTypeId: string,
    typeService: "PROPRIO" | "OUTROS" | undefined,
    path: string,
  ) {
    if (typeService === undefined) return;
    const typeCode = await getProductTypeCode(productTypeId);
    if (!typeCode || !isServiceProductType(typeCode)) {
      throw new ValidationError(
        [
          {
            path,
            message:
              "typeService (PROPRIO/OUTROS) so e permitido em item de servico",
          },
        ],
        "Tipo de servico invalido",
      );
    }
  }

  private assertBudgetEditableForItems(budget: typeof sales.$inferSelect) {
    // Verifica se o orcamento/OS esta aberto para alterar itens
    this.assertSaleOpenForItems(budget);
    if (
      (budget.type === "ORCAMENTO" || budget.type === "ORDEM DE SERVICO") &&
      budget.status === "FINALIZADA"
    ) {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message:
              budget.type === "ORCAMENTO"
                ? "Orcamento fechado nao permite alterar itens"
                : "Ordem de servico fechada nao permite alterar itens",
          },
        ],
        "Documento fechado",
      );
    }
  }

  private assertBudgetItemEditable(
    // Verifica se o item do orcamento/OS esta aberto para alterar
    budget: typeof sales.$inferSelect,
    item: typeof salesItems.$inferSelect,
    nextQuantity?: number,
  ) {
    if (budget.type !== "ORCAMENTO" && budget.type !== "ORDEM DE SERVICO") {
      return;
    }

    const converted = decNum(item.quantityConverted);
    if (converted > 0 && nextQuantity === undefined) {
      throw new ValidationError(
        [
          {
            path: "params.saleItemId",
            message: "Item com quantidade convertida nao pode ser removido",
          },
        ],
        "Item convertido",
      );
    }

    if (nextQuantity !== undefined && nextQuantity < converted) {
      throw new ValidationError(
        [
          {
            path: "body.quantity",
            message: `Quantidade nao pode ser menor que ${converted} (ja convertida)`,
          },
        ],
        "Quantidade invalida",
      );
    }
  }

  private assertOsOpenForConversion(workOrder: typeof sales.$inferSelect) {
    if (workOrder.type !== "ORDEM DE SERVICO") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Somente ordens de servico podem ser convertidas em venda",
          },
        ],
        "Tipo invalido",
      );
    }
    if (workOrder.status === "CANCELADA") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Ordem de servico cancelada nao pode ser convertida",
          },
        ],
        "Ordem de servico cancelada",
      );
    }
    if (workOrder.status === "FINALIZADA") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Ordem de servico ja foi totalmente convertida em venda",
          },
        ],
        "Ordem de servico fechada",
      );
    }
  }

  private prorateItemFinancials(
    budgetItem: typeof salesItems.$inferSelect,
    convertQuantity: number,
    itemPath: string,
  ): CreateSaleItemInput {
    const budgetQty = decNum(budgetItem.quantity);
    const ratio = convertQuantity / budgetQty;
    const valueUnit = decNum(budgetItem.valueUnit);
    const valueDiscount = roundMoney(decNum(budgetItem.valueDiscount) * ratio);
    const valueAcresce = roundMoney(decNum(budgetItem.valueAcresce) * ratio);
    const valueTotal = computeItemValueTotal(
      convertQuantity,
      valueUnit,
      valueDiscount,
      valueAcresce,
    );

    return {
      quantity: convertQuantity,
      valueUnit,
      valueDiscount,
      valueAcresce,
      valueTotal,
      productsEnterprisesId: budgetItem.productsEnterprisesId,
      unitId: budgetItem.unitid,
      productTypeId: budgetItem.productTypeId,
      stockSectorId: budgetItem.stockSectorId ?? undefined,
      stockLocationId: budgetItem.stockLocationId ?? undefined,
      stockBatchId: budgetItem.stockBatchId ?? undefined,
      description: budgetItem.description ?? undefined,
      typeService: budgetItem.typeService ?? undefined,
    } satisfies CreateSaleItemInput;
  }

  private async resolveConversionItemInput(
    tx: Tx,
    enterpriseId: string,
    budgetItem: typeof salesItems.$inferSelect,
    convertQuantity: number,
    itemPath: string,
    line?: ConversionStockLine,
  ): Promise<CreateSaleItemInput> {
    const base = this.prorateItemFinancials(
      budgetItem,
      convertQuantity,
      itemPath,
    );

    const typeCode = await getProductTypeCode(budgetItem.productTypeId);
    if (typeCode && isServiceProductType(typeCode)) {
      return base;
    }

    let stockSectorId =
      line?.stockSectorId ?? budgetItem.stockSectorId ?? undefined;
    let stockLocationId =
      line?.stockLocationId ?? budgetItem.stockLocationId ?? undefined;
    let stockBatchId =
      line?.stockBatchId !== undefined
        ? (line.stockBatchId ?? undefined)
        : (budgetItem.stockBatchId ?? undefined);

    if (!stockSectorId || !stockLocationId) {
      const defaults = await resolveDefaultSaleItemStockRefs(
        enterpriseId,
        budgetItem.productsEnterprisesId,
        tx,
        itemPath,
      );
      stockSectorId = stockSectorId ?? defaults.stockSectorId;
      stockLocationId = stockLocationId ?? defaults.stockLocationId;
      if (stockBatchId === undefined) {
        stockBatchId = defaults.stockBatchId ?? undefined;
      }
    }

    return {
      ...base,
      stockSectorId,
      stockLocationId,
      stockBatchId,
    };
  }

  private async getSaleRow(
    // Obtem a venda pelo id
    tx: Tx | typeof db,
    enterpriseId: string,
    saleId: string,
  ) {
    // Obtem a venda pelo id
    const row = (
      await tx
        .select()
        .from(sales)
        .where(this.scope(enterpriseId, saleId))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Venda nao encontrada", "SALE_NOT_FOUND");
    }
    return row;
  }

  private assertSaleOpenForItems(sale: { status: string }) {
    // Verifica se a venda esta aberta para adicionar itens
    if (sale.status !== "ABERTA") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Somente vendas ABERTAS permitem alterar itens",
          },
        ],
        "Venda nao editavel",
      );
    }
  }

  private assertSalePaymentsMatchSale(
    // Verifica se o valor liquido da venda corresponde a soma dos pagamentos
    valueLiquid: string | number | null,
    saleCreatedAt: Date,
    payments: SalePaymentInput[],
  ) {
    const issues: { path: string; message: string }[] = [];

    if (valueLiquid === null || valueLiquid === "") {
      issues.push({
        path: "body.valueLiquid",
        message:
          "Valor liquido da venda e obrigatorio para fechar com pagamentos",
      });
    }

    const liquidCents = moneyCents(
      typeof valueLiquid === "number" ? valueLiquid : decNum(valueLiquid),
    );
    const saleDayKey = toUtcDateKey(saleCreatedAt);

    const paymentTypeIds = new Set<string>();
    let paymentsSumCents = 0;

    for (let pIdx = 0; pIdx < payments.length; pIdx++) {
      const payment = payments[pIdx];
      const paymentPath = `body.payments.${pIdx}`;

      if (paymentTypeIds.has(payment.paymentTypeId)) {
        issues.push({
          path: `${paymentPath}.paymentTypeId`,
          message: "Tipo de pagamento duplicado na mesma venda",
        });
      }
      paymentTypeIds.add(payment.paymentTypeId);

      paymentsSumCents += moneyCents(payment.valueTotal);

      let duesSumCents = 0;
      const dueDateKeys = new Set<string>();

      for (let dIdx = 0; dIdx < payment.dues.length; dIdx++) {
        const due = payment.dues[dIdx];
        const duePath = `${paymentPath}.dues.${dIdx}`;

        duesSumCents += moneyCents(due.valueInstallment);

        const dueDayKey = toUtcDateKey(due.dueDate);
        if (dueDateKeys.has(dueDayKey)) {
          issues.push({
            path: `${duePath}.dueDate`,
            message: "Data de vencimento duplicada para o mesmo pagamento",
          });
        }
        dueDateKeys.add(dueDayKey);

        if (dueDayKey < saleDayKey) {
          issues.push({
            path: `${duePath}.dueDate`,
            message:
              "Data de vencimento nao pode ser anterior a data de criacao da venda",
          });
        }
      }

      if (duesSumCents !== moneyCents(payment.valueTotal)) {
        issues.push({
          path: `${paymentPath}.dues`,
          message:
            "Soma das parcelas deve ser igual ao valor total do pagamento",
        });
      }
    }

    if (paymentsSumCents !== liquidCents) {
      issues.push({
        path: "body.payments",
        message: "Soma dos pagamentos deve ser igual ao valor liquido da venda",
      });
    }

    if (issues.length > 0) {
      throw new ValidationError(issues, "Pagamentos invalidos");
    }
  }

  private async insertSalePayments(
    // Insere os pagamentos na venda
    tx: Tx,
    saleId: string,
    payments: SalePaymentInput[],
  ) {
    for (const payment of payments) {
      const [pay] = await tx
        .insert(salesPayments)
        .values({
          valueTotal: payment.valueTotal.toString(),
          paymentTypeId: payment.paymentTypeId,
          salesId: saleId,
        })
        .returning();
      if (!pay) continue;
      await tx.insert(salesDues).values(
        payment.dues.map((due) => ({
          salesId: saleId,
          salesPaymentId: pay.id,
          valueInstallment: due.valueInstallment.toString(),
          dueDate: due.dueDate,
        })),
      );
    }
  }

  private async hasAPrazoPayment(
    tx: Tx | typeof db,
    payments: SalePaymentInput[],
  ): Promise<boolean> {
    if (payments.length === 0) return false;
    const paymentTypeIds = payments.map((payment) => payment.paymentTypeId);
    const rows = await tx
      .select({ paymentType: paymentTypes.paymentType })
      .from(paymentTypes)
      .where(inArray(paymentTypes.id, paymentTypeIds));
    return rows.some((row) => row.paymentType === "A_PRAZO");
  }

  private async assertMemberActiveForCreditSale(
    tx: Tx | typeof db,
    enterpriseId: string,
    memberId: string,
  ) {
    const row = (
      await tx
        .select({ status: enterprisesMembers.status })
        .from(enterprisesMembers)
        .where(
          and(
            eq(enterprisesMembers.id, memberId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            isNull(enterprisesMembers.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    if (
      !row ||
      !(CREDIT_SALE_ALLOWED_MEMBER_STATUSES as readonly string[]).includes(
        row.status,
      )
    ) {
      throw new ValidationError(
        [
          {
            path: "body.memberId",
            message:
              "Cliente deve estar ATIVO, ESPECIAL ou FUNCIONARIO para venda a prazo",
          },
        ],
        "Cliente inelegivel para venda a prazo",
      );
    }
  }

  private async applyMemberPostSalesStatusAfterCreditSale(
    tx: Tx,
    enterpriseId: string,
    memberId: string,
    payments: SalePaymentInput[],
  ) {
    if (!(await this.hasAPrazoPayment(tx, payments))) return;

    const member = (
      await tx
        .select({
          postSalesStatus: enterprisesMembers.postSalesStatus,
        })
        .from(enterprisesMembers)
        .where(
          and(
            eq(enterprisesMembers.id, memberId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            isNull(enterprisesMembers.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    if (!member) return;

    if (
      !(POST_SALES_STATUS_TO_APPLY as readonly string[]).includes(
        member.postSalesStatus,
      )
    ) {
      return;
    }

    await tx
      .update(enterprisesMembers)
      .set({
        status: member.postSalesStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(enterprisesMembers.id, memberId),
          eq(enterprisesMembers.enterpriseId, enterpriseId),
          isNull(enterprisesMembers.deletedAt),
        ),
      );
  }

  private async handleCreditSaleMemberStatusOnFinalize(
    tx: Tx,
    enterpriseId: string,
    memberId: string,
    payments: SalePaymentInput[],
  ) {
    if (!(await this.hasAPrazoPayment(tx, payments))) return;
    await this.assertMemberActiveForCreditSale(tx, enterpriseId, memberId);
    await this.applyMemberPostSalesStatusAfterCreditSale(
      tx,
      enterpriseId,
      memberId,
      payments,
    );
  }

  private async assertSaleHasNoPayments(tx: Tx, saleId: string) {
    // Verifica se a venda nao possui pagamentos cadastrados
    const existing = (
      await tx
        .select({ id: salesPayments.id })
        .from(salesPayments)
        .where(eq(salesPayments.salesId, saleId))
        .limit(1)
    )[0];
    if (existing) {
      throw new ValidationError(
        [
          {
            path: "body.payments",
            message: "Venda ja possui pagamentos cadastrados",
          },
        ],
        "Pagamentos ja informados",
      );
    }
  }

  private async resolveSaleItemPricing(
    tx: Tx | typeof db,
    item: CreateSaleItemInput,
    at: Date = new Date(),
  ): Promise<{
    item: CreateSaleItemInput;
    priceSnapshot: PriceSnapshot | null;
  }> {
    const effective = await resolveEffectiveSalePrice(
      item.productsEnterprisesId,
      at,
      tx,
    );

    const promotionalPrice =
      effective.isPromotional && effective.effectivePrice !== null
        ? effective.effectivePrice
        : null;

    const { valueUnit, appliedPromotional } = applyPromotionalUnitPrice({
      valueUnit: item.valueUnit,
      tablePrice: effective.tablePrice,
      promotionalPrice,
    });

    const pricedItem: CreateSaleItemInput = {
      ...item,
      valueUnit,
      valueTotal: computeItemValueTotal(
        item.quantity,
        valueUnit,
        item.valueDiscount,
        item.valueAcresce,
      ),
    };

    const hasAnyPrice =
      effective.tablePrice !== null ||
      effective.isPromotional ||
      effective.averageCost !== null ||
      effective.actualRealCost !== null ||
      effective.priceCost !== null;

    const priceSnapshot: PriceSnapshot | null = hasAnyPrice
      ? {
          averageCost: effective.averageCost,
          actualRealCost: effective.actualRealCost,
          priceCost: effective.priceCost,
          priceSale: effective.priceSale,
          promotionalPriceId: appliedPromotional
            ? effective.promotionalPriceId
            : null,
        }
      : null;

    return { item: pricedItem, priceSnapshot };
  }

  private priceSnapshotFromBudgetItem(
    budgetItem: typeof salesItems.$inferSelect,
  ): PriceSnapshot {
    return {
      averageCost: budgetItem.averageCost,
      actualRealCost: budgetItem.actualRealCost,
      priceCost: budgetItem.priceCost,
      priceSale: budgetItem.priceSale,
      promotionalPriceId: budgetItem.promotionalPriceId,
    };
  }

  private mapItemInputToInsert(
    saleId: string,
    item: CreateSaleItemInput,
    actor: {
      userId: string;
      userLegalName: string;
      sellerId: string;
      sellerLegalName: string;
    },
    origin: SaleOrigin,
    priceSnapshot?: PriceSnapshot | null,
  ) {
    const valueTotal = computeItemValueTotal(
      item.quantity,
      item.valueUnit,
      item.valueDiscount,
      item.valueAcresce,
    );
    return {
      quantity: item.quantity.toString(),
      valueUnit: item.valueUnit.toString(),
      valueDiscount: item.valueDiscount.toString(),
      valueAcresce: item.valueAcresce.toString(),
      valueTotal: valueTotal.toString(),
      valueLiquidItemsHeader: "0",
      averageCost: priceSnapshot?.averageCost ?? null,
      actualRealCost: priceSnapshot?.actualRealCost ?? null,
      priceCost: priceSnapshot?.priceCost ?? null,
      priceSale: priceSnapshot?.priceSale ?? null,
      promotionalPriceId: priceSnapshot?.promotionalPriceId ?? null,
      salesId: saleId,
      productsEnterprisesId: item.productsEnterprisesId,
      unitid: item.unitId,
      productTypeId: item.productTypeId,
      stockSectorId: item.stockSectorId ?? null,
      stockLocationId: item.stockLocationId ?? null,
      stockBatchId: item.stockBatchId ?? null,
      userId: actor.userId,
      userLegalName: actor.userLegalName,
      sellerId: actor.sellerId,
      sellerLegalName: actor.sellerLegalName,
      PercentageComissionSeller: "0.00",
      PercentageComissionManager: "0.00",
      origin,
      description: item.description ?? null,
      // Só faz sentido em serviço; peca/produto fica no default do banco.
      ...(item.typeService !== undefined
        ? { typeService: item.typeService }
        : {}),
    };
  }

  private async loadSellerMember(
    tx: Tx | typeof db,
    enterpriseId: string,
    sellerUserId: string,
  ) {
    const row = (
      await tx
        .select({
          id: enterprisesMembers.id,
          saleLimit: enterprisesMembers.saleLimit,
          exceedDiscountSale: enterprisesMembers.exceedDiscountSale,
          comissionOnSight: enterprisesMembers.comissionOnSight,
          comissionToTerms: enterprisesMembers.comissionToTerms,
          comissionPartial: enterprisesMembers.comissionPartial,
        })
        .from(enterprisesMembers)
        .where(
          and(
            eq(enterprisesMembers.userId, sellerUserId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            eq(enterprisesMembers.status, "ATIVO"),
            isNull(enterprisesMembers.deletedAt),
            notInArray(enterprisesMembers.class, [
              ...SELLER_INELIGIBLE_MEMBER_CLASSES,
            ]),
          ),
        )
        .limit(1)
    )[0];

    if (!row) {
      throw new ValidationError(
        [
          {
            path: "body.sellerId",
            message:
              "Vendedor deve ser membro ativo da empresa (nao cliente ou fornecedor)",
          },
        ],
        "Vendedor invalido",
      );
    }

    return row;
  }

  private assertSaleDiscountWithinMemberLimit(
    member: { saleLimit: string; exceedDiscountSale: boolean },
    totals: {
      subTotal: number;
      discountValuetems: number;
      valueDiscountFinancialProduct: number;
      valueDiscountFinancialService: number;
    },
    path = "body",
  ) {
    if (member.exceedDiscountSale) return;
    if (totals.subTotal <= 0) return;

    const totalDiscount = roundMoney(
      totals.discountValuetems +
        totals.valueDiscountFinancialProduct +
        totals.valueDiscountFinancialService,
    );
    const effectivePct = computePercentageFromFinancial(
      totals.subTotal,
      totalDiscount,
    );
    const limit = decNum(member.saleLimit);

    if (effectivePct > limit) {
      throw new ValidationError(
        [
          {
            path,
            message: `Desconto total (itens + financeiro) de ${effectivePct}% excede o limite do vendedor (${limit}%)`,
          },
        ],
        "Desconto excede limite do membro",
      );
    }
  }

  private async assertSaleDiscountWithinMemberLimitForSeller(
    tx: Tx | typeof db,
    enterpriseId: string,
    sellerUserId: string,
    totals: {
      subTotal: number;
      discountValuetems: number;
      valueDiscountFinancialProduct: number;
      valueDiscountFinancialService: number;
    },
    path = "body",
  ) {
    const member = await this.loadSellerMember(tx, enterpriseId, sellerUserId);
    this.assertSaleDiscountWithinMemberLimit(member, totals, path);
  }

  private assertItemLineDiscountWithinMemberLimit(
    member: { saleLimit: string; exceedDiscountSale: boolean },
    item: { quantity: number; valueUnit: number; valueDiscount: number },
    path = "body.valueDiscount",
  ) {
    if (member.exceedDiscountSale) return;

    const lineSubTotal = roundMoney(item.quantity * item.valueUnit);
    if (lineSubTotal <= 0) return;

    const linePct = computePercentageFromFinancial(
      lineSubTotal,
      item.valueDiscount,
    );
    const limit = decNum(member.saleLimit);

    if (linePct > limit) {
      throw new ValidationError(
        [
          {
            path,
            message: `Desconto do item (${linePct}%) excede o limite do vendedor (${limit}%)`,
          },
        ],
        "Desconto excede limite do membro",
      );
    }
  }

  private async assertItemLineDiscountWithinMemberLimitForSeller(
    tx: Tx | typeof db,
    enterpriseId: string,
    sellerUserId: string,
    item: { quantity: number; valueUnit: number; valueDiscount: number },
    path = "body.valueDiscount",
  ) {
    const member = await this.loadSellerMember(tx, enterpriseId, sellerUserId);
    this.assertItemLineDiscountWithinMemberLimit(member, item, path);
  }

  private resolveMemberCommissionRate(
    member: {
      comissionOnSight: string;
      comissionToTerms: string;
      comissionPartial: string;
    },
    paymentKinds: Array<(typeof paymentTypes.$inferSelect)["paymentType"]>,
  ): string {
    const uniqueKinds = new Set(paymentKinds);

    if (uniqueKinds.size === 1 && uniqueKinds.has("A_VISTA")) {
      return member.comissionOnSight;
    }
    if (uniqueKinds.size === 1 && uniqueKinds.has("A_PRAZO")) {
      return member.comissionToTerms;
    }

    return member.comissionPartial;
  }

  private async applySaleItemsCommission(tx: Tx, saleId: string, rate: string) {
    await tx
      .update(salesItems)
      .set({
        PercentageComissionSeller: rate,
        PercentageComissionManager: "0.00",
        updatedAt: new Date(),
      })
      .where(eq(salesItems.salesId, saleId));
  }

  private async recalculateSaleItemsCommission(
    tx: Tx,
    saleId: string,
    sellerUserId: string,
    enterpriseId: string,
    payments: SalePaymentInput[],
  ) {
    const member = await this.loadSellerMember(tx, enterpriseId, sellerUserId);
    const paymentTypeIds = payments.map((payment) => payment.paymentTypeId);
    const rows = await tx
      .select({ paymentType: paymentTypes.paymentType })
      .from(paymentTypes)
      .where(inArray(paymentTypes.id, paymentTypeIds));

    const rate = this.resolveMemberCommissionRate(
      member,
      rows.map((row) => row.paymentType),
    );
    await this.applySaleItemsCommission(tx, saleId, rate);
  }

  private resolveItemLaunchOrigin(
    itemOrigin: SaleOrigin | undefined,
    gescomClient?: string | string[],
  ): SaleOrigin {
    return resolveSaleClosingOrigin(itemOrigin, gescomClient);
  }

  private computeValueLiquid(
    valueProduct: number,
    valueService: number,
    sale: Pick<
      typeof sales.$inferSelect,
      | "valueDiscountFinancialProduct"
      | "valueDiscountFinancialService"
      | "valueAcresceFinancialProduct"
      | "valueAcresceFinancialService"
    >,
  ) {
    return roundMoney(
      Math.max(
        0,
        valueProduct +
          valueService -
          decNum(sale.valueDiscountFinancialProduct) -
          decNum(sale.valueDiscountFinancialService) +
          decNum(sale.valueAcresceFinancialProduct) +
          decNum(sale.valueAcresceFinancialService),
      ),
    );
  }

  private async recalculateSaleTotalsFromItems(
    // Recalcula os totais da venda a partir dos itens
    tx: Tx,
    enterpriseId: string,
    saleId: string,
    sale: typeof sales.$inferSelect,
  ) {
    const itemRows = await tx
      .select({
        quantity: salesItems.quantity,
        valueUnit: salesItems.valueUnit,
        valueDiscount: salesItems.valueDiscount,
        valueAcresce: salesItems.valueAcresce,
        productTypeId: salesItems.productTypeId,
        typeCode: productTypes.type,
      })
      .from(salesItems)
      .innerJoin(productTypes, eq(salesItems.productTypeId, productTypes.id))
      .where(eq(salesItems.salesId, saleId));

    const subTotal = itemRows.reduce(
      (sum, row) => sum + Number(row.quantity) * Number(row.valueUnit),
      0,
    );
    const discountValuetems = itemRows.reduce(
      (sum, row) => sum + Number(row.valueDiscount),
      0,
    );
    const valueAcresceItems = itemRows.reduce(
      (sum, row) => sum + Number(row.valueAcresce),
      0,
    );

    let valueProduct = 0;
    let valueService = 0;
    for (const row of itemRows) {
      const net = computeItemValueTotal(
        Number(row.quantity),
        Number(row.valueUnit),
        Number(row.valueDiscount),
        Number(row.valueAcresce),
      );
      if (row.typeCode === PRODUCT_TYPE_SERVICE_CODE) {
        valueService += net;
      } else {
        valueProduct += net;
      }
    }
    valueProduct = roundMoney(valueProduct);
    valueService = roundMoney(valueService);

    const financial = resolveFinancialAdjustmentsByCategory(
      sale,
      valueProduct,
      valueService,
    );

    const saleWithAggregates = {
      ...sale,
      discountValuetems: discountValuetems.toString(),
      valueAcresceItems: valueAcresceItems.toString(),
      valueDiscountFinancialProduct:
        financial.valueDiscountFinancialProduct.toString(),
      valueDiscountFinancialService:
        financial.valueDiscountFinancialService.toString(),
      valueAcresceFinancialProduct:
        financial.valueAcresceFinancialProduct.toString(),
      valueAcresceFinancialService:
        financial.valueAcresceFinancialService.toString(),
    };
    const valueLiquid = this.computeValueLiquid(
      valueProduct,
      valueService,
      saleWithAggregates,
    );

    await tx
      .update(sales)
      .set({
        subTotal: subTotal.toString(),
        discountValuetems: discountValuetems.toString(),
        valueAcresceItems: valueAcresceItems.toString(),
        percentageDiscountProduct: financial.percentageDiscountProduct,
        valueDiscountFinancialProduct:
          financial.valueDiscountFinancialProduct.toString(),
        percentageDiscountService: financial.percentageDiscountService,
        valueDiscountFinancialService:
          financial.valueDiscountFinancialService.toString(),
        percentageAcresceProduct: financial.percentageAcresceProduct,
        valueAcresceFinancialProduct:
          financial.valueAcresceFinancialProduct.toString(),
        percentageAcresceService: financial.percentageAcresceService,
        valueAcresceFinancialService:
          financial.valueAcresceFinancialService.toString(),
        valueProduct: valueProduct.toString(),
        valueService: valueService.toString(),
        valueLiquid: valueLiquid.toString(),
        updatedAt: new Date(),
      })
      .where(this.scope(enterpriseId, saleId));

    return {
      subTotal,
      discountValuetems,
      valueAcresceItems,
      valueDiscountFinancialProduct: financial.valueDiscountFinancialProduct,
      valueDiscountFinancialService: financial.valueDiscountFinancialService,
      valueAcresceFinancialProduct: financial.valueAcresceFinancialProduct,
      valueAcresceFinancialService: financial.valueAcresceFinancialService,
      valueProduct,
      valueService,
      valueLiquid,
    };
  }

  private async applyValueLiquidItemsHeader(tx: Tx, saleId: string) {
    const sale = (
      await tx.select().from(sales).where(eq(sales.id, saleId)).limit(1)
    )[0];
    if (!sale) {
      throw new NotFoundError("Venda nao encontrada", "SALE_NOT_FOUND");
    }

    const itemRows = await tx
      .select({
        id: salesItems.id,
        quantity: salesItems.quantity,
        valueUnit: salesItems.valueUnit,
        valueTotal: salesItems.valueTotal,
        typeCode: productTypes.type,
      })
      .from(salesItems)
      .innerJoin(productTypes, eq(salesItems.productTypeId, productTypes.id))
      .where(eq(salesItems.salesId, saleId));

    const allocated = allocateValueLiquidItemsHeader(
      itemRows.map((row) => ({
        id: row.id,
        quantity: decNum(row.quantity),
        valueUnit: decNum(row.valueUnit),
        valueTotal: decNum(row.valueTotal),
        typeCode: row.typeCode,
      })),
      {
        subTotal: decNum(sale.subTotal),
        valueDiscountFinancial:
          decNum(sale.valueDiscountFinancialProduct) +
          decNum(sale.valueDiscountFinancialService),
        valueAcresceFinancial:
          decNum(sale.valueAcresceFinancialProduct) +
          decNum(sale.valueAcresceFinancialService),
      },
    );

    for (const row of allocated) {
      await tx
        .update(salesItems)
        .set({
          valueLiquidItemsHeader: row.valueLiquidItemsHeader.toString(),
          updatedAt: new Date(),
        })
        .where(eq(salesItems.id, row.id));
    }
  }

  private mergeSaleItemPatch(
    existing: typeof salesItems.$inferSelect,
    input: PatchSaleItemInput,
  ): CreateSaleItemInput {
    const quantity =
      input.quantity !== undefined ? input.quantity : Number(existing.quantity);
    const valueUnit =
      input.valueUnit !== undefined
        ? input.valueUnit
        : Number(existing.valueUnit);
    const valueDiscount =
      input.valueDiscount !== undefined
        ? input.valueDiscount
        : Number(existing.valueDiscount);
    const valueAcresce =
      input.valueAcresce !== undefined
        ? input.valueAcresce
        : Number(existing.valueAcresce);

    const valueTotal = computeItemValueTotal(
      quantity,
      valueUnit,
      valueDiscount,
      valueAcresce,
    );

    return {
      quantity,
      valueUnit,
      valueDiscount,
      valueAcresce,
      valueTotal,
      productsEnterprisesId:
        input.productsEnterprisesId ?? existing.productsEnterprisesId,
      unitId: input.unitId ?? existing.unitid,
      productTypeId: input.productTypeId ?? existing.productTypeId,
      stockSectorId: input.stockSectorId ?? existing.stockSectorId ?? undefined,
      stockLocationId:
        input.stockLocationId ?? existing.stockLocationId ?? undefined,
      stockBatchId:
        input.stockBatchId !== undefined
          ? (input.stockBatchId ?? undefined)
          : (existing.stockBatchId ?? undefined),
      description:
        input.description !== undefined
          ? input.description
          : (existing.description ?? undefined),
      typeService:
        input.typeService !== undefined
          ? input.typeService
          : (existing.typeService ?? undefined),
    };
  }

  public async recalculateTotals(
    enterpriseId: string,
    saleId: string,
    audit: EntityAuditContext,
  ) {
    let beforeRow!: typeof sales.$inferSelect;
    await db.transaction(async (tx) => {
      beforeRow = await this.getSaleRow(tx, enterpriseId, saleId);
      const sale = beforeRow;
      await this.assertSaleTypeAllowed(enterpriseId, sale.type);
      if (sale.status !== "ABERTA") {
        throw new ValidationError(
          [
            {
              path: "params.saleId",
              message: "Somente vendas ABERTAS permitem recalcular totais",
            },
          ],
          "Venda nao editavel",
        );
      }
      const totals = await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        sale,
      );
      await this.assertSaleDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        sale.sellerId,
        totals,
      );
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }

  private async resolveSeller(
    userId: string,
  ): Promise<{ userId: string; userLegalName: string }> {
    const row = (
      await db
        .select({ id: users.id, userName: users.userName })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
    }
    return {
      userId: row.id,
      userLegalName: row.userName.trim(),
    };
  }

  private async assertSellerInEnterprise(
    enterpriseId: string,
    sellerUserId: string,
  ) {
    const row = (
      await db
        .select({ id: enterprisesMembers.id })
        .from(enterprisesMembers)
        .where(
          and(
            eq(enterprisesMembers.userId, sellerUserId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            eq(enterprisesMembers.status, "ATIVO"),
            isNull(enterprisesMembers.deletedAt),
            notInArray(enterprisesMembers.class, [
              ...SELLER_INELIGIBLE_MEMBER_CLASSES,
            ]),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new ValidationError(
        [
          {
            path: "body.sellerId",
            message:
              "Vendedor deve ser membro ativo da empresa (nao cliente ou fornecedor)",
          },
        ],
        "Vendedor invalido",
      );
    }
  }

  private async assertCanAssignSeller(
    auth: SaleAuthContext,
    sellerUserId: string,
  ) {
    if (sellerUserId === auth.userId) return;

    if (!auth.memberId) {
      throw new ForbiddenError(
        "Sem permissao para atribuir outro vendedor",
        "PERMISSION_DENIED",
      );
    }
    const resolved = await resolvePermissions(auth.memberId);
    if (!isAllowed(resolved, PERM.alterar_vendas)) {
      throw new ForbiddenError(
        "Sem permissao para atribuir outro vendedor",
        "PERMISSION_DENIED",
      );
    }
  }

  private async resolveSaleSeller(
    auth: SaleAuthContext,
    enterpriseId: string,
    requestedSellerId?: string,
    defaultSellerId?: string,
  ): Promise<{ sellerId: string; sellerLegalName: string }> {
    const sellerUserId = requestedSellerId ?? defaultSellerId ?? auth.userId;
    await this.assertCanAssignSeller(auth, sellerUserId);
    await this.assertSellerInEnterprise(enterpriseId, sellerUserId);
    const seller = await this.resolveSeller(sellerUserId);
    return {
      sellerId: seller.userId,
      sellerLegalName: seller.userLegalName,
    };
  }

  private async resolveItemActor(
    auth: SaleAuthContext,
    enterpriseId: string,
    sale: Pick<typeof sales.$inferSelect, "sellerId">,
    itemSellerId?: string,
  ): Promise<{
    userId: string;
    userLegalName: string;
    sellerId: string;
    sellerLegalName: string;
  }> {
    const operator = await this.resolveSeller(auth.userId);
    const seller = await this.resolveSaleSeller(
      auth,
      enterpriseId,
      itemSellerId,
      sale.sellerId,
    );
    return {
      userId: operator.userId,
      userLegalName: operator.userLegalName,
      sellerId: seller.sellerId,
      sellerLegalName: seller.sellerLegalName,
    };
  }

  private async assertClientMember(
    // Verifica se o cliente existe; status so em venda a prazo
    tx: Tx | typeof db,
    enterpriseId: string,
    memberId: string,
    payments?: SalePaymentInput[],
  ) {
    const row = (
      await tx
        .select({
          id: enterprisesMembers.id,
          status: enterprisesMembers.status,
        })
        .from(enterprisesMembers)
        .where(
          and(
            eq(enterprisesMembers.id, memberId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            isNull(enterprisesMembers.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Membro cliente nao encontrado na empresa",
        "SALE_CLIENT_MEMBER_NOT_FOUND",
      );
    }

    const isCreditSale =
      payments !== undefined && (await this.hasAPrazoPayment(tx, payments));

    if (!isCreditSale) return;

    if (
      !(CREDIT_SALE_ALLOWED_MEMBER_STATUSES as readonly string[]).includes(
        row.status,
      )
    ) {
      throw new ValidationError(
        [
          {
            path: "body.memberId",
            message:
              "Cliente deve estar ATIVO, ESPECIAL ou FUNCIONARIO para venda a prazo",
          },
        ],
        "Cliente inelegivel para venda a prazo",
      );
    }
  }

  private async assertVehiclesEnterprisesMember(
    tx: Tx | typeof db,
    enterpriseId: string,
    vehiclesEnterprisesMembersId: string,
    memberId: string,
    path = "body.vehiclesEnterprisesMembersId",
  ) {
    const row = (
      await tx
        .select({
          id: vehiclesEnterprisesMembers.id,
          enterprisesMembersId: vehiclesEnterprisesMembers.enterprisesMembersId,
          status: vehiclesEnterprisesMembers.status,
        })
        .from(vehiclesEnterprisesMembers)
        .innerJoin(
          enterprisesMembers,
          eq(
            vehiclesEnterprisesMembers.enterprisesMembersId,
            enterprisesMembers.id,
          ),
        )
        .where(
          and(
            eq(vehiclesEnterprisesMembers.id, vehiclesEnterprisesMembersId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            isNull(enterprisesMembers.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new ValidationError(
        [
          {
            path,
            message: "Vinculo veiculo/membro nao encontrado na empresa",
          },
        ],
        "Veiculo invalido",
      );
    }
    if (row.status !== "ATIVO") {
      throw new ValidationError(
        [{ path, message: "Vinculo veiculo/membro esta inativo" }],
        "Veiculo invalido",
      );
    }
    if (row.enterprisesMembersId !== memberId) {
      throw new ValidationError(
        [
          {
            path,
            message:
              "Vinculo veiculo/membro deve pertencer ao mesmo cliente da venda",
          },
        ],
        "Veiculo invalido",
      );
    }
  }

  private resolveVehiclesEnterprisesMembersId(
    inputId: string | undefined,
    sourceId: string | null | undefined,
    path?: string,
    required?: true,
  ): string;
  private resolveVehiclesEnterprisesMembersId(
    inputId: string | undefined,
    sourceId: string | null | undefined,
    path: string | undefined,
    required: false,
  ): string | null;
  private resolveVehiclesEnterprisesMembersId(
    inputId: string | undefined,
    sourceId: string | null | undefined,
    path = "body.vehiclesEnterprisesMembersId",
    required = true,
  ): string | null {
    const resolved = inputId ?? sourceId ?? undefined;
    if (!resolved) {
      if (!required) return null;
      throw new ValidationError(
        [
          {
            path,
            message: "Informe vehiclesEnterprisesMembersId",
          },
        ],
        "Veiculo obrigatorio",
      );
    }
    return resolved;
  }

  private async buildSaleMemberSnapshot(
    tx: Tx | typeof db,
    enterpriseId: string,
    memberId: string,
  ): Promise<SaleMemberSnapshot> {
    const memberRow = (
      await tx
        .select({
          userId: enterprisesMembers.userId,
          userName: users.userName,
          userRegistration: users.userRegistration,
        })
        .from(enterprisesMembers)
        .innerJoin(users, eq(enterprisesMembers.userId, users.id))
        .where(
          and(
            eq(enterprisesMembers.id, memberId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            isNull(enterprisesMembers.deletedAt),
          ),
        )
        .limit(1)
    )[0];

    if (!memberRow) {
      throw new NotFoundError(
        "Membro cliente nao encontrado na empresa",
        "SALE_CLIENT_MEMBER_NOT_FOUND",
      );
    }

    const [addressRow, contactRow] = await Promise.all([
      tx
        .select({
          street: ceps.address,
          number: usersAddress.number,
          cepNumber: ceps.cepNumber,
          cityName: cities.citieName,
          stateAcronym: states.acronym,
        })
        .from(usersAddress)
        .innerJoin(ceps, eq(usersAddress.cepId, ceps.id))
        .innerJoin(cities, eq(ceps.cityId, cities.id))
        .innerJoin(states, eq(cities.stateId, states.id))
        .where(
          and(
            eq(usersAddress.userId, memberRow.userId),
            eq(usersAddress.adressType, "PRINCIPAL"),
            isNull(usersAddress.deletedAt),
            isNull(ceps.deletedAt),
            isNull(cities.deletedAt),
            isNull(states.deletedAt),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
      tx
        .select({
          phone: usersContact.phone,
          whatsapp: usersContact.whatsapp,
        })
        .from(usersContact)
        .where(
          and(
            eq(usersContact.userId, memberRow.userId),
            eq(usersContact.type, "PRINCIPAL"),
            isNull(usersContact.deletedAt),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
    ]);

    const addressLine = addressRow
      ? formatSaleMemberAddressLine(addressRow.street, addressRow.number)
      : null;

    return {
      memberLegalName: memberRow.userName.trim(),
      registration: memberRow.userRegistration?.trim() || null,
      memberAddress: addressLine || null,
      memberCep: addressRow?.cepNumber?.trim() || null,
      memberCity: addressRow?.cityName?.trim() || null,
      memberState: addressRow?.stateAcronym?.trim() || null,
      memberPhone: contactRow?.phone?.trim() || null,
      memberMobile:
        contactRow?.whatsapp?.trim() || contactRow?.phone?.trim() || null,
    };
  }

  private async upsertSaleMember(
    tx: Tx,
    saleId: string,
    snapshot: SaleMemberSnapshot,
  ) {
    const existing = (
      await tx
        .select({ id: salesMembers.id })
        .from(salesMembers)
        .where(eq(salesMembers.salesId, saleId))
        .limit(1)
    )[0];

    const values = {
      ...snapshot,
      updatedAt: new Date(),
    };

    if (existing) {
      await tx
        .update(salesMembers)
        .set(values)
        .where(eq(salesMembers.id, existing.id));
      return;
    }

    await tx.insert(salesMembers).values({
      salesId: saleId,
      ...snapshot,
    });
  }

  private async loadSaleMemberSnapshot(
    executor: Tx | typeof db,
    saleId: string,
  ): Promise<SaleMemberSnapshot | null> {
    return (
      (
        await executor
          .select({
            memberLegalName: salesMembers.memberLegalName,
            memberAddress: salesMembers.memberAddress,
            memberCep: salesMembers.memberCep,
            memberCity: salesMembers.memberCity,
            memberState: salesMembers.memberState,
            registration: salesMembers.registration,
            memberPhone: salesMembers.memberPhone,
            memberMobile: salesMembers.memberMobile,
          })
          .from(salesMembers)
          .where(eq(salesMembers.salesId, saleId))
          .limit(1)
      )[0] ?? null
    );
  }

  private async syncSaleMemberSnapshot(
    tx: Tx,
    enterpriseId: string,
    saleId: string,
    memberId: string,
    options: {
      rebuildFromMember: boolean;
      overrides?: SaleMemberOverrideInput;
    },
  ) {
    const base = options.rebuildFromMember
      ? await this.buildSaleMemberSnapshot(tx, enterpriseId, memberId)
      : ((await this.loadSaleMemberSnapshot(tx, saleId)) ??
        (await this.buildSaleMemberSnapshot(tx, enterpriseId, memberId)));

    const snapshot = mergeSaleMemberSnapshot(
      base,
      normalizeSaleMemberOverrides(options.overrides),
    );
    await this.upsertSaleMember(tx, saleId, snapshot);
  }

  private async loadSaleMember(saleId: string) {
    return (
      (
        await db
          .select({
            id: salesMembers.id,
            salesId: salesMembers.salesId,
            memberLegalName: salesMembers.memberLegalName,
            memberAddress: salesMembers.memberAddress,
            memberCep: salesMembers.memberCep,
            memberCity: salesMembers.memberCity,
            memberState: salesMembers.memberState,
            registration: salesMembers.registration,
            memberPhone: salesMembers.memberPhone,
            memberMobile: salesMembers.memberMobile,
            createdAt: salesMembers.createdAt,
            updatedAt: salesMembers.updatedAt,
          })
          .from(salesMembers)
          .where(eq(salesMembers.salesId, saleId))
          .limit(1)
      )[0] ?? null
    );
  }

  /** Snapshot de sales_members; se ausente, monta a partir do membro vinculado. */
  private async loadSaleMemberDetail(
    enterpriseId: string,
    saleId: string,
    memberId: string,
  ) {
    const existing = await this.loadSaleMember(saleId);
    if (existing) return existing;

    const snapshot = await this.buildSaleMemberSnapshot(
      db,
      enterpriseId,
      memberId,
    );
    return {
      id: null as string | null,
      salesId: saleId,
      ...snapshot,
      createdAt: null as Date | null,
      updatedAt: null as Date | null,
    };
  }

  public async list(enterpriseId: string, query: ListSalesQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.listScope(enterpriseId, query);
    const [items, totalRows] = await Promise.all([
      this.listFromWithMemberJoins()
        .where(where)
        .orderBy(desc(sales.createdAt), asc(sales.id))
        .limit(limit)
        .offset(offset),
      this.listCountFromWithMemberJoins().where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    const paymentsBySaleId = await this.loadSalePaymentsBySaleIds(
      items.map((item) => item.id),
    );
    return {
      items: items.map((item) => ({
        ...item,
        payments: paymentsBySaleId.get(item.id) ?? [],
      })),
      total,
      limit,
      offset,
    };
  }

  private async loadGeneratedSalesSummary(
    // Obtem o resumo das vendas/OS geradas a partir do orcamento
    enterpriseId: string,
    budgetSaleId: string,
  ) {
    return db
      .select({
        id: sales.id,
        orderNumber: sales.orderNumber,
        type: sales.type,
        status: sales.status,
        valueLiquid: sales.valueLiquid,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .where(
        and(
          eq(sales.enterprisesId, enterpriseId),
          eq(sales.sourceBudgetSaleId, budgetSaleId),
        ),
      )
      .orderBy(asc(sales.createdAt), asc(sales.id));
  }

  private async loadGeneratedSalesFromWorkOrder(
    enterpriseId: string,
    workOrderSaleId: string,
  ) {
    return db
      .select({
        id: sales.id,
        orderNumber: sales.orderNumber,
        type: sales.type,
        status: sales.status,
        valueLiquid: sales.valueLiquid,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .where(
        and(
          eq(sales.enterprisesId, enterpriseId),
          eq(sales.sourceWorkOrderSaleId, workOrderSaleId),
        ),
      )
      .orderBy(asc(sales.createdAt), asc(sales.id));
  }

  private async loadSourceDocumentSummary(
    enterpriseId: string,
    sourceSaleId: string,
  ) {
    const row = (
      await db
        .select({
          id: sales.id,
          orderNumber: sales.orderNumber,
          type: sales.type,
          status: sales.status,
        })
        .from(sales)
        .where(
          and(
            eq(sales.enterprisesId, enterpriseId),
            eq(sales.id, sourceSaleId),
          ),
        )
        .limit(1)
    )[0];
    return row ?? null;
  }

  private async loadSaleReturns(saleId: string) {
    const rows = await db
      .select({
        id: salesReturns.id,
        returnOrder: salesReturns.returnOrder,
        salesId: salesReturns.salesId,
        saleItemId: salesReturns.saleItemId,
        quantity: salesReturns.quantity,
        userId: salesReturns.userId,
        createdAt: salesReturns.createdAt,
        updatedAt: salesReturns.updatedAt,
        saleItem: {
          id: salesItems.id,
          productsEnterprisesId: salesItems.productsEnterprisesId,
          quantity: salesItems.quantity,
          valueUnit: salesItems.valueUnit,
          valueTotal: salesItems.valueTotal,
          description: salesItems.description,
          productDescription: productsEnterprises.description,
          productCode: productsEnterprises.code,
        },
        user: {
          id: users.id,
          userName: users.userName,
        },
      })
      .from(salesReturns)
      .innerJoin(salesItems, eq(salesReturns.saleItemId, salesItems.id))
      .innerJoin(
        productsEnterprises,
        eq(salesItems.productsEnterprisesId, productsEnterprises.id),
      )
      .innerJoin(users, eq(salesReturns.userId, users.id))
      .where(eq(salesReturns.salesId, saleId))
      .orderBy(desc(salesReturns.createdAt), asc(salesReturns.id));

    return rows.map((row) => ({
      id: row.id,
      returnOrder: row.returnOrder,
      salesId: row.salesId,
      saleItemId: row.saleItemId,
      quantity: row.quantity,
      userId: row.userId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      saleItem: {
        ...row.saleItem,
        description: row.saleItem.description?.trim() || null,
        productDescription:
          row.saleItem.description?.trim() || row.saleItem.productDescription,
      },
      user: row.user,
    }));
  }

  /**
   * Carrega conversões vinculadas à venda (como orçamento/OS origem
   * ou como venda gerada), com itens convertidos e não convertidos em cascata.
   */
  private async loadSaleConversionsCascade(
    enterpriseId: string,
    saleId: string,
    mode: "source" | "linked" = "linked",
  ) {
    const linkFilter =
      mode === "source"
        ? or(
            eq(saleConversions.budgetSaleId, saleId),
            eq(saleConversions.workOrderSaleId, saleId),
          )!
        : or(
            eq(saleConversions.budgetSaleId, saleId),
            eq(saleConversions.workOrderSaleId, saleId),
            eq(saleConversions.generatedSaleId, saleId),
          )!;

    const conversions = await db
      .select({
        id: saleConversions.id,
        typeConversion: saleConversions.typeConversion,
        budgetSaleId: saleConversions.budgetSaleId,
        workOrderSaleId: saleConversions.workOrderSaleId,
        generatedSaleId: saleConversions.generatedSaleId,
        generatedOrderNumber: sales.orderNumber,
        generatedStatus: sales.status,
        generatedValueLiquid: sales.valueLiquid,
        closureKind: saleConversions.closureKind,
        userId: saleConversions.userId,
        userLegalName: saleConversions.userLegalName,
        createdAt: saleConversions.createdAt,
      })
      .from(saleConversions)
      .innerJoin(sales, eq(saleConversions.generatedSaleId, sales.id))
      .where(and(eq(saleConversions.enterprisesId, enterpriseId), linkFilter))
      .orderBy(asc(saleConversions.createdAt), asc(saleConversions.id));

    if (conversions.length === 0) {
      return [];
    }

    const conversionIds = conversions.map((c) => c.id);
    const [conversionItems, unclosedItems] = await Promise.all([
      db
        .select()
        .from(saleConversionItems)
        .where(inArray(saleConversionItems.saleConversionId, conversionIds)),
      db
        .select()
        .from(saleUnclosedItems)
        .where(inArray(saleUnclosedItems.saleConversionId, conversionIds)),
    ]);

    return conversions.map((conversion) => ({
      ...conversion,
      user: {
        id: conversion.userId,
        userName: conversion.userLegalName,
      },
      generatedSale: {
        id: conversion.generatedSaleId,
        orderNumber: conversion.generatedOrderNumber,
        status: conversion.generatedStatus,
        valueLiquid: conversion.generatedValueLiquid,
      },
      items: conversionItems.filter(
        (item) => item.saleConversionId === conversion.id,
      ),
      unclosedItems: unclosedItems.filter(
        (item) => item.saleConversionId === conversion.id,
      ),
    }));
  }

  public async getById(enterpriseId: string, id: string) {
    // Obtem a venda pelo id
    const sale = (
      await db
        .select(saleWithMemberSelect)
        .from(sales)
        .leftJoin(enterprisesMembers, eq(sales.memberId, enterprisesMembers.id))
        .leftJoin(users, eq(enterprisesMembers.userId, users.id))
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!sale) {
      throw new NotFoundError("Venda nao encontrada", "SALE_NOT_FOUND");
    }
    const [
      items,
      paymentsBySaleId,
      member,
      returns,
      budgetConversions,
      vehicleLink,
      serviceUsers,
    ] = await Promise.all([
      this.loadSaleItems(id),
      this.loadSalePaymentsBySaleIds([id]),
      this.loadSaleMemberDetail(enterpriseId, id, sale.memberId),
      this.loadSaleReturns(id),
      this.loadSaleConversionsCascade(enterpriseId, id, "linked"),
      this.loadSaleVehicleLink(enterpriseId, sale.vehiclesEnterprisesMembersId),
      this.loadUsersByIds([
        sale.userId,
        sale.sellerId,
        sale.userModificationServiceId,
        sale.userClosedServiceId,
      ]),
    ]);
    const payments = paymentsBySaleId.get(id) ?? [];

    const generatedSales =
      sale.type === "ORCAMENTO"
        ? await this.loadGeneratedSalesSummary(enterpriseId, id)
        : sale.type === "ORDEM DE SERVICO"
          ? await this.loadGeneratedSalesFromWorkOrder(enterpriseId, id)
          : undefined;

    const sourceBudget =
      sale.sourceBudgetSaleId !== null
        ? await this.loadSourceDocumentSummary(
            enterpriseId,
            sale.sourceBudgetSaleId,
          )
        : undefined;

    const sourceWorkOrder =
      sale.sourceWorkOrderSaleId !== null
        ? await this.loadSourceDocumentSummary(
            enterpriseId,
            sale.sourceWorkOrderSaleId,
          )
        : undefined;

    const user = serviceUsers.get(sale.userId) ?? {
      id: sale.userId,
      userName: sale.userLegalName,
    };
    const seller = serviceUsers.get(sale.sellerId) ?? {
      id: sale.sellerId,
      userName: sale.sellerLegalName,
    };

    return {
      ...sale,
      user,
      seller,
      memberRef: sale.memberId
        ? { id: sale.memberId, userName: sale.memberName }
        : null,
      vehiclesEnterprisesMembers: vehicleLink,
      userModificationService: sale.userModificationServiceId
        ? (serviceUsers.get(sale.userModificationServiceId) ?? {
            id: sale.userModificationServiceId,
            userName: null,
          })
        : null,
      userClosedService: sale.userClosedServiceId
        ? (serviceUsers.get(sale.userClosedServiceId) ?? {
            id: sale.userClosedServiceId,
            userName: null,
          })
        : null,
      items,
      member,
      payments,
      returns,
      budgetConversions,
      ...(generatedSales !== undefined ? { generatedSales } : {}),
      ...(sourceBudget !== undefined ? { sourceBudget } : {}),
      ...(sourceWorkOrder !== undefined ? { sourceWorkOrder } : {}),
    };
  }

  public async listSaleConversions(enterpriseId: string, saleId: string) {
    const sale = await this.getSaleRow(db, enterpriseId, saleId);
    if (
      sale.type !== "ORCAMENTO" &&
      sale.type !== "ORDEM DE SERVICO" &&
      sale.type !== "VENDA"
    ) {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message:
              "Histórico de conversão disponível para Orçamento, Ordem de Serviço ou Venda",
          },
        ],
        "Tipo invalido",
      );
    }

    const items = await this.loadSaleConversionsCascade(
      enterpriseId,
      saleId,
      sale.type === "VENDA" ? "linked" : "source",
    );
    return { items };
  }

  public async create(
    enterpriseId: string,
    auth: SaleAuthContext | null,
    input: CreateSaleInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    if (!auth?.userId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }
    await this.assertSaleTypeAllowed(enterpriseId, input.type);
    const operator = await this.resolveSeller(auth.userId);
    const seller = await this.resolveSaleSeller(
      auth,
      enterpriseId,
      input.sellerId,
    );

    const status = input.status;
    if (status === "FINALIZADA" && !this.movesInventory(input.type)) {
      throw new ValidationError(
        [
          {
            path: "body.status",
            message:
              "Somente VENDA ou ORDEM DE SERVICO podem ser finalizadas com baixa de estoque",
          },
        ],
        "Status invalido",
      );
    }

    try {
      const saleId = await db.transaction(async (tx) => {
        await this.assertClientMember(
          tx,
          enterpriseId,
          input.memberId,
          status === "FINALIZADA" ? input.payments : undefined,
        );
        if (input.vehiclesEnterprisesMembersId) {
          await this.assertVehiclesEnterprisesMember(
            tx,
            enterpriseId,
            input.vehiclesEnterprisesMembersId,
            input.memberId,
          );
        } else if (input.type === "ORDEM DE SERVICO") {
          throw new ValidationError(
            [
              {
                path: "body.vehiclesEnterprisesMembersId",
                message: "Informe vehiclesEnterprisesMembersId",
              },
            ],
            "Veiculo obrigatorio",
          );
        }

        let orderNumber: number;
        if (input.orderNumber !== undefined) {
          await assertSaleOrderNumberAvailable(
            enterpriseId,
            input.orderNumber,
            tx,
          );
          await syncSaleOrderSequenceFloor(enterpriseId, input.orderNumber, tx);
          orderNumber = input.orderNumber;
        } else {
          orderNumber = await nextSaleOrderNumber(enterpriseId, tx);
        }

        const closingOrigin =
          status === "FINALIZADA"
            ? resolveSaleClosingOrigin(input.origin, gescomClient)
            : undefined;

        const memberSnapshot = mergeSaleMemberSnapshot(
          await this.buildSaleMemberSnapshot(tx, enterpriseId, input.memberId),
          normalizeSaleMemberOverrides(input.member),
        );
        if (!memberSnapshot.memberLegalName) {
          throw new ValidationError(
            [
              {
                path: "body.memberId",
                message: "Cliente sem nome legal",
              },
            ],
            "Cliente invalido",
          );
        }

        const [sale] = await tx
          .insert(sales)
          .values({
            orderNumber,
            userId: operator.userId,
            userLegalName: operator.userLegalName,
            sellerId: seller.sellerId,
            sellerLegalName: seller.sellerLegalName,
            memberId: input.memberId,
            type: input.type,
            subTotal: "0",
            discountValuetems: dec(input.discountValuetems),
            valueAcresceItems: dec(input.valueAcresceItems),
            ...buildSaleFinancialAdjustmentValues(input),
            ...buildSaleServiceFieldValues(input),
            valueLiquid: "0",
            status,
            ...(closingOrigin !== undefined ? { origin: closingOrigin } : {}),
            completedionDate: status === "FINALIZADA" ? new Date() : null,
            vehiclesEnterprisesMembersId:
              input.vehiclesEnterprisesMembersId ?? null,
            enterprisesId: enterpriseId,
          })
          .returning();
        if (!sale) throw new Error("Falha ao criar venda");

        await this.upsertSaleMember(tx, sale.id, memberSnapshot);

        for (let i = 0; i < input.items.length; i++) {
          const itemInput = input.items[i];

          if (this.movesInventory(input.type)) {
            await this.assertVendaDoesNotAcceptService(
              input.type,
              itemInput.productTypeId,
              `items.${i}.productTypeId`,
            );
            await assertSaleItemStockAvailable(
              tx,
              enterpriseId,
              itemInput,
              `items.${i}`,
            );
          } else {
            await validateSaleItemStock(enterpriseId, itemInput, `items.${i}`);
          }

          await this.assertServiceItemDescription(
            itemInput.productTypeId,
            itemInput.description,
            `items.${i}.description`,
          );
          await this.assertServiceItemTypeService(
            itemInput.productTypeId,
            itemInput.typeService,
            `items.${i}.typeService`,
          );

          const actor = await this.resolveItemActor(
            auth,
            enterpriseId,
            sale,
            itemInput.sellerId,
          );

          const { item: pricedItem, priceSnapshot } =
            await this.resolveSaleItemPricing(tx, itemInput);

          await this.assertItemLineDiscountWithinMemberLimitForSeller(
            tx,
            enterpriseId,
            actor.sellerId,
            {
              quantity: pricedItem.quantity,
              valueUnit: pricedItem.valueUnit,
              valueDiscount: pricedItem.valueDiscount,
            },
            `items.${i}.valueDiscount`,
          );

          const [inserted] = await tx
            .insert(salesItems)
            .values(
              this.mapItemInputToInsert(
                sale.id,
                pricedItem,
                actor,
                this.resolveItemLaunchOrigin(itemInput.origin, gescomClient),
                priceSnapshot,
              ),
            )
            .returning();
          if (!inserted) throw new Error("Falha ao incluir item na venda");

          await this.insertItemMechanics(
            tx,
            enterpriseId,
            input.type,
            inserted.id,
            itemInput.mechanics,
            `body.items.${i}.mechanics`,
          );

          if (this.movesInventory(input.type)) {
            await applySaleItemStockOut(tx, {
              enterpriseId,
              userId: auth.userId,
              saleId: sale.id,
              orderNumber: sale.orderNumber,
              item: inserted,
            });
          }
        }

        const totals = await this.recalculateSaleTotalsFromItems(
          tx,
          enterpriseId,
          sale.id,
          sale,
        );
        await this.assertSaleDiscountWithinMemberLimitForSeller(
          tx,
          enterpriseId,
          seller.sellerId,
          totals,
        );

        if (status === "FINALIZADA" && input.payments?.length) {
          const updatedSale = await this.getSaleRow(tx, enterpriseId, sale.id);
          if (!updatedSale) throw new Error("Falha ao recalcular venda");
          await this.applyValueLiquidItemsHeader(tx, sale.id);
          this.assertSalePaymentsMatchSale(
            updatedSale.valueLiquid,
            updatedSale.createdAt,
            input.payments,
          );
          await this.handleCreditSaleMemberStatusOnFinalize(
            tx,
            enterpriseId,
            input.memberId,
            input.payments,
          );
          await this.insertSalePayments(tx, sale.id, input.payments);
          await this.recalculateSaleItemsCommission(
            tx,
            sale.id,
            seller.sellerId,
            enterpriseId,
            input.payments,
          );
        }

        return sale.id;
      });

      const saleRow = await this.getSaleRow(db, enterpriseId, saleId);
      await recordCreateAudit({
        entityType: EntityTypes.SALES,
        entityId: saleId,
        after: toAuditRecord(saleRow),
        ctx: { ...audit, enterpriseId },
      });

      return this.getById(enterpriseId, saleId);
    } catch (err) {
      const conflict = mapSaleUniqueViolation(err);
      if (conflict) throw conflict;
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    auth: SaleAuthContext | null,
    input: PatchSaleInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    const existing = await this.getById(enterpriseId, id);
    await this.assertSaleTypeAllowed(enterpriseId, existing.type);
    if (existing.type === "ORCAMENTO" && existing.status === "FINALIZADA") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Orcamento fechado nao pode ser alterado",
          },
        ],
        "Orcamento fechado",
      );
    }
    const previousStatus = existing.status;
    const nextStatus = input.status ?? existing.status;

    if (
      previousStatus === "CANCELADA" &&
      input.status !== undefined &&
      input.status !== "CANCELADA"
    ) {
      throw new ValidationError(
        [
          {
            path: "body.status",
            message: "Venda cancelada nao pode mudar de status",
          },
        ],
        "Status invalido",
      );
    }

    if (previousStatus !== "ABERTA") {
      throw new ValidationError(
        [
          {
            path: "body",
            message:
              "Venda finalizada ou cancelada nao pode ser alterada. Use devolucoes para estorno parcial.",
          },
        ],
        "Venda nao editavel",
      );
    }

    if (
      input.member !== undefined &&
      input.memberId === undefined &&
      existing.memberId == null
    ) {
      throw new ValidationError(
        [
          {
            path: "body.member",
            message:
              "Informe memberId para associar membro a venda antes de alterar o snapshot",
          },
        ],
        "Membro obrigatorio",
      );
    }

    if (
      existing.type !== "ORDEM DE SERVICO" &&
      input.serviceType !== undefined
    ) {
      throw new ValidationError(
        [
          {
            path: "body.serviceType",
            message:
              "serviceType so pode ser informado em ORDEM DE SERVICO; omita o campo",
          },
        ],
        "Campo invalido",
      );
    }

    let sellerUpdate: { sellerId: string; sellerLegalName: string } | undefined;
    if (input.sellerId !== undefined) {
      if (!auth?.userId) {
        throw new ValidationError(
          [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
          "Nao autenticado",
        );
      }
      sellerUpdate = await this.resolveSaleSeller(
        auth,
        enterpriseId,
        input.sellerId,
      );
    }

    const hasHeaderChange =
      input.memberId !== undefined ||
      input.member !== undefined ||
      input.sellerId !== undefined ||
      input.discountValuetems !== undefined ||
      input.valueAcresceItems !== undefined ||
      input.percentageDiscountProduct !== undefined ||
      input.valueDiscountFinancialProduct !== undefined ||
      input.percentageDiscountService !== undefined ||
      input.valueDiscountFinancialService !== undefined ||
      input.percentageAcresceProduct !== undefined ||
      input.valueAcresceFinancialProduct !== undefined ||
      input.percentageAcresceService !== undefined ||
      input.valueAcresceFinancialService !== undefined ||
      input.valueLiquid !== undefined ||
      input.recalculateTotals === true ||
      input.vehicleMileage !== undefined ||
      input.observations !== undefined ||
      input.defect !== undefined ||
      input.serviceType !== undefined ||
      input.vehiclesEnterprisesMembersId !== undefined;

    if (nextStatus === "FINALIZADA" && !this.movesInventory(existing.type)) {
      throw new ValidationError(
        [
          {
            path: "body.status",
            message:
              "Somente VENDA ou ORDEM DE SERVICO movimentam estoque ao finalizar",
          },
        ],
        "Status invalido",
      );
    }

    const finalize = nextStatus === "FINALIZADA";
    const closingOrigin = finalize
      ? resolveSaleClosingOrigin(input.origin, gescomClient)
      : undefined;
    const cancelSale =
      this.shouldMoveStock(existing) && nextStatus === "CANCELADA";

    if (finalize && input.payments === undefined) {
      throw new ValidationError(
        [
          {
            path: "body.payments",
            message:
              "Informe pagamentos e parcelas ao finalizar a venda (status FINALIZADA)",
          },
        ],
        "Pagamentos obrigatorios",
      );
    }

    if (input.payments !== undefined && !finalize) {
      throw new ValidationError(
        [
          {
            path: "body.payments",
            message:
              "Pagamentos e parcelas so podem ser informados ao fechar a venda",
          },
        ],
        "Pagamentos invalidos",
      );
    }

    const completedionDate =
      input.completedionDate !== undefined
        ? input.completedionDate
        : finalize
          ? new Date()
          : undefined;

    const shouldRecalculateTotals =
      input.recalculateTotals === true ||
      (hasHeaderChange && input.valueLiquid === undefined);

    let beforeRow!: typeof sales.$inferSelect;
    try {
      await db.transaction(async (tx) => {
        beforeRow = await this.getSaleRow(tx, enterpriseId, id);

        if (input.memberId !== undefined) {
          await this.assertClientMember(
            tx,
            enterpriseId,
            input.memberId,
            finalize ? input.payments : undefined,
          );
        }

        const nextMemberId = input.memberId ?? beforeRow.memberId;
        const nextVehiclesEnterprisesMembersId =
          input.vehiclesEnterprisesMembersId !== undefined
            ? input.vehiclesEnterprisesMembersId
            : beforeRow.vehiclesEnterprisesMembersId;
        if (
          nextVehiclesEnterprisesMembersId &&
          (input.vehiclesEnterprisesMembersId !== undefined ||
            input.memberId !== undefined)
        ) {
          await this.assertVehiclesEnterprisesMember(
            tx,
            enterpriseId,
            nextVehiclesEnterprisesMembersId,
            nextMemberId,
          );
        }

        let row = (
          await tx
            .update(sales)
            .set({
              ...(input.memberId !== undefined
                ? { memberId: input.memberId }
                : {}),
              ...(sellerUpdate
                ? {
                    sellerId: sellerUpdate.sellerId,
                    sellerLegalName: sellerUpdate.sellerLegalName,
                  }
                : {}),
              ...(input.status !== undefined ? { status: input.status } : {}),
              ...buildSaleFinancialAdjustmentValues(input),
              ...buildSaleServiceFieldValues({
                ...input,
                type: existing.type,
              }),
              ...(input.discountValuetems !== undefined
                ? { discountValuetems: dec(input.discountValuetems) }
                : {}),
              ...(input.valueAcresceItems !== undefined
                ? { valueAcresceItems: dec(input.valueAcresceItems) }
                : {}),
              ...(input.valueLiquid !== undefined
                ? { valueLiquid: input.valueLiquid.toString() }
                : {}),
              ...(completedionDate !== undefined ? { completedionDate } : {}),
              ...(closingOrigin !== undefined ? { origin: closingOrigin } : {}),
              ...(input.vehiclesEnterprisesMembersId !== undefined
                ? {
                    vehiclesEnterprisesMembersId:
                      input.vehiclesEnterprisesMembersId,
                  }
                : {}),
              updatedAt: new Date(),
            })
            .where(this.scope(enterpriseId, id))
            .returning()
        )[0];
        if (!row) {
          throw new NotFoundError("Venda nao encontrada", "SALE_NOT_FOUND");
        }

        if (input.memberId !== undefined || input.member !== undefined) {
          const memberId = input.memberId ?? row.memberId;
          if (!memberId) {
            throw new ValidationError(
              [
                {
                  path: "body.member",
                  message:
                    "Informe memberId para associar membro a venda antes de alterar o snapshot",
                },
              ],
              "Membro obrigatorio",
            );
          }

          await this.syncSaleMemberSnapshot(tx, enterpriseId, id, memberId, {
            rebuildFromMember: input.memberId !== undefined,
            overrides: input.member,
          });
        }

        if (shouldRecalculateTotals && row.status === "ABERTA") {
          await this.recalculateSaleTotalsFromItems(tx, enterpriseId, id, row);
          row = (await this.getSaleRow(tx, enterpriseId, id))!;
        }

        if (row.status === "ABERTA") {
          await this.assertSaleDiscountWithinMemberLimitForSeller(
            tx,
            enterpriseId,
            sellerUpdate?.sellerId ?? row.sellerId,
            {
              subTotal: decNum(row.subTotal),
              discountValuetems: decNum(row.discountValuetems),
              valueDiscountFinancialProduct: decNum(
                row.valueDiscountFinancialProduct,
              ),
              valueDiscountFinancialService: decNum(
                row.valueDiscountFinancialService,
              ),
            },
          );
        }

        const items = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, id));

        if (finalize) {
          await this.applyValueLiquidItemsHeader(tx, id);
          if (this.shouldMoveStock(existing)) {
            for (const item of items) {
              await applySaleItemStockOut(tx, {
                enterpriseId,
                userId: auth?.userId ?? null,
                saleId: id,
                orderNumber: row.orderNumber,
                item,
              });
            }
            await assertSaleItemsStockCommitted(tx, id, items);
          }
          await this.assertSaleHasNoPayments(tx, id);
          this.assertSalePaymentsMatchSale(
            row.valueLiquid,
            row.createdAt,
            input.payments!,
          );
          await this.handleCreditSaleMemberStatusOnFinalize(
            tx,
            enterpriseId,
            row.memberId,
            input.payments!,
          );
          await this.insertSalePayments(tx, id, input.payments!);
          await this.recalculateSaleItemsCommission(
            tx,
            id,
            sellerUpdate?.sellerId ?? existing.sellerId,
            enterpriseId,
            input.payments!,
          );
        }

        if (cancelSale) {
          for (const item of items) {
            await applySaleItemStockReturn(tx, {
              enterpriseId,
              userId: auth?.userId ?? null,
              saleId: id,
              orderNumber: row.orderNumber,
              item,
            });
          }
        }
      });

      await this.recordSaleUpdateAudit(enterpriseId, id, beforeRow, audit);
      return this.getById(enterpriseId, id);
    } catch (err) {
      const conflict = mapSaleUniqueViolation(err);
      if (conflict) throw conflict;
      throw err;
    }
  }

  public async convertBudgetToSale(
    enterpriseId: string,
    budgetSaleId: string,
    auth: SaleAuthContext | null,
    input: ConvertBudgetToSaleInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    if (!auth?.userId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }

    const operator = await this.resolveSeller(auth.userId);
    const status = input.status;

    const seenBudgetItemIds = new Set<string>();
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      if (seenBudgetItemIds.has(item.budgetItemId)) {
        throw new ValidationError(
          [
            {
              path: `body.items.${i}.budgetItemId`,
              message: "Item do orcamento duplicado na conversao",
            },
          ],
          "Itens invalidos",
        );
      }
      seenBudgetItemIds.add(item.budgetItemId);
    }

    try {
      let budgetBefore!: typeof sales.$inferSelect;
      const generatedSaleId = await db.transaction(async (tx) => {
        budgetBefore = await this.getSaleRow(tx, enterpriseId, budgetSaleId);
        const budget = budgetBefore;
        this.assertBudgetOpenForConversion(budget);

        const budgetItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, budgetSaleId));

        if (await this.documentHasServiceItem(budgetItems)) {
          throw new ValidationError(
            [
              {
                path: "params.saleId",
                message:
                  "Orcamento com servico deve ser convertido em ordem de servico (convert-to-os)",
              },
            ],
            "Use convert-to-os",
          );
        }

        const budgetItemsById = new Map(
          budgetItems.map((item) => [item.id, item]),
        );

        const conversionLines: {
          budgetItem: typeof salesItems.$inferSelect;
          convertQuantity: number;
          line: (typeof input.items)[number];
          itemIndex: number;
        }[] = [];
        const unclosedRows: {
          budgetItemId: string;
          quantityNotConverted: number;
          justification: string;
        }[] = [];

        for (let i = 0; i < input.items.length; i++) {
          const line = input.items[i];
          const budgetItem = budgetItemsById.get(line.budgetItemId);
          if (!budgetItem) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.budgetItemId`,
                  message: "Item nao pertence ao orcamento",
                },
              ],
              "Item invalido",
            );
          }

          const remaining =
            decNum(budgetItem.quantity) - decNum(budgetItem.quantityConverted);
          if (line.quantity > remaining + 1e-9) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.quantity`,
                  message: `Quantidade excede saldo restante (${remaining})`,
                },
              ],
              "Quantidade invalida",
            );
          }

          if (line.quantity < remaining - 1e-9) {
            const justification = line.unclosedJustification?.trim();
            if (justification) {
              unclosedRows.push({
                budgetItemId: budgetItem.id,
                quantityNotConverted: remaining - line.quantity,
                justification,
              });
            }
          }

          if (line.quantity > 0) {
            conversionLines.push({
              budgetItem,
              convertQuantity: line.quantity,
              line,
              itemIndex: i,
            });
          }
        }

        const memberId = input.memberId ?? budget.memberId;
        if (!memberId) {
          throw new ValidationError(
            [
              {
                path: "params.saleId",
                message: "Orcamento sem cliente vinculado",
              },
            ],
            "Cliente obrigatorio",
          );
        }
        await this.assertClientMember(
          tx,
          enterpriseId,
          memberId,
          status === "FINALIZADA" ? input.payments : undefined,
        );

        const vehiclesEnterprisesMembersId =
          this.resolveVehiclesEnterprisesMembersId(
            input.vehiclesEnterprisesMembersId,
            budget.vehiclesEnterprisesMembersId,
            "body.vehiclesEnterprisesMembersId",
            false,
          );
        if (vehiclesEnterprisesMembersId) {
          await this.assertVehiclesEnterprisesMember(
            tx,
            enterpriseId,
            vehiclesEnterprisesMembersId,
            memberId,
          );
        }

        const orderNumber = await nextSaleOrderNumber(enterpriseId, tx);

        const seller = await this.resolveSaleSeller(
          auth,
          enterpriseId,
          input.sellerId,
          budget.sellerId,
        );

        const closingOrigin =
          status === "FINALIZADA"
            ? resolveSaleClosingOrigin(input.origin, gescomClient)
            : undefined;

        const memberSnapshot = mergeSaleMemberSnapshot(
          await this.buildSaleMemberSnapshot(tx, enterpriseId, memberId),
          normalizeSaleMemberOverrides(input.member),
        );
        if (!memberSnapshot.memberLegalName) {
          throw new ValidationError(
            [
              {
                path: "body.memberId",
                message: "Cliente sem nome legal",
              },
            ],
            "Cliente invalido",
          );
        }

        const [generatedSale] = await tx
          .insert(sales)
          .values({
            orderNumber,
            userId: operator.userId,
            userLegalName: operator.userLegalName,
            sellerId: seller.sellerId,
            sellerLegalName: seller.sellerLegalName,
            memberId,
            type: "VENDA",
            subTotal: "0",
            discountValuetems: dec(input.discountValuetems),
            valueAcresceItems: dec(input.valueAcresceItems),
            ...buildSaleFinancialAdjustmentValues(input),
            ...buildSaleServiceFieldValues({ ...input, type: "VENDA" }),
            valueLiquid: "0",
            status,
            sourceBudgetSaleId: budgetSaleId,
            ...(closingOrigin !== undefined ? { origin: closingOrigin } : {}),
            completedionDate: status === "FINALIZADA" ? new Date() : null,
            vehiclesEnterprisesMembersId,
            enterprisesId: enterpriseId,
          })
          .returning();
        if (!generatedSale)
          throw new Error("Falha ao gerar venda do orcamento");

        await this.upsertSaleMember(tx, generatedSale.id, memberSnapshot);

        const conversionItemRows: {
          budgetItemId: string;
          saleItemId: string;
          quantity: string;
        }[] = [];

        for (let i = 0; i < conversionLines.length; i++) {
          const { budgetItem, convertQuantity, line, itemIndex } =
            conversionLines[i];
          const itemPath = `body.items.${itemIndex}`;
          const itemInput = await this.resolveConversionItemInput(
            tx,
            enterpriseId,
            budgetItem,
            convertQuantity,
            itemPath,
            line,
          );

          await assertSaleItemStockAvailable(
            tx,
            enterpriseId,
            itemInput,
            itemPath,
          );

          const actor = await this.resolveItemActor(
            auth,
            enterpriseId,
            generatedSale,
          );

          await this.assertItemLineDiscountWithinMemberLimitForSeller(
            tx,
            enterpriseId,
            actor.sellerId,
            {
              quantity: itemInput.quantity,
              valueUnit: itemInput.valueUnit,
              valueDiscount: itemInput.valueDiscount,
            },
            `${itemPath}.valueDiscount`,
          );

          const priceSnapshot = this.priceSnapshotFromBudgetItem(budgetItem);

          const [inserted] = await tx
            .insert(salesItems)
            .values({
              ...this.mapItemInputToInsert(
                generatedSale.id,
                itemInput,
                actor,
                this.resolveItemLaunchOrigin(itemInput.origin, gescomClient),
                priceSnapshot,
              ),
              sourceBudgetItemId: budgetItem.id,
              quantityConverted: formatQuantity(convertQuantity),
            })
            .returning();
          if (!inserted)
            throw new Error("Falha ao incluir item na venda gerada");

          await applySaleItemStockOut(tx, {
            enterpriseId,
            userId: auth.userId,
            saleId: generatedSale.id,
            orderNumber: generatedSale.orderNumber,
            item: inserted,
          });

          const nextConverted =
            decNum(budgetItem.quantityConverted) + convertQuantity;
          const [updatedBudgetItem] = await tx
            .update(salesItems)
            .set({
              quantityConverted: formatQuantity(nextConverted),
              updatedAt: new Date(),
            })
            .where(eq(salesItems.id, budgetItem.id))
            .returning({ id: salesItems.id });
          if (!updatedBudgetItem) {
            throw new Error(
              `Falha ao atualizar quantityConverted do item ${budgetItem.id}`,
            );
          }

          budgetItem.quantityConverted = formatQuantity(nextConverted);

          conversionItemRows.push({
            budgetItemId: budgetItem.id,
            saleItemId: inserted.id,
            quantity: formatQuantity(convertQuantity),
          });
        }

        const totals = await this.recalculateSaleTotalsFromItems(
          tx,
          enterpriseId,
          generatedSale.id,
          generatedSale,
        );
        await this.assertSaleDiscountWithinMemberLimitForSeller(
          tx,
          enterpriseId,
          seller.sellerId,
          totals,
        );

        if (status === "FINALIZADA" && input.payments?.length) {
          const updatedSale = await this.getSaleRow(
            tx,
            enterpriseId,
            generatedSale.id,
          );
          if (!updatedSale) throw new Error("Falha ao recalcular venda gerada");
          await this.applyValueLiquidItemsHeader(tx, generatedSale.id);
          this.assertSalePaymentsMatchSale(
            updatedSale.valueLiquid,
            updatedSale.createdAt,
            input.payments,
          );
          await this.handleCreditSaleMemberStatusOnFinalize(
            tx,
            enterpriseId,
            memberId,
            input.payments,
          );
          await this.insertSalePayments(tx, generatedSale.id, input.payments);
          await this.recalculateSaleItemsCommission(
            tx,
            generatedSale.id,
            seller.sellerId,
            enterpriseId,
            input.payments,
          );
        }

        const updatedBudgetItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, budgetSaleId));

        const computedBudgetStatus =
          this.computeBudgetStatus(updatedBudgetItems);
        const closureKind: SaleConversionClosureKind =
          computedBudgetStatus === "FINALIZADA" ? "TOTAL" : "PARCIAL";

        await tx
          .update(sales)
          .set({
            status: computedBudgetStatus,
            completedionDate:
              computedBudgetStatus === "FINALIZADA" ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(sales.id, budgetSaleId));

        await this.insertSaleConversionAudit(tx, {
          enterprisesId: enterpriseId,
          typeConversion: "ORCAMENTO-VENDA",
          budgetSaleId,
          generatedSaleId: generatedSale.id,
          closureKind,
          userId: operator.userId,
          userLegalName: operator.userLegalName,
          items: conversionItemRows.map((row) => ({
            saleItemId: row.saleItemId,
            quantity: row.quantity,
          })),
          unclosedItems: unclosedRows.map((row) => ({
            saleItemId: row.budgetItemId,
            quantityNotConverted: row.quantityNotConverted,
            justification: row.justification,
          })),
        });

        return generatedSale.id;
      });

      const generatedRow = await this.getSaleRow(
        db,
        enterpriseId,
        generatedSaleId,
      );
      await recordCreateAudit({
        entityType: EntityTypes.SALES,
        entityId: generatedSaleId,
        after: toAuditRecord(generatedRow),
        ctx: { ...audit, enterpriseId },
      });
      const budgetAfter = await this.getSaleRow(db, enterpriseId, budgetSaleId);
      await recordEntityAudit({
        entityType: EntityTypes.SALES,
        entityId: budgetSaleId,
        action: "UPDATE",
        before: toAuditRecord(budgetBefore),
        after: toAuditRecord(budgetAfter),
        ctx: { ...audit, enterpriseId },
      });

      return this.getById(enterpriseId, generatedSaleId);
    } catch (err) {
      const conflict = mapSaleUniqueViolation(err);
      if (conflict) throw conflict;
      throw err;
    }
  }

  public async convertBudgetToOs(
    enterpriseId: string,
    budgetSaleId: string,
    auth: SaleAuthContext | null,
    input: ConvertBudgetToOsInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    await this.assertTrabalhaOsEnabled(enterpriseId);
    if (!auth?.userId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }

    const operator = await this.resolveSeller(auth.userId);
    const status = "ABERTA" as const;

    const seenBudgetItemIds = new Set<string>();
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      if (seenBudgetItemIds.has(item.budgetItemId)) {
        throw new ValidationError(
          [
            {
              path: `body.items.${i}.budgetItemId`,
              message: "Item do orcamento duplicado na conversao",
            },
          ],
          "Itens invalidos",
        );
      }
      seenBudgetItemIds.add(item.budgetItemId);
    }

    try {
      let budgetBefore!: typeof sales.$inferSelect;
      const generatedSaleId = await db.transaction(async (tx) => {
        budgetBefore = await this.getSaleRow(tx, enterpriseId, budgetSaleId);
        const budget = budgetBefore;
        this.assertBudgetOpenForConversion(budget);

        const budgetItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, budgetSaleId));

        if (!(await this.documentHasServiceItem(budgetItems))) {
          throw new ValidationError(
            [
              {
                path: "params.saleId",
                message:
                  "Orcamento sem servico deve usar convert-to-sale (venda)",
              },
            ],
            "Use convert-to-sale",
          );
        }

        const budgetItemsById = new Map(
          budgetItems.map((item) => [item.id, item]),
        );

        const conversionLines: {
          budgetItem: typeof salesItems.$inferSelect;
          convertQuantity: number;
          line: (typeof input.items)[number];
          itemIndex: number;
        }[] = [];
        const unclosedRows: {
          budgetItemId: string;
          quantityNotConverted: number;
          justification: string;
        }[] = [];

        for (let i = 0; i < input.items.length; i++) {
          const line = input.items[i];
          const budgetItem = budgetItemsById.get(line.budgetItemId);
          if (!budgetItem) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.budgetItemId`,
                  message: "Item nao pertence ao orcamento",
                },
              ],
              "Item invalido",
            );
          }

          const remaining =
            decNum(budgetItem.quantity) - decNum(budgetItem.quantityConverted);
          if (line.quantity > remaining + 1e-9) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.quantity`,
                  message: `Quantidade excede saldo restante (${remaining})`,
                },
              ],
              "Quantidade invalida",
            );
          }

          if (line.quantity < remaining - 1e-9) {
            const justification = line.unclosedJustification?.trim();
            if (justification) {
              unclosedRows.push({
                budgetItemId: budgetItem.id,
                quantityNotConverted: remaining - line.quantity,
                justification,
              });
            }
          }

          if (line.quantity > 0) {
            conversionLines.push({
              budgetItem,
              convertQuantity: line.quantity,
              line,
              itemIndex: i,
            });
          }
        }

        const memberId = input.memberId ?? budget.memberId;
        if (!memberId) {
          throw new ValidationError(
            [
              {
                path: "params.saleId",
                message: "Orcamento sem cliente vinculado",
              },
            ],
            "Cliente obrigatorio",
          );
        }
        await this.assertClientMember(tx, enterpriseId, memberId);

        const vehiclesEnterprisesMembersId =
          this.resolveVehiclesEnterprisesMembersId(
            input.vehiclesEnterprisesMembersId,
            budget.vehiclesEnterprisesMembersId,
          );
        await this.assertVehiclesEnterprisesMember(
          tx,
          enterpriseId,
          vehiclesEnterprisesMembersId,
          memberId,
        );

        const orderNumber = await nextSaleOrderNumber(enterpriseId, tx);

        const seller = await this.resolveSaleSeller(
          auth,
          enterpriseId,
          input.sellerId,
          budget.sellerId,
        );

        const memberSnapshot = mergeSaleMemberSnapshot(
          await this.buildSaleMemberSnapshot(tx, enterpriseId, memberId),
          normalizeSaleMemberOverrides(input.member),
        );
        if (!memberSnapshot.memberLegalName) {
          throw new ValidationError(
            [
              {
                path: "body.memberId",
                message: "Cliente sem nome legal",
              },
            ],
            "Cliente invalido",
          );
        }

        const serviceFields = buildSaleServiceFieldValues({
          ...input,
          type: "ORDEM DE SERVICO",
          modelService: input.modelService ?? budget.modelService ?? "VEICULO",
          serviceType: input.serviceType ?? budget.serviceType ?? undefined,
          vehicleMileage:
            input.vehicleMileage ?? budget.vehicleMileage ?? undefined,
          observations: input.observations ?? budget.observations ?? undefined,
          defect: input.defect ?? budget.defect ?? undefined,
        });

        const [generatedSale] = await tx
          .insert(sales)
          .values({
            orderNumber,
            userId: operator.userId,
            userLegalName: operator.userLegalName,
            sellerId: seller.sellerId,
            sellerLegalName: seller.sellerLegalName,
            memberId,
            type: "ORDEM DE SERVICO",
            subTotal: "0",
            discountValuetems: dec(input.discountValuetems),
            valueAcresceItems: dec(input.valueAcresceItems),
            ...buildSaleFinancialAdjustmentValues(input),
            ...serviceFields,
            valueLiquid: "0",
            status,
            sourceBudgetSaleId: budgetSaleId,
            vehiclesEnterprisesMembersId,
            enterprisesId: enterpriseId,
          })
          .returning();
        if (!generatedSale) {
          throw new Error("Falha ao gerar ordem de servico do orcamento");
        }

        await this.upsertSaleMember(tx, generatedSale.id, memberSnapshot);

        const conversionItemRows: {
          budgetItemId: string;
          saleItemId: string;
          quantity: string;
        }[] = [];

        for (let i = 0; i < conversionLines.length; i++) {
          const { budgetItem, convertQuantity, line, itemIndex } =
            conversionLines[i];
          const itemPath = `body.items.${itemIndex}`;
          const itemInput = await this.resolveConversionItemInput(
            tx,
            enterpriseId,
            budgetItem,
            convertQuantity,
            itemPath,
            line,
          );

          await assertSaleItemStockAvailable(
            tx,
            enterpriseId,
            itemInput,
            itemPath,
          );

          const actor = await this.resolveItemActor(
            auth,
            enterpriseId,
            generatedSale,
          );

          await this.assertItemLineDiscountWithinMemberLimitForSeller(
            tx,
            enterpriseId,
            actor.sellerId,
            {
              quantity: itemInput.quantity,
              valueUnit: itemInput.valueUnit,
              valueDiscount: itemInput.valueDiscount,
            },
            `${itemPath}.valueDiscount`,
          );

          const priceSnapshot = this.priceSnapshotFromBudgetItem(budgetItem);

          const [inserted] = await tx
            .insert(salesItems)
            .values({
              ...this.mapItemInputToInsert(
                generatedSale.id,
                itemInput,
                actor,
                this.resolveItemLaunchOrigin(itemInput.origin, gescomClient),
                priceSnapshot,
              ),
              sourceBudgetItemId: budgetItem.id,
              quantityConverted: "0",
            })
            .returning();
          if (!inserted) {
            throw new Error("Falha ao incluir item na ordem de servico gerada");
          }

          await applySaleItemStockOut(tx, {
            enterpriseId,
            userId: auth.userId,
            saleId: generatedSale.id,
            orderNumber: generatedSale.orderNumber,
            item: inserted,
          });

          const nextConverted =
            decNum(budgetItem.quantityConverted) + convertQuantity;
          const [updatedBudgetItem] = await tx
            .update(salesItems)
            .set({
              quantityConverted: formatQuantity(nextConverted),
              updatedAt: new Date(),
            })
            .where(eq(salesItems.id, budgetItem.id))
            .returning({ id: salesItems.id });
          if (!updatedBudgetItem) {
            throw new Error(
              `Falha ao atualizar quantityConverted do item ${budgetItem.id}`,
            );
          }

          budgetItem.quantityConverted = formatQuantity(nextConverted);

          conversionItemRows.push({
            budgetItemId: budgetItem.id,
            saleItemId: inserted.id,
            quantity: formatQuantity(convertQuantity),
          });
        }

        const totals = await this.recalculateSaleTotalsFromItems(
          tx,
          enterpriseId,
          generatedSale.id,
          generatedSale,
        );
        await this.assertSaleDiscountWithinMemberLimitForSeller(
          tx,
          enterpriseId,
          seller.sellerId,
          totals,
        );

        const updatedBudgetItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, budgetSaleId));

        const computedBudgetStatus =
          this.computeBudgetStatus(updatedBudgetItems);
        const closureKind: SaleConversionClosureKind =
          computedBudgetStatus === "FINALIZADA" ? "TOTAL" : "PARCIAL";

        await tx
          .update(sales)
          .set({
            status: computedBudgetStatus,
            completedionDate:
              computedBudgetStatus === "FINALIZADA" ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(sales.id, budgetSaleId));

        await this.insertSaleConversionAudit(tx, {
          enterprisesId: enterpriseId,
          typeConversion: "ORCAMENTO-ORDEM_SERVICO",
          budgetSaleId,
          generatedSaleId: generatedSale.id,
          closureKind,
          userId: operator.userId,
          userLegalName: operator.userLegalName,
          items: conversionItemRows.map((row) => ({
            saleItemId: row.saleItemId,
            quantity: row.quantity,
          })),
          unclosedItems: unclosedRows.map((row) => ({
            saleItemId: row.budgetItemId,
            quantityNotConverted: row.quantityNotConverted,
            justification: row.justification,
          })),
        });

        return generatedSale.id;
      });

      const generatedRow = await this.getSaleRow(
        db,
        enterpriseId,
        generatedSaleId,
      );
      await recordCreateAudit({
        entityType: EntityTypes.SALES,
        entityId: generatedSaleId,
        after: toAuditRecord(generatedRow),
        ctx: { ...audit, enterpriseId },
      });
      const budgetAfter = await this.getSaleRow(db, enterpriseId, budgetSaleId);
      await recordEntityAudit({
        entityType: EntityTypes.SALES,
        entityId: budgetSaleId,
        action: "UPDATE",
        before: toAuditRecord(budgetBefore),
        after: toAuditRecord(budgetAfter),
        ctx: { ...audit, enterpriseId },
      });

      return this.getById(enterpriseId, generatedSaleId);
    } catch (err) {
      const conflict = mapSaleUniqueViolation(err);
      if (conflict) throw conflict;
      throw err;
    }
  }

  public async convertOsToSale(
    enterpriseId: string,
    workOrderSaleId: string,
    auth: SaleAuthContext | null,
    input: ConvertOsToSaleInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    await this.assertTrabalhaOsEnabled(enterpriseId);
    if (!auth?.userId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }

    const operator = await this.resolveSeller(auth.userId);
    const status = input.status;

    const seenItemIds = new Set<string>();
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      if (seenItemIds.has(item.workOrderItemId)) {
        throw new ValidationError(
          [
            {
              path: `body.items.${i}.workOrderItemId`,
              message: "Item da ordem de servico duplicado na conversao",
            },
          ],
          "Itens invalidos",
        );
      }
      seenItemIds.add(item.workOrderItemId);
    }

    try {
      let workOrderBefore!: typeof sales.$inferSelect;
      const generatedSaleId = await db.transaction(async (tx) => {
        workOrderBefore = await this.getSaleRow(
          tx,
          enterpriseId,
          workOrderSaleId,
        );
        const workOrder = workOrderBefore;
        this.assertOsOpenForConversion(workOrder);

        const workOrderItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, workOrderSaleId));

        const workOrderItemsById = new Map(
          workOrderItems.map((item) => [item.id, item]),
        );

        const conversionLines: {
          workOrderItem: typeof salesItems.$inferSelect;
          convertQuantity: number;
          line: ConvertOsItemLine;
          itemIndex: number;
        }[] = [];
        const unclosedRows: {
          workOrderItemId: string;
          quantityNotConverted: number;
          justification: string;
        }[] = [];

        for (let i = 0; i < input.items.length; i++) {
          const line = input.items[i];
          const workOrderItem = workOrderItemsById.get(line.workOrderItemId);
          if (!workOrderItem) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.workOrderItemId`,
                  message: "Item nao pertence a ordem de servico",
                },
              ],
              "Item invalido",
            );
          }

          const remaining =
            decNum(workOrderItem.quantity) -
            decNum(workOrderItem.quantityConverted);
          if (line.quantity > remaining + 1e-9) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.quantity`,
                  message: `Quantidade excede saldo restante (${remaining})`,
                },
              ],
              "Quantidade invalida",
            );
          }

          if (line.quantity < remaining - 1e-9) {
            const justification = line.unclosedJustification?.trim();
            if (justification) {
              unclosedRows.push({
                workOrderItemId: workOrderItem.id,
                quantityNotConverted: remaining - line.quantity,
                justification,
              });
            }
          }

          if (line.quantity > 0) {
            conversionLines.push({
              workOrderItem,
              convertQuantity: line.quantity,
              line,
              itemIndex: i,
            });
          }
        }

        const memberId = input.memberId ?? workOrder.memberId;
        if (!memberId) {
          throw new ValidationError(
            [
              {
                path: "params.saleId",
                message: "Ordem de servico sem cliente vinculado",
              },
            ],
            "Cliente obrigatorio",
          );
        }
        await this.assertClientMember(
          tx,
          enterpriseId,
          memberId,
          status === "FINALIZADA" ? input.payments : undefined,
        );

        const vehiclesEnterprisesMembersId =
          this.resolveVehiclesEnterprisesMembersId(
            input.vehiclesEnterprisesMembersId,
            workOrder.vehiclesEnterprisesMembersId,
          );
        await this.assertVehiclesEnterprisesMember(
          tx,
          enterpriseId,
          vehiclesEnterprisesMembersId,
          memberId,
        );

        const orderNumber = await nextSaleOrderNumber(enterpriseId, tx);

        const seller = await this.resolveSaleSeller(
          auth,
          enterpriseId,
          input.sellerId,
          workOrder.sellerId,
        );

        const closingOrigin =
          status === "FINALIZADA"
            ? resolveSaleClosingOrigin(input.origin, gescomClient)
            : undefined;

        const memberSnapshot = mergeSaleMemberSnapshot(
          await this.buildSaleMemberSnapshot(tx, enterpriseId, memberId),
          normalizeSaleMemberOverrides(input.member),
        );
        if (!memberSnapshot.memberLegalName) {
          throw new ValidationError(
            [
              {
                path: "body.memberId",
                message: "Cliente sem nome legal",
              },
            ],
            "Cliente invalido",
          );
        }

        const serviceFields = buildSaleServiceFieldValues({
          ...input,
          type: "VENDA",
          modelService:
            input.modelService ?? workOrder.modelService ?? undefined,
          vehicleMileage:
            input.vehicleMileage ?? workOrder.vehicleMileage ?? undefined,
          observations:
            input.observations ?? workOrder.observations ?? undefined,
          defect: input.defect ?? workOrder.defect ?? undefined,
        });

        const [generatedSale] = await tx
          .insert(sales)
          .values({
            orderNumber,
            userId: operator.userId,
            userLegalName: operator.userLegalName,
            sellerId: seller.sellerId,
            sellerLegalName: seller.sellerLegalName,
            memberId,
            type: "VENDA",
            subTotal: "0",
            discountValuetems: dec(input.discountValuetems),
            valueAcresceItems: dec(input.valueAcresceItems),
            ...buildSaleFinancialAdjustmentValues(input),
            ...serviceFields,
            valueLiquid: "0",
            status,
            sourceBudgetSaleId: workOrder.sourceBudgetSaleId,
            sourceWorkOrderSaleId: workOrderSaleId,
            ...(closingOrigin !== undefined ? { origin: closingOrigin } : {}),
            completedionDate: status === "FINALIZADA" ? new Date() : null,
            vehiclesEnterprisesMembersId,
            enterprisesId: enterpriseId,
          })
          .returning();
        if (!generatedSale) {
          throw new Error("Falha ao gerar venda da ordem de servico");
        }

        await this.upsertSaleMember(tx, generatedSale.id, memberSnapshot);

        const conversionItemRows: {
          saleItemId: string;
          quantity: string;
        }[] = [];

        for (let i = 0; i < conversionLines.length; i++) {
          const { workOrderItem, convertQuantity, line, itemIndex } =
            conversionLines[i];
          const itemPath = `body.items.${itemIndex}`;
          const itemInput = await this.resolveConversionItemInput(
            tx,
            enterpriseId,
            workOrderItem,
            convertQuantity,
            itemPath,
            line,
          );

          // Estoque ja baixado na OS; apenas valida estrutura (sem saldo).
          await validateSaleItemStock(enterpriseId, itemInput, itemPath);

          const actor = await this.resolveItemActor(
            auth,
            enterpriseId,
            generatedSale,
          );

          await this.assertItemLineDiscountWithinMemberLimitForSeller(
            tx,
            enterpriseId,
            actor.sellerId,
            {
              quantity: itemInput.quantity,
              valueUnit: itemInput.valueUnit,
              valueDiscount: itemInput.valueDiscount,
            },
            `${itemPath}.valueDiscount`,
          );

          const priceSnapshot = this.priceSnapshotFromBudgetItem(workOrderItem);

          const [inserted] = await tx
            .insert(salesItems)
            .values({
              ...this.mapItemInputToInsert(
                generatedSale.id,
                itemInput,
                actor,
                this.resolveItemLaunchOrigin(itemInput.origin, gescomClient),
                priceSnapshot,
              ),
              sourceBudgetItemId: workOrderItem.sourceBudgetItemId,
              sourceWorkOrderItemId: workOrderItem.id,
              quantityConverted: formatQuantity(convertQuantity),
            })
            .returning();
          if (!inserted) {
            throw new Error("Falha ao incluir item na venda gerada da OS");
          }

          const nextConverted =
            decNum(workOrderItem.quantityConverted) + convertQuantity;
          const [updatedOsItem] = await tx
            .update(salesItems)
            .set({
              quantityConverted: formatQuantity(nextConverted),
              updatedAt: new Date(),
            })
            .where(eq(salesItems.id, workOrderItem.id))
            .returning({ id: salesItems.id });
          if (!updatedOsItem) {
            throw new Error(
              `Falha ao atualizar quantityConverted do item ${workOrderItem.id}`,
            );
          }

          workOrderItem.quantityConverted = formatQuantity(nextConverted);

          conversionItemRows.push({
            saleItemId: inserted.id,
            quantity: formatQuantity(convertQuantity),
          });
        }

        const totals = await this.recalculateSaleTotalsFromItems(
          tx,
          enterpriseId,
          generatedSale.id,
          generatedSale,
        );
        await this.assertSaleDiscountWithinMemberLimitForSeller(
          tx,
          enterpriseId,
          seller.sellerId,
          totals,
        );

        if (status === "FINALIZADA" && input.payments?.length) {
          const updatedSale = await this.getSaleRow(
            tx,
            enterpriseId,
            generatedSale.id,
          );
          if (!updatedSale) throw new Error("Falha ao recalcular venda gerada");
          await this.applyValueLiquidItemsHeader(tx, generatedSale.id);
          this.assertSalePaymentsMatchSale(
            updatedSale.valueLiquid,
            updatedSale.createdAt,
            input.payments,
          );
          await this.handleCreditSaleMemberStatusOnFinalize(
            tx,
            enterpriseId,
            memberId,
            input.payments,
          );
          await this.insertSalePayments(tx, generatedSale.id, input.payments);
          await this.recalculateSaleItemsCommission(
            tx,
            generatedSale.id,
            seller.sellerId,
            enterpriseId,
            input.payments,
          );
        }

        const updatedOsItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, workOrderSaleId));

        const computedOsStatus = this.computeBudgetStatus(updatedOsItems);

        await tx
          .update(sales)
          .set({
            status: computedOsStatus,
            completedionDate:
              computedOsStatus === "FINALIZADA" ? new Date() : null,
            userClosedServiceId:
              computedOsStatus === "FINALIZADA" ? operator.userId : null,
            updatedAt: new Date(),
          })
          .where(eq(sales.id, workOrderSaleId));

        const closureKind: SaleConversionClosureKind =
          computedOsStatus === "FINALIZADA" ? "TOTAL" : "PARCIAL";

        await this.insertSaleConversionAudit(tx, {
          enterprisesId: enterpriseId,
          typeConversion: "ORDEM_SERVICO-VENDA",
          workOrderSaleId,
          generatedSaleId: generatedSale.id,
          closureKind,
          userId: operator.userId,
          userLegalName: operator.userLegalName,
          items: conversionItemRows,
          unclosedItems: unclosedRows.map((row) => ({
            saleItemId: row.workOrderItemId,
            quantityNotConverted: row.quantityNotConverted,
            justification: row.justification,
          })),
        });

        return generatedSale.id;
      });

      const generatedRow = await this.getSaleRow(
        db,
        enterpriseId,
        generatedSaleId,
      );
      await recordCreateAudit({
        entityType: EntityTypes.SALES,
        entityId: generatedSaleId,
        after: toAuditRecord(generatedRow),
        ctx: { ...audit, enterpriseId },
      });
      const workOrderAfter = await this.getSaleRow(
        db,
        enterpriseId,
        workOrderSaleId,
      );
      await recordEntityAudit({
        entityType: EntityTypes.SALES,
        entityId: workOrderSaleId,
        action: "UPDATE",
        before: toAuditRecord(workOrderBefore),
        after: toAuditRecord(workOrderAfter),
        ctx: { ...audit, enterpriseId },
      });

      return this.getById(enterpriseId, generatedSaleId);
    } catch (err) {
      const conflict = mapSaleUniqueViolation(err);
      if (conflict) throw conflict;
      throw err;
    }
  }

  public async addItem(
    enterpriseId: string,
    saleId: string,
    auth: SaleAuthContext | null,
    input: CreateSaleItemInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    if (!auth?.userId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }

    let beforeRow!: typeof sales.$inferSelect;
    await db.transaction(async (tx) => {
      beforeRow = await this.getSaleRow(tx, enterpriseId, saleId);
      const sale = beforeRow;
      await this.assertSaleTypeAllowed(enterpriseId, sale.type);
      this.assertBudgetEditableForItems(sale);

      if (this.shouldMoveStock(sale)) {
        await this.assertVendaDoesNotAcceptService(
          sale.type,
          input.productTypeId,
          "body.productTypeId",
          { allowService: Boolean(sale.sourceWorkOrderSaleId) },
        );
        await assertSaleItemStockAvailable(tx, enterpriseId, input, "body");
      } else {
        await this.assertVendaDoesNotAcceptService(
          sale.type,
          input.productTypeId,
          "body.productTypeId",
          { allowService: Boolean(sale.sourceWorkOrderSaleId) },
        );
        await validateSaleItemStock(enterpriseId, input, "body");
      }

      await this.assertServiceItemDescription(
        input.productTypeId,
        input.description,
        "body.description",
      );
      await this.assertServiceItemTypeService(
        input.productTypeId,
        input.typeService,
        "body.typeService",
      );

      const actor = await this.resolveItemActor(
        auth,
        enterpriseId,
        sale,
        input.sellerId,
      );

      const { item: pricedItem, priceSnapshot } =
        await this.resolveSaleItemPricing(tx, input);

      await this.assertItemLineDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        actor.sellerId,
        {
          quantity: pricedItem.quantity,
          valueUnit: pricedItem.valueUnit,
          valueDiscount: pricedItem.valueDiscount,
        },
        "body.valueDiscount",
      );

      const [inserted] = await tx
        .insert(salesItems)
        .values(
          this.mapItemInputToInsert(
            saleId,
            pricedItem,
            actor,
            this.resolveItemLaunchOrigin(input.origin, gescomClient),
            priceSnapshot,
          ),
        )
        .returning();
      if (!inserted) throw new Error("Falha ao incluir item na venda");

      await this.insertItemMechanics(
        tx,
        enterpriseId,
        sale.type,
        inserted.id,
        input.mechanics,
        "body.mechanics",
      );

      if (this.shouldMoveStock(sale)) {
        await applySaleItemStockOut(tx, {
          enterpriseId,
          userId: auth.userId,
          saleId,
          orderNumber: sale.orderNumber,
          item: inserted,
        });
      }

      const updatedSale = await this.getSaleRow(tx, enterpriseId, saleId);
      const totals = await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        updatedSale,
      );
      await this.assertSaleDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        updatedSale.sellerId,
        totals,
      );
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }

  public async removeItem(
    enterpriseId: string,
    saleId: string,
    saleItemId: string,
    userId: string | null,
    audit: EntityAuditContext,
  ) {
    let beforeRow!: typeof sales.$inferSelect;
    await db.transaction(async (tx) => {
      beforeRow = await this.getSaleRow(tx, enterpriseId, saleId);
      const sale = beforeRow;
      await this.assertSaleTypeAllowed(enterpriseId, sale.type);
      this.assertBudgetEditableForItems(sale);

      const item = (
        await tx
          .select()
          .from(salesItems)
          .where(
            and(eq(salesItems.id, saleItemId), eq(salesItems.salesId, saleId)),
          )
          .limit(1)
      )[0];
      if (!item) {
        throw new NotFoundError(
          "Item da venda nao encontrado",
          "SALE_ITEM_NOT_FOUND",
        );
      }

      this.assertBudgetItemEditable(sale, item);

      if (this.shouldMoveStock(sale)) {
        await applySaleItemStockReturn(tx, {
          enterpriseId,
          userId,
          saleId,
          orderNumber: sale.orderNumber,
          item,
        });
      }

      await tx
        .delete(mechanicSalesItems)
        .where(eq(mechanicSalesItems.salesItemsId, saleItemId));

      await tx
        .delete(salesItems)
        .where(
          and(eq(salesItems.id, saleItemId), eq(salesItems.salesId, saleId)),
        );

      const updatedSale = await this.getSaleRow(tx, enterpriseId, saleId);
      const totals = await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        updatedSale,
      );
      await this.assertSaleDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        updatedSale.sellerId,
        totals,
      );
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }

  public async updateItem(
    enterpriseId: string,
    saleId: string,
    saleItemId: string,
    userId: string | null,
    input: PatchSaleItemInput,
    audit: EntityAuditContext,
  ) {
    let beforeRow!: typeof sales.$inferSelect;
    await db.transaction(async (tx) => {
      beforeRow = await this.getSaleRow(tx, enterpriseId, saleId);
      const sale = beforeRow;
      await this.assertSaleTypeAllowed(enterpriseId, sale.type);
      this.assertBudgetEditableForItems(sale);

      const existing = (
        await tx
          .select()
          .from(salesItems)
          .where(
            and(eq(salesItems.id, saleItemId), eq(salesItems.salesId, saleId)),
          )
          .limit(1)
      )[0];
      if (!existing) {
        throw new NotFoundError(
          "Item da venda nao encontrado",
          "SALE_ITEM_NOT_FOUND",
        );
      }

      const merged = this.mergeSaleItemPatch(existing, input);
      this.assertBudgetItemEditable(sale, existing, merged.quantity);

      await this.assertServiceItemDescription(
        merged.productTypeId,
        input.description,
        "body.description",
      );
      await this.assertServiceItemTypeService(
        merged.productTypeId,
        input.typeService,
        "body.typeService",
      );

      if (sale.type === "VENDA") {
        const existingTypeCode = await getProductTypeCode(
          existing.productTypeId,
        );
        const existingIsService =
          existingTypeCode != null && isServiceProductType(existingTypeCode);
        if (!existingIsService) {
          await this.assertVendaDoesNotAcceptService(
            sale.type,
            merged.productTypeId,
            "body.productTypeId",
            { allowService: Boolean(sale.sourceWorkOrderSaleId) },
          );
        }
      }

      const { item: pricedItem, priceSnapshot } =
        await this.resolveSaleItemPricing(tx, merged);

      await this.assertItemLineDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        existing.sellerId,
        {
          quantity: pricedItem.quantity,
          valueUnit: pricedItem.valueUnit,
          valueDiscount: pricedItem.valueDiscount,
        },
        "body.valueDiscount",
      );

      if (this.shouldMoveStock(sale)) {
        await syncSaleItemStockOnUpdate(tx, {
          enterpriseId,
          userId,
          saleId,
          orderNumber: sale.orderNumber,
          oldItem: existing,
          newItem: pricedItem,
        });
      } else {
        await validateSaleItemStock(enterpriseId, pricedItem, "body");
      }

      await tx
        .update(salesItems)
        .set({
          quantity: pricedItem.quantity.toString(),
          valueUnit: pricedItem.valueUnit.toString(),
          valueDiscount: pricedItem.valueDiscount.toString(),
          valueAcresce: pricedItem.valueAcresce.toString(),
          valueTotal: pricedItem.valueTotal.toString(),
          productsEnterprisesId: pricedItem.productsEnterprisesId,
          unitid: pricedItem.unitId,
          productTypeId: pricedItem.productTypeId,
          stockSectorId: pricedItem.stockSectorId ?? null,
          stockLocationId: pricedItem.stockLocationId ?? null,
          stockBatchId: pricedItem.stockBatchId ?? null,
          description: pricedItem.description ?? null,
          ...(pricedItem.typeService !== undefined
            ? { typeService: pricedItem.typeService }
            : {}),
          priceSale: priceSnapshot?.priceSale ?? existing.priceSale,
          promotionalPriceId: priceSnapshot?.promotionalPriceId ?? null,
          averageCost: priceSnapshot?.averageCost ?? existing.averageCost,
          actualRealCost:
            priceSnapshot?.actualRealCost ?? existing.actualRealCost,
          priceCost: priceSnapshot?.priceCost ?? existing.priceCost,
          updatedAt: new Date(),
        })
        .where(
          and(eq(salesItems.id, saleItemId), eq(salesItems.salesId, saleId)),
        );

      const updatedSale = await this.getSaleRow(tx, enterpriseId, saleId);
      const totals = await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        updatedSale,
      );
      await this.assertSaleDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        updatedSale.sellerId,
        totals,
      );
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }
}

export const salesService = new SalesService();
