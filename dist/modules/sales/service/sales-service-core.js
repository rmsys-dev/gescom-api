import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, ne, notInArray, or, sql, } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { enterprisesMembers, measurementUnits, mechanicSalesItems, paymentTypes, productTypes, productsEnterprises, promotionalPrices, sales, saleConversionItems, saleConversions, saleUnclosedItems, salesDues, salesItems, salesMembers, salesPayments, salesReturns, stockBatches, locations, sectors, users, usersAddress, usersContact, vehicles, vehiclesEnterprisesMembers, } from "../../../db/schema.js";
import { ceps, cities, states } from "../../../db/entities/addresses.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError, } from "../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import { recordCreateAudit, recordEntityAudit, } from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { getProductTypeCode, isServiceProductType, PRODUCT_TYPE_SERVICE_CODE, } from "../../../shared/products/product-type-service.js";
import { applyPromotionalUnitPrice, resolveEffectiveSalePrice, } from "../../../shared/products/resolve-sale-price.js";
import { PERM } from "../../auth/default-permissions.js";
import { isAllowed, resolvePermissions } from "../../auth/permissions.js";
import { assertEnterpriseParameter, isEnterpriseParameterEnabled, resolveEnterpriseParameters, } from "../../enterprises/parameters/resolve.js";
import { enterprisesService } from "../../enterprises/service.js";
import { htmlToPdf } from "../print/html-to-pdf.js";
import { budgetPdfFilename, renderBudgetPrintHtml, renderSalePrintHtml, renderWorkOrderPrintHtml, salePdfFilename, workOrderPdfFilename, } from "../print/os-print-html.js";
import { getProductEnterpriseForStock, resolveDefaultSaleItemStockRefs, } from "../../stock/balance.js";
import { productRequiresStockLocation } from "../../stock/stock-location.js";
import { assertSaleOrderNumberAvailable, nextSaleOrderNumber, syncSaleOrderSequenceFloor, } from "../sequences.js";
import { applySaleItemStockOut, applySaleItemStockReturn, assertSaleItemStockAvailable, assertSaleItemsStockCommitted, validateSaleItemStock, } from "../sale-stock.js";
import { resolveSaleClosingOrigin } from "../sale-origin.js";
import { allocateValueLiquidItemsHeader } from "../sale-item-liquid.js";
import { effectiveCompletionDateSql } from "../analytics/scope.js";
import { computeItemValueTotal, } from "../schema.js";
const POST_SALES_STATUS_TO_APPLY = [
    "INATIVO",
    "BLOQUEADO",
    "FUNCIONARIO",
];
const CREDIT_SALE_ALLOWED_MEMBER_STATUSES = [
    "ATIVO",
    "ESPECIAL",
    "FUNCIONARIO",
];
const dec = (v) => v !== undefined && v !== null ? v.toString() : null;
const decNum = (v) => v !== undefined && v !== null && v !== "" ? Number(v) : 0;
const formatQuantity = (value) => value.toFixed(4);
const moneyCents = (value) => Math.round(value * 100);
const roundMoney = (value) => Math.round(value * 100) / 100;
/** Formata percentual 0–100 para numeric(6,2). */
const decPercentage = (v) => v !== undefined && v !== null ? roundMoney(v).toFixed(2) : null;
const hasStoredPercentage = (value) => value !== null && value !== undefined && value !== "";
const computeFinancialFromPercentage = (subTotal, percentage) => roundMoney((subTotal * percentage) / 100);
const computePercentageFromFinancial = (subTotal, value) => subTotal > 0 ? roundMoney((value / subTotal) * 100) : 0;
/** Diferença máxima entre % derivado e valor em R$ (arredondamento de centavos). */
const FINANCIAL_ROUNDING_TOLERANCE = 0.02;
const resolveAdjustmentFinancial = (subTotal, percentage, storedValue) => {
    const stored = decNum(storedValue);
    if (hasStoredPercentage(percentage)) {
        const pct = decNum(percentage);
        const fromPct = computeFinancialFromPercentage(subTotal, pct);
        if (stored > 0 &&
            Math.abs(stored - fromPct) <= FINANCIAL_ROUNDING_TOLERANCE) {
            return { value: stored, percentage: null };
        }
        return { value: fromPct, percentage };
    }
    return {
        value: stored,
        percentage: null,
    };
};
const resolveFinancialAdjustmentsByCategory = (sale, valueProduct, valueService) => {
    const discountProduct = resolveAdjustmentFinancial(valueProduct, sale.percentageDiscountProduct, sale.valueDiscountFinancialProduct);
    const discountService = resolveAdjustmentFinancial(valueService, sale.percentageDiscountService, sale.valueDiscountFinancialService);
    const acresceProduct = resolveAdjustmentFinancial(valueProduct, sale.percentageAcresceProduct, sale.valueAcresceFinancialProduct);
    const acresceService = resolveAdjustmentFinancial(valueService, sale.percentageAcresceService, sale.valueAcresceFinancialService);
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
const buildSaleFinancialAdjustmentValues = (input) => {
    const patch = {};
    const pairs = [
        {
            pct: "percentageDiscountProduct",
            val: "valueDiscountFinancialProduct",
        },
        {
            pct: "percentageDiscountService",
            val: "valueDiscountFinancialService",
        },
        {
            pct: "percentageAcresceProduct",
            val: "valueAcresceFinancialProduct",
        },
        {
            pct: "percentageAcresceService",
            val: "valueAcresceFinancialService",
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
const buildSaleServiceFieldValues = (input) => {
    const patch = {};
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
    }
    else if (input.type === "ORDEM DE SERVICO") {
        patch.modelService = "VEICULO";
    }
    return patch;
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
];
const normalizeSaleMemberOverrides = (input) => {
    if (!input) {
        return {};
    }
    const result = {};
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
const mergeSaleMemberSnapshot = (base, overrides) => {
    if (!overrides) {
        return { ...base };
    }
    const result = { ...base };
    for (const key of SALE_MEMBER_SNAPSHOT_KEYS) {
        if (overrides[key] !== undefined) {
            result[key] = overrides[key];
        }
    }
    return result;
};
const formatSaleMemberAddressLine = (street, number) => {
    const parts = [street.trim(), number.trim()].filter((part) => part.length > 0);
    return parts.join(", ");
};
const getPostgresConstraintName = (err) => {
    let current = err;
    for (let depth = 0; depth < 4 && current != null; depth++) {
        if (typeof current === "object" &&
            "constraint_name" in current &&
            typeof current.constraint_name ===
                "string") {
            return current.constraint_name;
        }
        if (typeof current === "object" &&
            "constraint" in current &&
            typeof current.constraint === "string") {
            return current.constraint;
        }
        current =
            typeof current === "object" && current !== null && "cause" in current
                ? current.cause
                : undefined;
    }
    return undefined;
};
const mapSaleUniqueViolation = (err) => {
    if (!isPostgresUniqueViolation(err))
        return null;
    const constraint = getPostgresConstraintName(err);
    if (constraint === "sales_payments_sales_id_payment_type_id_unique") {
        return new ConflictError("Tipo de pagamento duplicado na mesma venda", "SALE_PAYMENT_TYPE_DUPLICATE");
    }
    if (constraint === "sales_dues_sales_payment_id_due_date_unique") {
        return new ConflictError("Data de vencimento duplicada para o mesmo pagamento", "SALE_DUE_DATE_DUPLICATE");
    }
    return new ConflictError("Venda em conflito (numero do pedido)", "SALE_CONFLICT");
};
/** Chave YYYY-MM-DD (UTC) para comparar vencimentos sem repetir o mesmo dia. */
const toUtcDateKey = (date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};
const SELLER_INELIGIBLE_MEMBER_CLASSES = ["CLIENTE", "FORNECEDOR"];
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
export class SalesServiceCore {
    // Servico de vendas
    async recordSaleUpdateAudit(enterpriseId, saleId, before, ctx) {
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
    async isTrabalhaOsEnabled(enterpriseId) {
        const parameters = await resolveEnterpriseParameters(enterpriseId);
        return isEnterpriseParameterEnabled(parameters, "trabalha_os");
    }
    async assertTrabalhaOsEnabled(enterpriseId) {
        const parameters = await resolveEnterpriseParameters(enterpriseId);
        assertEnterpriseParameter({ parameters }, "trabalha_os");
    }
    async assertSaleTypeAllowed(enterpriseId, saleType) {
        if (saleType === "ORDEM DE SERVICO") {
            await this.assertTrabalhaOsEnabled(enterpriseId);
        }
    }
    async assertOsQueryAllowed(enterpriseId, query = {}) {
        const osEnabled = await this.isTrabalhaOsEnabled(enterpriseId);
        if (!osEnabled &&
            (query.type === "ORDEM DE SERVICO" ||
                query.vehiclesEnterprisesMembersId !== undefined)) {
            await this.assertTrabalhaOsEnabled(enterpriseId);
        }
        return osEnabled;
    }
    scope(enterpriseId, id) {
        // Scope para buscar vendas
        const base = [eq(sales.enterprisesId, enterpriseId)];
        if (id)
            base.push(eq(sales.id, id));
        return and(...base);
    }
    listScope(enterpriseId, query, options) {
        const filters = [eq(sales.enterprisesId, enterpriseId)];
        if (query?.type) {
            filters.push(eq(sales.type, query.type));
        }
        else if (options?.excludeWorkOrders) {
            filters.push(ne(sales.type, "ORDEM DE SERVICO"));
        }
        if (query?.status) {
            filters.push(eq(sales.status, query.status));
        }
        if (query?.sellerId) {
            filters.push(or(eq(sales.sellerId, query.sellerId), eq(sales.userId, query.sellerId)));
        }
        if (query?.orderNumber !== undefined) {
            filters.push(eq(sales.orderNumber, query.orderNumber));
        }
        if (query?.seller) {
            filters.push(ilike(sales.sellerLegalName, `%${query.seller}%`));
        }
        if (query?.client) {
            filters.push(or(ilike(users.userName, `%${query.client}%`), ilike(salesMembers.memberLegalName, `%${query.client}%`)));
        }
        if (query?.memberId) {
            filters.push(eq(sales.memberId, query.memberId));
        }
        if (query?.vehiclesEnterprisesMembersId) {
            filters.push(eq(sales.vehiclesEnterprisesMembersId, query.vehiclesEnterprisesMembersId));
        }
        if (query?.dateFrom && query?.dateTo) {
            // completedionDate quando houver; senão createdAt (orçamentos/vendas abertos).
            const timezone = "America/Sao_Paulo";
            const effective = effectiveCompletionDateSql(timezone);
            filters.push(and(gte(effective, sql `${query.dateFrom}::date`), lte(effective, sql `${query.dateTo}::date`)));
        }
        return and(...filters);
    }
    listFromWithMemberJoins() {
        return db
            .select(saleWithMemberSelect)
            .from(sales)
            .leftJoin(enterprisesMembers, eq(sales.memberId, enterprisesMembers.id))
            .leftJoin(users, eq(enterprisesMembers.userId, users.id))
            .leftJoin(salesMembers, eq(salesMembers.salesId, sales.id));
    }
    listCountFromWithMemberJoins() {
        return db
            .select({ c: count() })
            .from(sales)
            .leftJoin(enterprisesMembers, eq(sales.memberId, enterprisesMembers.id))
            .leftJoin(users, eq(enterprisesMembers.userId, users.id))
            .leftJoin(salesMembers, eq(salesMembers.salesId, sales.id));
    }
    mapSaleItemResponse(item, product) {
        const quantity = decNum(item.quantity);
        const quantityConverted = decNum(item.quantityConverted);
        const customDescription = item.description?.trim() || null;
        return {
            ...item,
            description: customDescription,
            quantityConverted: item.quantityConverted,
            quantityRemaining: Math.max(0, quantity - quantityConverted),
            productDescription: customDescription ?? product?.productDescription ?? null,
            productCode: product?.productCode ?? null,
        };
    }
    nullableById(row) {
        if (!row?.id)
            return null;
        return row;
    }
    async loadSaleItems(saleId) {
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
            sector: {
                id: sectors.id,
                description: sectors.description,
            },
            location: {
                id: locations.id,
                box: locations.box,
                description: locations.description,
                status: locations.status,
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
            .innerJoin(productsEnterprises, eq(salesItems.productsEnterprisesId, productsEnterprises.id))
            .innerJoin(measurementUnits, eq(salesItems.unitid, measurementUnits.id))
            .innerJoin(productTypes, eq(salesItems.productTypeId, productTypes.id))
            .leftJoin(sectors, eq(salesItems.sectorId, sectors.id))
            .leftJoin(locations, eq(salesItems.locationsId, locations.id))
            .leftJoin(stockBatches, eq(salesItems.stockBatchId, stockBatches.id))
            .leftJoin(promotionalPrices, eq(salesItems.promotionalPriceId, promotionalPrices.id))
            .where(eq(salesItems.salesId, saleId));
        const itemIds = rows.map(({ item }) => item.id);
        const mechanicsRows = itemIds.length > 0
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
                .innerJoin(enterprisesMembers, eq(mechanicSalesItems.mechanic, enterprisesMembers.id))
                .innerJoin(users, eq(enterprisesMembers.userId, users.id))
                .where(inArray(mechanicSalesItems.salesItemsId, itemIds))
                .orderBy(asc(mechanicSalesItems.id))
            : [];
        const mechanicsByItemId = new Map();
        for (const row of mechanicsRows) {
            const list = mechanicsByItemId.get(row.salesItemsId) ?? [];
            list.push(row);
            mechanicsByItemId.set(row.salesItemsId, list);
        }
        return rows.map(({ item, productsEnterprises: pe, unit, productType, sector, location, stockBatch, promotionalPrice, }) => ({
            ...this.mapSaleItemResponse(item, {
                productDescription: pe.description,
                productCode: pe.code,
            }),
            user: { id: item.userId, userName: item.userLegalName },
            seller: { id: item.sellerId, userName: item.sellerLegalName },
            productsEnterprises: pe,
            unit,
            productType,
            sector: this.nullableById(sector),
            location: this.nullableById(location),
            stockBatch: this.nullableById(stockBatch),
            promotionalPrice: this.nullableById(promotionalPrice),
            mechanics: mechanicsByItemId.get(item.id) ?? [],
        }));
    }
    async loadSaleVehicleLink(enterpriseId, vehiclesEnterprisesMembersId) {
        if (!vehiclesEnterprisesMembersId)
            return null;
        const row = (await db
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
            vehicleType: vehicles.vehicleType,
            bodyType: vehicles.bodyType,
            axleType: vehicles.axleType,
            capacityKg: vehicles.capacityKg,
            capacityM3: vehicles.capacityM3,
            tareWeight: vehicles.tareWeight,
            rntrcCode: vehicles.rntrcCode,
            entireCode: vehicles.entireCode,
            ownerType: vehicles.ownerType,
            location: vehicles.location,
            ipvaPaymentMonth: vehicles.ipvaPaymentMonth,
            refuelingMileage: vehicles.refuelingMileage,
            licensingStateId: vehicles.licensingStateId,
            licensingStateAcronym: states.acronym,
            licensingStateName: states.description,
        })
            .from(vehiclesEnterprisesMembers)
            .innerJoin(enterprisesMembers, eq(vehiclesEnterprisesMembers.enterprisesMembersId, enterprisesMembers.id))
            .innerJoin(vehicles, eq(vehiclesEnterprisesMembers.vehiclesId, vehicles.id))
            .leftJoin(states, eq(vehicles.licensingStateId, states.id))
            .where(and(eq(vehiclesEnterprisesMembers.id, vehiclesEnterprisesMembersId), eq(enterprisesMembers.enterpriseId, enterpriseId)))
            .limit(1))[0];
        return row ?? null;
    }
    async loadUsersByIds(userIds) {
        const ids = [...new Set(userIds.filter((id) => !!id))];
        if (ids.length === 0)
            return new Map();
        const rows = await db
            .select({
            id: users.id,
            userName: users.userName,
        })
            .from(users)
            .where(inArray(users.id, ids));
        return new Map(rows.map((row) => [row.id, row]));
    }
    async loadPaymentTypesByIds(paymentTypeIds) {
        if (paymentTypeIds.length === 0) {
            return new Map();
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
    async loadSalePaymentsBySaleIds(saleIds) {
        const paymentsBySaleId = new Map();
        for (const saleId of saleIds) {
            paymentsBySaleId.set(saleId, []);
        }
        if (saleIds.length === 0)
            return paymentsBySaleId;
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
            this.loadPaymentTypesByIds(payments.map((payment) => payment.paymentTypeId)),
        ]);
        const duesByPaymentId = new Map();
        for (const due of allDues) {
            const dues = duesByPaymentId.get(due.salesPaymentId) ?? [];
            dues.push(due);
            duesByPaymentId.set(due.salesPaymentId, dues);
        }
        for (const payment of payments) {
            const mapped = {
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
    async assertMechanicMember(tx, enterpriseId, enterprisesMembersId, path) {
        const row = (await tx
            .select({ id: enterprisesMembers.id })
            .from(enterprisesMembers)
            .where(and(eq(enterprisesMembers.id, enterprisesMembersId), eq(enterprisesMembers.enterpriseId, enterpriseId), eq(enterprisesMembers.status, "ATIVO"), isNull(enterprisesMembers.deletedAt)))
            .limit(1))[0];
        if (!row) {
            throw new ValidationError([
                {
                    path,
                    message: "Mecanico nao encontrado na empresa",
                },
            ], "Mecanico invalido");
        }
    }
    async insertItemMechanics(tx, enterpriseId, saleType, salesItemsId, mechanics, pathPrefix) {
        if (!mechanics?.length)
            return;
        if (saleType !== "ORDEM DE SERVICO") {
            throw new ValidationError([
                {
                    path: pathPrefix,
                    message: "mechanics so pode ser informado em ORDEM DE SERVICO; omita o campo",
                },
            ], "Campo invalido");
        }
        for (let i = 0; i < mechanics.length; i++) {
            const mechanic = mechanics[i];
            await this.assertMechanicMember(tx, enterpriseId, mechanic.mechanic, `${pathPrefix}.${i}.mechanic`);
            try {
                await tx.insert(mechanicSalesItems).values({
                    mechanic: mechanic.mechanic,
                    salesItemsId,
                    ...(mechanic.comissionService !== undefined
                        ? { comissionService: mechanic.comissionService.toString() }
                        : {}),
                });
            }
            catch (err) {
                if (isPostgresUniqueViolation(err)) {
                    throw new ConflictError("Ja existe comissao para este mecanico e item de venda", "MECHANIC_SALE_ITEM_COMMISSION_CONFLICT");
                }
                throw err;
            }
        }
    }
    computeBudgetStatus(items) {
        if (items.length === 0)
            return "ABERTA";
        let anyConverted = false;
        let allFullyConverted = true;
        for (const item of items) {
            const qty = decNum(item.quantity);
            const converted = decNum(item.quantityConverted);
            if (converted > 0)
                anyConverted = true;
            if (converted + 1e-9 < qty)
                allFullyConverted = false;
        }
        if (allFullyConverted)
            return "FINALIZADA";
        if (anyConverted)
            return "PARCIAL";
        return "ABERTA";
    }
    async insertSaleConversionAudit(tx, input) {
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
        if (!conversion)
            throw new Error("Falha ao registrar conversao");
        if (input.items.length > 0) {
            await tx.insert(saleConversionItems).values(input.items.map((row) => ({
                saleConversionId: conversion.id,
                saleItemId: row.saleItemId,
                quantity: row.quantity,
            })));
        }
        if (input.unclosedItems.length > 0) {
            await tx.insert(saleUnclosedItems).values(input.unclosedItems.map((row) => ({
                saleConversionId: conversion.id,
                saleItemId: row.saleItemId,
                quantityNotConverted: row.quantityNotConverted.toString(),
                justification: row.justification,
                userId: input.userId,
                userLegalName: input.userLegalName,
            })));
        }
    }
    assertBudgetOpenForConversion(budget) {
        // Verifica se o orcamento esta aberto para conversao
        if (budget.type !== "ORCAMENTO") {
            throw new ValidationError([
                {
                    path: "params.saleId",
                    message: "Somente orcamentos podem ser convertidos",
                },
            ], "Tipo invalido");
        }
        if (budget.status === "CANCELADA") {
            throw new ValidationError([
                {
                    path: "params.saleId",
                    message: "Orcamento cancelado nao pode ser convertido",
                },
            ], "Orcamento cancelado");
        }
        if (budget.status === "FINALIZADA") {
            throw new ValidationError([
                {
                    path: "params.saleId",
                    message: "Orcamento ja foi totalmente convertido em vendas",
                },
            ], "Orcamento fechado");
        }
    }
    /** VENDA e ORDEM DE SERVICO compartilham sequência e movimentam estoque de peças. */
    movesInventory(saleType) {
        return saleType === "VENDA" || saleType === "ORDEM DE SERVICO";
    }
    /**
     * Venda gerada a partir de OS já teve baixa na OS; não movimenta estoque de novo.
     */
    shouldMoveStock(sale) {
        if (sale.sourceWorkOrderSaleId)
            return false;
        return this.movesInventory(sale.type);
    }
    async documentHasServiceItem(items) {
        for (const item of items) {
            const typeCode = await getProductTypeCode(item.productTypeId);
            if (typeCode && isServiceProductType(typeCode))
                return true;
        }
        return false;
    }
    async assertVendaDoesNotAcceptService(saleType, productTypeId, path, options) {
        if (options?.allowService)
            return;
        if (saleType !== "VENDA")
            return;
        const typeCode = await getProductTypeCode(productTypeId);
        if (typeCode && isServiceProductType(typeCode)) {
            throw new ValidationError([
                {
                    path,
                    message: "Venda nao aceita produto do tipo servico (09). Use type ORDEM DE SERVICO.",
                },
            ], "Produto servico nao permitido em venda");
        }
    }
    /** Descrição livre do item só é permitida em produto tipo serviço (09). */
    async assertServiceItemDescription(productTypeId, description, path) {
        if (description === undefined || description === null)
            return;
        const typeCode = await getProductTypeCode(productTypeId);
        if (!typeCode || !isServiceProductType(typeCode)) {
            throw new ValidationError([
                {
                    path,
                    message: "Descricao livre so e permitida em item de servico",
                },
            ], "Descricao invalida");
        }
    }
    /** typeService (PROPRIO/OUTROS) só é permitido em produto tipo serviço (09). */
    async assertServiceItemTypeService(productTypeId, typeService, path) {
        if (typeService === undefined)
            return;
        const typeCode = await getProductTypeCode(productTypeId);
        if (!typeCode || !isServiceProductType(typeCode)) {
            throw new ValidationError([
                {
                    path,
                    message: "typeService (PROPRIO/OUTROS) so e permitido em item de servico",
                },
            ], "Tipo de servico invalido");
        }
    }
    assertBudgetEditableForItems(budget) {
        // Verifica se o orcamento/OS esta aberto para alterar itens
        this.assertSaleOpenForItems(budget);
        if ((budget.type === "ORCAMENTO" || budget.type === "ORDEM DE SERVICO") &&
            budget.status === "FINALIZADA") {
            throw new ValidationError([
                {
                    path: "params.saleId",
                    message: budget.type === "ORCAMENTO"
                        ? "Orcamento fechado nao permite alterar itens"
                        : "Ordem de servico fechada nao permite alterar itens",
                },
            ], "Documento fechado");
        }
    }
    assertBudgetItemEditable(
    // Verifica se o item do orcamento/OS esta aberto para alterar
    budget, item, nextQuantity) {
        if (budget.type !== "ORCAMENTO" && budget.type !== "ORDEM DE SERVICO") {
            return;
        }
        const converted = decNum(item.quantityConverted);
        if (converted > 0 && nextQuantity === undefined) {
            throw new ValidationError([
                {
                    path: "params.saleItemId",
                    message: "Item com quantidade convertida nao pode ser removido",
                },
            ], "Item convertido");
        }
        if (nextQuantity !== undefined && nextQuantity < converted) {
            throw new ValidationError([
                {
                    path: "body.quantity",
                    message: `Quantidade nao pode ser menor que ${converted} (ja convertida)`,
                },
            ], "Quantidade invalida");
        }
    }
    assertOsOpenForConversion(workOrder) {
        if (workOrder.type !== "ORDEM DE SERVICO") {
            throw new ValidationError([
                {
                    path: "params.saleId",
                    message: "Somente ordens de servico podem ser convertidas em venda",
                },
            ], "Tipo invalido");
        }
        if (workOrder.status === "CANCELADA") {
            throw new ValidationError([
                {
                    path: "params.saleId",
                    message: "Ordem de servico cancelada nao pode ser convertida",
                },
            ], "Ordem de servico cancelada");
        }
        if (workOrder.status === "FINALIZADA") {
            throw new ValidationError([
                {
                    path: "params.saleId",
                    message: "Ordem de servico ja foi totalmente convertida em venda",
                },
            ], "Ordem de servico fechada");
        }
    }
    prorateItemFinancials(budgetItem, convertQuantity, itemPath) {
        const budgetQty = decNum(budgetItem.quantity);
        const ratio = convertQuantity / budgetQty;
        const valueUnit = decNum(budgetItem.valueUnit);
        const valueDiscount = roundMoney(decNum(budgetItem.valueDiscount) * ratio);
        const valueAcresce = roundMoney(decNum(budgetItem.valueAcresce) * ratio);
        const valueTotal = computeItemValueTotal(convertQuantity, valueUnit, valueDiscount, valueAcresce);
        return {
            quantity: convertQuantity,
            valueUnit,
            valueDiscount,
            valueAcresce,
            valueTotal,
            productsEnterprisesId: budgetItem.productsEnterprisesId,
            unitId: budgetItem.unitid,
            productTypeId: budgetItem.productTypeId,
            sectorId: budgetItem.sectorId ?? undefined,
            locationsId: budgetItem.locationsId ?? undefined,
            stockBatchId: budgetItem.stockBatchId ?? undefined,
            description: budgetItem.description ?? undefined,
            typeService: budgetItem.typeService ?? undefined,
        };
    }
    async resolveConversionItemInput(tx, enterpriseId, budgetItem, convertQuantity, itemPath, line) {
        const base = this.prorateItemFinancials(budgetItem, convertQuantity, itemPath);
        const typeCode = await getProductTypeCode(budgetItem.productTypeId);
        if (typeCode && isServiceProductType(typeCode)) {
            return base;
        }
        const pe = await getProductEnterpriseForStock(enterpriseId, budgetItem.productsEnterprisesId, tx);
        if (!productRequiresStockLocation(pe)) {
            return {
                ...base,
                sectorId: undefined,
                locationsId: undefined,
            };
        }
        let sectorId = line?.sectorId ?? budgetItem.sectorId ?? undefined;
        let locationsId = line?.locationsId ?? budgetItem.locationsId ?? undefined;
        let stockBatchId = line?.stockBatchId !== undefined
            ? (line.stockBatchId ?? undefined)
            : (budgetItem.stockBatchId ?? undefined);
        if (!sectorId || !locationsId) {
            const defaults = await resolveDefaultSaleItemStockRefs(enterpriseId, budgetItem.productsEnterprisesId, tx, itemPath);
            sectorId = sectorId ?? defaults.sectorId;
            locationsId = locationsId ?? defaults.locationsId;
            if (stockBatchId === undefined) {
                stockBatchId = defaults.stockBatchId ?? undefined;
            }
        }
        return {
            ...base,
            sectorId,
            locationsId,
            stockBatchId,
        };
    }
    async getSaleRow(
    // Obtem a venda pelo id
    tx, enterpriseId, saleId) {
        // Obtem a venda pelo id
        const row = (await tx
            .select()
            .from(sales)
            .where(this.scope(enterpriseId, saleId))
            .limit(1))[0];
        if (!row) {
            throw new NotFoundError("Venda nao encontrada", "SALE_NOT_FOUND");
        }
        return row;
    }
    assertSaleOpenForItems(sale) {
        // Verifica se a venda esta aberta para adicionar itens
        if (sale.status !== "ABERTA") {
            throw new ValidationError([
                {
                    path: "params.saleId",
                    message: "Somente vendas ABERTAS permitem alterar itens",
                },
            ], "Venda nao editavel");
        }
    }
    assertSalePaymentsMatchSale(
    // Verifica se o valor liquido da venda corresponde a soma dos pagamentos
    valueLiquid, saleCreatedAt, payments) {
        const issues = [];
        if (valueLiquid === null || valueLiquid === "") {
            issues.push({
                path: "body.valueLiquid",
                message: "Valor liquido da venda e obrigatorio para fechar com pagamentos",
            });
        }
        const liquidCents = moneyCents(typeof valueLiquid === "number" ? valueLiquid : decNum(valueLiquid));
        const saleDayKey = toUtcDateKey(saleCreatedAt);
        const paymentTypeIds = new Set();
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
            const dueDateKeys = new Set();
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
                        message: "Data de vencimento nao pode ser anterior a data de criacao da venda",
                    });
                }
            }
            if (duesSumCents !== moneyCents(payment.valueTotal)) {
                issues.push({
                    path: `${paymentPath}.dues`,
                    message: "Soma das parcelas deve ser igual ao valor total do pagamento",
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
    async insertSalePayments(
    // Insere os pagamentos na venda
    tx, saleId, payments) {
        for (const payment of payments) {
            const [pay] = await tx
                .insert(salesPayments)
                .values({
                valueTotal: payment.valueTotal.toString(),
                paymentTypeId: payment.paymentTypeId,
                salesId: saleId,
            })
                .returning();
            if (!pay)
                continue;
            await tx.insert(salesDues).values(payment.dues.map((due) => ({
                salesId: saleId,
                salesPaymentId: pay.id,
                valueInstallment: due.valueInstallment.toString(),
                dueDate: due.dueDate,
            })));
        }
    }
    async hasAPrazoPayment(tx, payments) {
        if (payments.length === 0)
            return false;
        const paymentTypeIds = payments.map((payment) => payment.paymentTypeId);
        const rows = await tx
            .select({ paymentType: paymentTypes.paymentType })
            .from(paymentTypes)
            .where(inArray(paymentTypes.id, paymentTypeIds));
        return rows.some((row) => row.paymentType === "A_PRAZO");
    }
    async assertMemberActiveForCreditSale(tx, enterpriseId, memberId) {
        const row = (await tx
            .select({ status: enterprisesMembers.status })
            .from(enterprisesMembers)
            .where(and(eq(enterprisesMembers.id, memberId), eq(enterprisesMembers.enterpriseId, enterpriseId), isNull(enterprisesMembers.deletedAt)))
            .limit(1))[0];
        if (!row ||
            !CREDIT_SALE_ALLOWED_MEMBER_STATUSES.includes(row.status)) {
            throw new ValidationError([
                {
                    path: "body.memberId",
                    message: "Cliente deve estar ATIVO, ESPECIAL ou FUNCIONARIO para venda a prazo",
                },
            ], "Cliente inelegivel para venda a prazo");
        }
    }
    async applyMemberPostSalesStatusAfterCreditSale(tx, enterpriseId, memberId, payments) {
        if (!(await this.hasAPrazoPayment(tx, payments)))
            return;
        const member = (await tx
            .select({
            postSalesStatus: enterprisesMembers.postSalesStatus,
        })
            .from(enterprisesMembers)
            .where(and(eq(enterprisesMembers.id, memberId), eq(enterprisesMembers.enterpriseId, enterpriseId), isNull(enterprisesMembers.deletedAt)))
            .limit(1))[0];
        if (!member)
            return;
        if (!POST_SALES_STATUS_TO_APPLY.includes(member.postSalesStatus)) {
            return;
        }
        await tx
            .update(enterprisesMembers)
            .set({
            status: member.postSalesStatus,
            updatedAt: new Date(),
        })
            .where(and(eq(enterprisesMembers.id, memberId), eq(enterprisesMembers.enterpriseId, enterpriseId), isNull(enterprisesMembers.deletedAt)));
    }
    async handleCreditSaleMemberStatusOnFinalize(tx, enterpriseId, memberId, payments) {
        if (!(await this.hasAPrazoPayment(tx, payments)))
            return;
        await this.assertMemberActiveForCreditSale(tx, enterpriseId, memberId);
        await this.applyMemberPostSalesStatusAfterCreditSale(tx, enterpriseId, memberId, payments);
    }
    async assertSaleHasNoPayments(tx, saleId) {
        // Verifica se a venda nao possui pagamentos cadastrados
        const existing = (await tx
            .select({ id: salesPayments.id })
            .from(salesPayments)
            .where(eq(salesPayments.salesId, saleId))
            .limit(1))[0];
        if (existing) {
            throw new ValidationError([
                {
                    path: "body.payments",
                    message: "Venda ja possui pagamentos cadastrados",
                },
            ], "Pagamentos ja informados");
        }
    }
    async resolveSaleItemPricing(tx, item, at = new Date()) {
        const effective = await resolveEffectiveSalePrice(item.productsEnterprisesId, at, tx);
        const promotionalPrice = effective.isPromotional && effective.effectivePrice !== null
            ? effective.effectivePrice
            : null;
        const { valueUnit, appliedPromotional } = applyPromotionalUnitPrice({
            valueUnit: item.valueUnit,
            tablePrice: effective.tablePrice,
            promotionalPrice,
        });
        const pricedItem = {
            ...item,
            valueUnit,
            valueTotal: computeItemValueTotal(item.quantity, valueUnit, item.valueDiscount, item.valueAcresce),
        };
        const hasAnyPrice = effective.tablePrice !== null ||
            effective.isPromotional ||
            effective.averageCost !== null ||
            effective.actualRealCost !== null ||
            effective.priceCost !== null;
        const priceSnapshot = hasAnyPrice
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
    priceSnapshotFromBudgetItem(budgetItem) {
        return {
            averageCost: budgetItem.averageCost,
            actualRealCost: budgetItem.actualRealCost,
            priceCost: budgetItem.priceCost,
            priceSale: budgetItem.priceSale,
            promotionalPriceId: budgetItem.promotionalPriceId,
        };
    }
    mapItemInputToInsert(saleId, item, actor, origin, priceSnapshot) {
        const valueTotal = computeItemValueTotal(item.quantity, item.valueUnit, item.valueDiscount, item.valueAcresce);
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
            sectorId: item.sectorId ?? null,
            locationsId: item.locationsId ?? null,
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
    async loadSellerMember(tx, enterpriseId, sellerUserId) {
        const row = (await tx
            .select({
            id: enterprisesMembers.id,
            saleLimit: enterprisesMembers.saleLimit,
            exceedDiscountSale: enterprisesMembers.exceedDiscountSale,
            comissionOnSight: enterprisesMembers.comissionOnSight,
            comissionToTerms: enterprisesMembers.comissionToTerms,
            comissionPartial: enterprisesMembers.comissionPartial,
        })
            .from(enterprisesMembers)
            .where(and(eq(enterprisesMembers.userId, sellerUserId), eq(enterprisesMembers.enterpriseId, enterpriseId), eq(enterprisesMembers.status, "ATIVO"), isNull(enterprisesMembers.deletedAt), notInArray(enterprisesMembers.class, [
            ...SELLER_INELIGIBLE_MEMBER_CLASSES,
        ])))
            .limit(1))[0];
        if (!row) {
            throw new ValidationError([
                {
                    path: "body.sellerId",
                    message: "Vendedor deve ser membro ativo da empresa (nao cliente ou fornecedor)",
                },
            ], "Vendedor invalido");
        }
        return row;
    }
    assertSaleDiscountWithinMemberLimit(member, totals, path = "body") {
        if (member.exceedDiscountSale)
            return;
        if (totals.subTotal <= 0)
            return;
        const totalDiscount = roundMoney(totals.discountValuetems +
            totals.valueDiscountFinancialProduct +
            totals.valueDiscountFinancialService);
        const effectivePct = computePercentageFromFinancial(totals.subTotal, totalDiscount);
        const limit = decNum(member.saleLimit);
        if (effectivePct > limit) {
            throw new ValidationError([
                {
                    path,
                    message: `Desconto total (itens + financeiro) de ${effectivePct}% excede o limite do vendedor (${limit}%)`,
                },
            ], "Desconto excede limite do membro");
        }
    }
    async assertSaleDiscountWithinMemberLimitForSeller(tx, enterpriseId, sellerUserId, totals, path = "body") {
        const member = await this.loadSellerMember(tx, enterpriseId, sellerUserId);
        this.assertSaleDiscountWithinMemberLimit(member, totals, path);
    }
    assertItemLineDiscountWithinMemberLimit(member, item, path = "body.valueDiscount") {
        if (member.exceedDiscountSale)
            return;
        const lineSubTotal = roundMoney(item.quantity * item.valueUnit);
        if (lineSubTotal <= 0)
            return;
        const linePct = computePercentageFromFinancial(lineSubTotal, item.valueDiscount);
        const limit = decNum(member.saleLimit);
        if (linePct > limit) {
            throw new ValidationError([
                {
                    path,
                    message: `Desconto do item (${linePct}%) excede o limite do vendedor (${limit}%)`,
                },
            ], "Desconto excede limite do membro");
        }
    }
    async assertItemLineDiscountWithinMemberLimitForSeller(tx, enterpriseId, sellerUserId, item, path = "body.valueDiscount") {
        const member = await this.loadSellerMember(tx, enterpriseId, sellerUserId);
        this.assertItemLineDiscountWithinMemberLimit(member, item, path);
    }
    resolveMemberCommissionRate(member, paymentKinds) {
        const uniqueKinds = new Set(paymentKinds);
        if (uniqueKinds.size === 1 && uniqueKinds.has("A_VISTA")) {
            return member.comissionOnSight;
        }
        if (uniqueKinds.size === 1 && uniqueKinds.has("A_PRAZO")) {
            return member.comissionToTerms;
        }
        return member.comissionPartial;
    }
    async applySaleItemsCommission(tx, saleId, rate) {
        await tx
            .update(salesItems)
            .set({
            PercentageComissionSeller: rate,
            PercentageComissionManager: "0.00",
            updatedAt: new Date(),
        })
            .where(eq(salesItems.salesId, saleId));
    }
    async recalculateSaleItemsCommission(tx, saleId, sellerUserId, enterpriseId, payments) {
        const member = await this.loadSellerMember(tx, enterpriseId, sellerUserId);
        const paymentTypeIds = payments.map((payment) => payment.paymentTypeId);
        const rows = await tx
            .select({ paymentType: paymentTypes.paymentType })
            .from(paymentTypes)
            .where(inArray(paymentTypes.id, paymentTypeIds));
        const rate = this.resolveMemberCommissionRate(member, rows.map((row) => row.paymentType));
        await this.applySaleItemsCommission(tx, saleId, rate);
    }
    resolveItemLaunchOrigin(itemOrigin, gescomClient) {
        return resolveSaleClosingOrigin(itemOrigin, gescomClient);
    }
    computeValueLiquid(valueProduct, valueService, sale) {
        return roundMoney(Math.max(0, valueProduct +
            valueService -
            decNum(sale.valueDiscountFinancialProduct) -
            decNum(sale.valueDiscountFinancialService) +
            decNum(sale.valueAcresceFinancialProduct) +
            decNum(sale.valueAcresceFinancialService)));
    }
    async recalculateSaleTotalsFromItems(
    // Recalcula os totais da venda a partir dos itens
    tx, enterpriseId, saleId, sale) {
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
        const subTotal = itemRows.reduce((sum, row) => sum + Number(row.quantity) * Number(row.valueUnit), 0);
        const discountValuetems = itemRows.reduce((sum, row) => sum + Number(row.valueDiscount), 0);
        const valueAcresceItems = itemRows.reduce((sum, row) => sum + Number(row.valueAcresce), 0);
        let valueProduct = 0;
        let valueService = 0;
        for (const row of itemRows) {
            const net = computeItemValueTotal(Number(row.quantity), Number(row.valueUnit), Number(row.valueDiscount), Number(row.valueAcresce));
            if (row.typeCode === PRODUCT_TYPE_SERVICE_CODE) {
                valueService += net;
            }
            else {
                valueProduct += net;
            }
        }
        valueProduct = roundMoney(valueProduct);
        valueService = roundMoney(valueService);
        const financial = resolveFinancialAdjustmentsByCategory(sale, valueProduct, valueService);
        const saleWithAggregates = {
            ...sale,
            discountValuetems: discountValuetems.toString(),
            valueAcresceItems: valueAcresceItems.toString(),
            valueDiscountFinancialProduct: financial.valueDiscountFinancialProduct.toString(),
            valueDiscountFinancialService: financial.valueDiscountFinancialService.toString(),
            valueAcresceFinancialProduct: financial.valueAcresceFinancialProduct.toString(),
            valueAcresceFinancialService: financial.valueAcresceFinancialService.toString(),
        };
        const valueLiquid = this.computeValueLiquid(valueProduct, valueService, saleWithAggregates);
        await tx
            .update(sales)
            .set({
            subTotal: subTotal.toString(),
            discountValuetems: discountValuetems.toString(),
            valueAcresceItems: valueAcresceItems.toString(),
            percentageDiscountProduct: financial.percentageDiscountProduct,
            valueDiscountFinancialProduct: financial.valueDiscountFinancialProduct.toString(),
            percentageDiscountService: financial.percentageDiscountService,
            valueDiscountFinancialService: financial.valueDiscountFinancialService.toString(),
            percentageAcresceProduct: financial.percentageAcresceProduct,
            valueAcresceFinancialProduct: financial.valueAcresceFinancialProduct.toString(),
            percentageAcresceService: financial.percentageAcresceService,
            valueAcresceFinancialService: financial.valueAcresceFinancialService.toString(),
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
    async applyValueLiquidItemsHeader(tx, saleId) {
        const sale = (await tx.select().from(sales).where(eq(sales.id, saleId)).limit(1))[0];
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
        const allocated = allocateValueLiquidItemsHeader(itemRows.map((row) => ({
            id: row.id,
            quantity: decNum(row.quantity),
            valueUnit: decNum(row.valueUnit),
            valueTotal: decNum(row.valueTotal),
            typeCode: row.typeCode,
        })), {
            subTotal: decNum(sale.subTotal),
            valueDiscountFinancial: decNum(sale.valueDiscountFinancialProduct) +
                decNum(sale.valueDiscountFinancialService),
            valueAcresceFinancial: decNum(sale.valueAcresceFinancialProduct) +
                decNum(sale.valueAcresceFinancialService),
        });
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
    mergeSaleItemPatch(existing, input) {
        const quantity = input.quantity !== undefined ? input.quantity : Number(existing.quantity);
        const valueUnit = input.valueUnit !== undefined
            ? input.valueUnit
            : Number(existing.valueUnit);
        const valueDiscount = input.valueDiscount !== undefined
            ? input.valueDiscount
            : Number(existing.valueDiscount);
        const valueAcresce = input.valueAcresce !== undefined
            ? input.valueAcresce
            : Number(existing.valueAcresce);
        const valueTotal = computeItemValueTotal(quantity, valueUnit, valueDiscount, valueAcresce);
        return {
            quantity,
            valueUnit,
            valueDiscount,
            valueAcresce,
            valueTotal,
            productsEnterprisesId: input.productsEnterprisesId ?? existing.productsEnterprisesId,
            unitId: input.unitId ?? existing.unitid,
            productTypeId: input.productTypeId ?? existing.productTypeId,
            sectorId: input.sectorId ?? existing.sectorId ?? undefined,
            locationsId: input.locationsId ?? existing.locationsId ?? undefined,
            stockBatchId: input.stockBatchId !== undefined
                ? (input.stockBatchId ?? undefined)
                : (existing.stockBatchId ?? undefined),
            description: input.description !== undefined
                ? input.description
                : (existing.description ?? undefined),
            typeService: input.typeService !== undefined
                ? input.typeService
                : (existing.typeService ?? undefined),
        };
    }
    async recalculateTotals(enterpriseId, saleId, audit) {
        let beforeRow;
        await db.transaction(async (tx) => {
            beforeRow = await this.getSaleRow(tx, enterpriseId, saleId);
            const sale = beforeRow;
            await this.assertSaleTypeAllowed(enterpriseId, sale.type);
            if (sale.status !== "ABERTA") {
                throw new ValidationError([
                    {
                        path: "params.saleId",
                        message: "Somente vendas ABERTAS permitem recalcular totais",
                    },
                ], "Venda nao editavel");
            }
            const totals = await this.recalculateSaleTotalsFromItems(tx, enterpriseId, saleId, sale);
            await this.assertSaleDiscountWithinMemberLimitForSeller(tx, enterpriseId, sale.sellerId, totals);
        });
        await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
        return this.getById(enterpriseId, saleId);
    }
    async resolveSeller(userId) {
        const row = (await db
            .select({ id: users.id, userName: users.userName })
            .from(users)
            .where(and(eq(users.id, userId), isNull(users.deletedAt)))
            .limit(1))[0];
        if (!row) {
            throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
        }
        return {
            userId: row.id,
            userLegalName: row.userName.trim(),
        };
    }
    async assertSellerInEnterprise(enterpriseId, sellerUserId) {
        const row = (await db
            .select({ id: enterprisesMembers.id })
            .from(enterprisesMembers)
            .where(and(eq(enterprisesMembers.userId, sellerUserId), eq(enterprisesMembers.enterpriseId, enterpriseId), eq(enterprisesMembers.status, "ATIVO"), isNull(enterprisesMembers.deletedAt), notInArray(enterprisesMembers.class, [
            ...SELLER_INELIGIBLE_MEMBER_CLASSES,
        ])))
            .limit(1))[0];
        if (!row) {
            throw new ValidationError([
                {
                    path: "body.sellerId",
                    message: "Vendedor deve ser membro ativo da empresa (nao cliente ou fornecedor)",
                },
            ], "Vendedor invalido");
        }
    }
    async assertCanAssignSeller(auth, sellerUserId) {
        if (sellerUserId === auth.userId)
            return;
        if (!auth.memberId) {
            throw new ForbiddenError("Sem permissao para atribuir outro vendedor", "PERMISSION_DENIED");
        }
        const resolved = await resolvePermissions(auth.memberId);
        if (!isAllowed(resolved, PERM.alterar_vendas)) {
            throw new ForbiddenError("Sem permissao para atribuir outro vendedor", "PERMISSION_DENIED");
        }
    }
    async resolveSaleSeller(auth, enterpriseId, requestedSellerId, defaultSellerId) {
        const sellerUserId = requestedSellerId ?? defaultSellerId ?? auth.userId;
        await this.assertCanAssignSeller(auth, sellerUserId);
        await this.assertSellerInEnterprise(enterpriseId, sellerUserId);
        const seller = await this.resolveSeller(sellerUserId);
        return {
            sellerId: seller.userId,
            sellerLegalName: seller.userLegalName,
        };
    }
    async resolveItemActor(auth, enterpriseId, sale, itemSellerId) {
        const operator = await this.resolveSeller(auth.userId);
        const seller = await this.resolveSaleSeller(auth, enterpriseId, itemSellerId, sale.sellerId);
        return {
            userId: operator.userId,
            userLegalName: operator.userLegalName,
            sellerId: seller.sellerId,
            sellerLegalName: seller.sellerLegalName,
        };
    }
    async assertClientMember(
    // Verifica se o cliente existe; status so em venda a prazo
    tx, enterpriseId, memberId, payments) {
        const row = (await tx
            .select({
            id: enterprisesMembers.id,
            status: enterprisesMembers.status,
        })
            .from(enterprisesMembers)
            .where(and(eq(enterprisesMembers.id, memberId), eq(enterprisesMembers.enterpriseId, enterpriseId), isNull(enterprisesMembers.deletedAt)))
            .limit(1))[0];
        if (!row) {
            throw new NotFoundError("Membro cliente nao encontrado na empresa", "SALE_CLIENT_MEMBER_NOT_FOUND");
        }
        const isCreditSale = payments !== undefined && (await this.hasAPrazoPayment(tx, payments));
        if (!isCreditSale)
            return;
        if (!CREDIT_SALE_ALLOWED_MEMBER_STATUSES.includes(row.status)) {
            throw new ValidationError([
                {
                    path: "body.memberId",
                    message: "Cliente deve estar ATIVO, ESPECIAL ou FUNCIONARIO para venda a prazo",
                },
            ], "Cliente inelegivel para venda a prazo");
        }
    }
    async assertVehiclesEnterprisesMember(tx, enterpriseId, vehiclesEnterprisesMembersId, memberId, path = "body.vehiclesEnterprisesMembersId") {
        const row = (await tx
            .select({
            id: vehiclesEnterprisesMembers.id,
            enterprisesMembersId: vehiclesEnterprisesMembers.enterprisesMembersId,
            status: vehiclesEnterprisesMembers.status,
        })
            .from(vehiclesEnterprisesMembers)
            .innerJoin(enterprisesMembers, eq(vehiclesEnterprisesMembers.enterprisesMembersId, enterprisesMembers.id))
            .where(and(eq(vehiclesEnterprisesMembers.id, vehiclesEnterprisesMembersId), eq(enterprisesMembers.enterpriseId, enterpriseId), isNull(enterprisesMembers.deletedAt)))
            .limit(1))[0];
        if (!row) {
            throw new ValidationError([
                {
                    path,
                    message: "Vinculo veiculo/membro nao encontrado na empresa",
                },
            ], "Veiculo invalido");
        }
        if (row.status !== "ATIVO") {
            throw new ValidationError([{ path, message: "Vinculo veiculo/membro esta inativo" }], "Veiculo invalido");
        }
        if (row.enterprisesMembersId !== memberId) {
            throw new ValidationError([
                {
                    path,
                    message: "Vinculo veiculo/membro deve pertencer ao mesmo cliente da venda",
                },
            ], "Veiculo invalido");
        }
    }
    resolveVehiclesEnterprisesMembersId(inputId, sourceId, path = "body.vehiclesEnterprisesMembersId", required = true) {
        const resolved = inputId ?? sourceId ?? undefined;
        if (!resolved) {
            if (!required)
                return null;
            throw new ValidationError([
                {
                    path,
                    message: "Informe vehiclesEnterprisesMembersId",
                },
            ], "Veiculo obrigatorio");
        }
        return resolved;
    }
    async buildSaleMemberSnapshot(tx, enterpriseId, memberId) {
        const memberRow = (await tx
            .select({
            userId: enterprisesMembers.userId,
            userName: users.userName,
            userRegistration: users.userRegistration,
        })
            .from(enterprisesMembers)
            .innerJoin(users, eq(enterprisesMembers.userId, users.id))
            .where(and(eq(enterprisesMembers.id, memberId), eq(enterprisesMembers.enterpriseId, enterpriseId), isNull(enterprisesMembers.deletedAt)))
            .limit(1))[0];
        if (!memberRow) {
            throw new NotFoundError("Membro cliente nao encontrado na empresa", "SALE_CLIENT_MEMBER_NOT_FOUND");
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
                .where(and(eq(usersAddress.userId, memberRow.userId), eq(usersAddress.adressType, "PRINCIPAL"), isNull(usersAddress.deletedAt), isNull(ceps.deletedAt), isNull(cities.deletedAt), isNull(states.deletedAt)))
                .limit(1)
                .then((rows) => rows[0]),
            tx
                .select({
                phone: usersContact.phone,
                whatsapp: usersContact.whatsapp,
            })
                .from(usersContact)
                .where(and(eq(usersContact.userId, memberRow.userId), eq(usersContact.type, "PRINCIPAL"), isNull(usersContact.deletedAt)))
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
            memberMobile: contactRow?.whatsapp?.trim() || contactRow?.phone?.trim() || null,
        };
    }
    async upsertSaleMember(tx, saleId, snapshot) {
        const existing = (await tx
            .select({ id: salesMembers.id })
            .from(salesMembers)
            .where(eq(salesMembers.salesId, saleId))
            .limit(1))[0];
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
    async loadSaleMemberSnapshot(executor, saleId) {
        return ((await executor
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
            .limit(1))[0] ?? null);
    }
    async syncSaleMemberSnapshot(tx, enterpriseId, saleId, memberId, options) {
        const base = options.rebuildFromMember
            ? await this.buildSaleMemberSnapshot(tx, enterpriseId, memberId)
            : ((await this.loadSaleMemberSnapshot(tx, saleId)) ??
                (await this.buildSaleMemberSnapshot(tx, enterpriseId, memberId)));
        const snapshot = mergeSaleMemberSnapshot(base, normalizeSaleMemberOverrides(options.overrides));
        await this.upsertSaleMember(tx, saleId, snapshot);
    }
    async loadSaleMember(saleId) {
        return ((await db
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
            .limit(1))[0] ?? null);
    }
    /** Snapshot de sales_members; se ausente, monta a partir do membro vinculado. */
    async loadSaleMemberDetail(enterpriseId, saleId, memberId) {
        const existing = await this.loadSaleMember(saleId);
        if (existing)
            return existing;
        const snapshot = await this.buildSaleMemberSnapshot(db, enterpriseId, memberId);
        return {
            id: null,
            salesId: saleId,
            ...snapshot,
            createdAt: null,
            updatedAt: null,
        };
    }
    async list(enterpriseId, query = {}) {
        const osEnabled = await this.assertOsQueryAllowed(enterpriseId, query);
        const { limit, offset } = resolveListPagination(query);
        const where = this.listScope(enterpriseId, query, {
            excludeWorkOrders: !osEnabled,
        });
        const [items, totalRows] = await Promise.all([
            this.listFromWithMemberJoins()
                .where(where)
                .orderBy(desc(sales.createdAt), asc(sales.id))
                .limit(limit)
                .offset(offset),
            this.listCountFromWithMemberJoins().where(where),
        ]);
        const total = Number(totalRows[0]?.c ?? 0);
        const paymentsBySaleId = await this.loadSalePaymentsBySaleIds(items.map((item) => item.id));
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
    async loadGeneratedSalesSummary(
    // Obtem o resumo das vendas/OS geradas a partir do orcamento
    enterpriseId, budgetSaleId) {
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
            .where(and(eq(sales.enterprisesId, enterpriseId), eq(sales.sourceBudgetSaleId, budgetSaleId)))
            .orderBy(asc(sales.createdAt), asc(sales.id));
    }
    async loadGeneratedSalesFromWorkOrder(enterpriseId, workOrderSaleId) {
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
            .where(and(eq(sales.enterprisesId, enterpriseId), eq(sales.sourceWorkOrderSaleId, workOrderSaleId), ne(sales.status, "CANCELADA")))
            .orderBy(asc(sales.createdAt), asc(sales.id));
    }
    async loadSourceDocumentSummary(enterpriseId, sourceSaleId) {
        const row = (await db
            .select({
            id: sales.id,
            orderNumber: sales.orderNumber,
            type: sales.type,
            status: sales.status,
        })
            .from(sales)
            .where(and(eq(sales.enterprisesId, enterpriseId), eq(sales.id, sourceSaleId)))
            .limit(1))[0];
        return row ?? null;
    }
    async loadSaleReturns(saleId) {
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
            .innerJoin(productsEnterprises, eq(salesItems.productsEnterprisesId, productsEnterprises.id))
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
                productDescription: row.saleItem.description?.trim() || row.saleItem.productDescription,
            },
            user: row.user,
        }));
    }
    /**
     * Carrega conversões vinculadas à venda (como orçamento/OS origem
     * ou como venda gerada), com itens convertidos e não convertidos em cascata.
     */
    async loadSaleConversionsCascade(enterpriseId, saleId, mode = "linked") {
        const linkFilter = mode === "source"
            ? or(eq(saleConversions.budgetSaleId, saleId), eq(saleConversions.workOrderSaleId, saleId))
            : or(eq(saleConversions.budgetSaleId, saleId), eq(saleConversions.workOrderSaleId, saleId), eq(saleConversions.generatedSaleId, saleId));
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
            items: conversionItems.filter((item) => item.saleConversionId === conversion.id),
            unclosedItems: unclosedItems.filter((item) => item.saleConversionId === conversion.id),
        }));
    }
    async getById(enterpriseId, id) {
        // Obtem a venda pelo id
        const sale = (await db
            .select(saleWithMemberSelect)
            .from(sales)
            .leftJoin(enterprisesMembers, eq(sales.memberId, enterprisesMembers.id))
            .leftJoin(users, eq(enterprisesMembers.userId, users.id))
            .where(this.scope(enterpriseId, id))
            .limit(1))[0];
        if (!sale) {
            throw new NotFoundError("Venda nao encontrada", "SALE_NOT_FOUND");
        }
        const osEnabled = await this.isTrabalhaOsEnabled(enterpriseId);
        if (sale.type === "ORDEM DE SERVICO") {
            await this.assertTrabalhaOsEnabled(enterpriseId);
        }
        const [items, paymentsBySaleId, member, returns, budgetConversions, vehicleLink, serviceUsers,] = await Promise.all([
            this.loadSaleItems(id),
            this.loadSalePaymentsBySaleIds([id]),
            this.loadSaleMemberDetail(enterpriseId, id, sale.memberId),
            this.loadSaleReturns(id),
            this.loadSaleConversionsCascade(enterpriseId, id, "linked"),
            this.loadSaleVehicleLink(enterpriseId, osEnabled ? sale.vehiclesEnterprisesMembersId : null),
            this.loadUsersByIds([
                sale.userId,
                sale.sellerId,
                sale.userModificationServiceId,
                sale.userClosedServiceId,
            ]),
        ]);
        const payments = paymentsBySaleId.get(id) ?? [];
        const generatedSalesRaw = sale.type === "ORCAMENTO"
            ? await this.loadGeneratedSalesSummary(enterpriseId, id)
            : sale.type === "ORDEM DE SERVICO"
                ? await this.loadGeneratedSalesFromWorkOrder(enterpriseId, id)
                : undefined;
        const generatedSales = generatedSalesRaw === undefined || osEnabled
            ? generatedSalesRaw
            : generatedSalesRaw.filter((row) => row.type !== "ORDEM DE SERVICO");
        const sourceBudget = sale.sourceBudgetSaleId !== null
            ? await this.loadSourceDocumentSummary(enterpriseId, sale.sourceBudgetSaleId)
            : undefined;
        const sourceWorkOrder = osEnabled && sale.sourceWorkOrderSaleId !== null
            ? await this.loadSourceDocumentSummary(enterpriseId, sale.sourceWorkOrderSaleId)
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
    async getPrintHtml(enterpriseId, saleId, mode = "html") {
        const sale = await this.getById(enterpriseId, saleId);
        if (sale.type !== "ORDEM DE SERVICO" &&
            sale.type !== "ORCAMENTO" &&
            sale.type !== "VENDA") {
            throw new ValidationError([
                {
                    path: "params.saleId",
                    message: "Impressão A4 disponível para Pedido de Venda, Orçamento ou Ordem de Serviço",
                },
            ], "Tipo invalido");
        }
        if (sale.type === "ORDEM DE SERVICO") {
            await this.assertTrabalhaOsEnabled(enterpriseId);
        }
        const enterprise = await enterprisesService.getById(enterpriseId);
        if (sale.type === "ORCAMENTO") {
            const html = renderBudgetPrintHtml({
                sale,
                enterprise,
                printedAt: new Date(),
                mode,
            });
            return {
                html,
                orderNumber: sale.orderNumber,
                filename: budgetPdfFilename(sale.orderNumber),
            };
        }
        if (sale.type === "VENDA") {
            const html = renderSalePrintHtml({
                sale,
                enterprise,
                printedAt: new Date(),
                mode,
            });
            return {
                html,
                orderNumber: sale.orderNumber,
                filename: salePdfFilename(sale.orderNumber),
            };
        }
        const generated = sale.generatedSales ?? [];
        let printSale = sale;
        if (!sale.payments?.length && generated.length > 0) {
            const paymentsBySaleId = await this.loadSalePaymentsBySaleIds(generated.map((row) => row.id));
            printSale = {
                ...sale,
                generatedSales: generated.map((row) => ({
                    ...row,
                    payments: paymentsBySaleId.get(row.id) ?? [],
                })),
            };
        }
        const html = renderWorkOrderPrintHtml({
            sale: printSale,
            enterprise,
            printedAt: new Date(),
            mode,
        });
        return {
            html,
            orderNumber: sale.orderNumber,
            filename: workOrderPdfFilename(sale.orderNumber),
        };
    }
    async getPrintPdf(enterpriseId, saleId) {
        const document = await this.getPrintHtml(enterpriseId, saleId, "pdf");
        return {
            pdf: await htmlToPdf(document.html),
            filename: document.filename,
        };
    }
    async listSaleConversions(enterpriseId, saleId) {
        const sale = await this.getSaleRow(db, enterpriseId, saleId);
        if (sale.type === "ORDEM DE SERVICO") {
            await this.assertTrabalhaOsEnabled(enterpriseId);
        }
        if (sale.type !== "ORCAMENTO" &&
            sale.type !== "ORDEM DE SERVICO" &&
            sale.type !== "VENDA") {
            throw new ValidationError([
                {
                    path: "params.saleId",
                    message: "Histórico de conversão disponível para Orçamento, Ordem de Serviço ou Venda",
                },
            ], "Tipo invalido");
        }
        const items = await this.loadSaleConversionsCascade(enterpriseId, saleId, sale.type === "VENDA" ? "linked" : "source");
        return { items };
    }
    async create(enterpriseId, auth, input, audit, gescomClient) {
        if (!auth?.userId) {
            throw new ValidationError([{ path: "auth", message: "Usuario autenticado obrigatorio" }], "Nao autenticado");
        }
        await this.assertSaleTypeAllowed(enterpriseId, input.type);
        const operator = await this.resolveSeller(auth.userId);
        const seller = await this.resolveSaleSeller(auth, enterpriseId, input.sellerId);
        const status = input.status;
        if (status === "FINALIZADA" && !this.movesInventory(input.type)) {
            throw new ValidationError([
                {
                    path: "body.status",
                    message: "Somente VENDA ou ORDEM DE SERVICO podem ser finalizadas com baixa de estoque",
                },
            ], "Status invalido");
        }
        try {
            const saleId = await db.transaction(async (tx) => {
                await this.assertClientMember(tx, enterpriseId, input.memberId, status === "FINALIZADA" ? input.payments : undefined);
                if (input.vehiclesEnterprisesMembersId) {
                    await this.assertVehiclesEnterprisesMember(tx, enterpriseId, input.vehiclesEnterprisesMembersId, input.memberId);
                }
                else if (input.type === "ORDEM DE SERVICO") {
                    throw new ValidationError([
                        {
                            path: "body.vehiclesEnterprisesMembersId",
                            message: "Informe vehiclesEnterprisesMembersId",
                        },
                    ], "Veiculo obrigatorio");
                }
                let orderNumber;
                if (input.orderNumber !== undefined) {
                    await assertSaleOrderNumberAvailable(enterpriseId, input.orderNumber, tx);
                    await syncSaleOrderSequenceFloor(enterpriseId, input.orderNumber, tx);
                    orderNumber = input.orderNumber;
                }
                else {
                    orderNumber = await nextSaleOrderNumber(enterpriseId, tx);
                }
                const closingOrigin = status === "FINALIZADA"
                    ? resolveSaleClosingOrigin(input.origin, gescomClient)
                    : undefined;
                const memberSnapshot = mergeSaleMemberSnapshot(await this.buildSaleMemberSnapshot(tx, enterpriseId, input.memberId), normalizeSaleMemberOverrides(input.member));
                if (!memberSnapshot.memberLegalName) {
                    throw new ValidationError([
                        {
                            path: "body.memberId",
                            message: "Cliente sem nome legal",
                        },
                    ], "Cliente invalido");
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
                    vehiclesEnterprisesMembersId: input.vehiclesEnterprisesMembersId ?? null,
                    enterprisesId: enterpriseId,
                })
                    .returning();
                if (!sale)
                    throw new Error("Falha ao criar venda");
                await this.upsertSaleMember(tx, sale.id, memberSnapshot);
                for (let i = 0; i < input.items.length; i++) {
                    const itemInput = input.items[i];
                    if (this.movesInventory(input.type)) {
                        await this.assertVendaDoesNotAcceptService(input.type, itemInput.productTypeId, `items.${i}.productTypeId`);
                        await assertSaleItemStockAvailable(tx, enterpriseId, itemInput, `items.${i}`);
                    }
                    else {
                        await validateSaleItemStock(enterpriseId, itemInput, `items.${i}`);
                    }
                    await this.assertServiceItemDescription(itemInput.productTypeId, itemInput.description, `items.${i}.description`);
                    await this.assertServiceItemTypeService(itemInput.productTypeId, itemInput.typeService, `items.${i}.typeService`);
                    const actor = await this.resolveItemActor(auth, enterpriseId, sale, itemInput.sellerId);
                    const { item: pricedItem, priceSnapshot } = await this.resolveSaleItemPricing(tx, itemInput);
                    await this.assertItemLineDiscountWithinMemberLimitForSeller(tx, enterpriseId, actor.sellerId, {
                        quantity: pricedItem.quantity,
                        valueUnit: pricedItem.valueUnit,
                        valueDiscount: pricedItem.valueDiscount,
                    }, `items.${i}.valueDiscount`);
                    const [inserted] = await tx
                        .insert(salesItems)
                        .values(this.mapItemInputToInsert(sale.id, pricedItem, actor, this.resolveItemLaunchOrigin(itemInput.origin, gescomClient), priceSnapshot))
                        .returning();
                    if (!inserted)
                        throw new Error("Falha ao incluir item na venda");
                    await this.insertItemMechanics(tx, enterpriseId, input.type, inserted.id, itemInput.mechanics, `body.items.${i}.mechanics`);
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
                const totals = await this.recalculateSaleTotalsFromItems(tx, enterpriseId, sale.id, sale);
                await this.assertSaleDiscountWithinMemberLimitForSeller(tx, enterpriseId, seller.sellerId, totals);
                if (status === "FINALIZADA" && input.payments?.length) {
                    const updatedSale = await this.getSaleRow(tx, enterpriseId, sale.id);
                    if (!updatedSale)
                        throw new Error("Falha ao recalcular venda");
                    await this.applyValueLiquidItemsHeader(tx, sale.id);
                    this.assertSalePaymentsMatchSale(updatedSale.valueLiquid, updatedSale.createdAt, input.payments);
                    await this.handleCreditSaleMemberStatusOnFinalize(tx, enterpriseId, input.memberId, input.payments);
                    await this.insertSalePayments(tx, sale.id, input.payments);
                    await this.recalculateSaleItemsCommission(tx, sale.id, seller.sellerId, enterpriseId, input.payments);
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
        }
        catch (err) {
            const conflict = mapSaleUniqueViolation(err);
            if (conflict)
                throw conflict;
            throw err;
        }
    }
    async patch(enterpriseId, id, auth, input, audit, gescomClient) {
        const existing = await this.getById(enterpriseId, id);
        await this.assertSaleTypeAllowed(enterpriseId, existing.type);
        if (existing.type === "ORCAMENTO" && existing.status === "FINALIZADA") {
            throw new ValidationError([
                {
                    path: "params.saleId",
                    message: "Orcamento fechado nao pode ser alterado",
                },
            ], "Orcamento fechado");
        }
        const previousStatus = existing.status;
        const nextStatus = input.status ?? existing.status;
        if (previousStatus === "CANCELADA" &&
            input.status !== undefined &&
            input.status !== "CANCELADA") {
            throw new ValidationError([
                {
                    path: "body.status",
                    message: "Venda cancelada nao pode mudar de status",
                },
            ], "Status invalido");
        }
        if (previousStatus !== "ABERTA") {
            throw new ValidationError([
                {
                    path: "body",
                    message: "Venda finalizada ou cancelada nao pode ser alterada. Use devolucoes para estorno parcial.",
                },
            ], "Venda nao editavel");
        }
        if (input.member !== undefined &&
            input.memberId === undefined &&
            existing.memberId == null) {
            throw new ValidationError([
                {
                    path: "body.member",
                    message: "Informe memberId para associar membro a venda antes de alterar o snapshot",
                },
            ], "Membro obrigatorio");
        }
        if (existing.type !== "ORDEM DE SERVICO" &&
            input.serviceType !== undefined) {
            throw new ValidationError([
                {
                    path: "body.serviceType",
                    message: "serviceType so pode ser informado em ORDEM DE SERVICO; omita o campo",
                },
            ], "Campo invalido");
        }
        let sellerUpdate;
        if (input.sellerId !== undefined) {
            if (!auth?.userId) {
                throw new ValidationError([{ path: "auth", message: "Usuario autenticado obrigatorio" }], "Nao autenticado");
            }
            sellerUpdate = await this.resolveSaleSeller(auth, enterpriseId, input.sellerId);
        }
        const hasHeaderChange = input.memberId !== undefined ||
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
            throw new ValidationError([
                {
                    path: "body.status",
                    message: "Somente VENDA ou ORDEM DE SERVICO movimentam estoque ao finalizar",
                },
            ], "Status invalido");
        }
        const finalize = nextStatus === "FINALIZADA";
        const closingOrigin = finalize
            ? resolveSaleClosingOrigin(input.origin, gescomClient)
            : undefined;
        const cancelSale = this.shouldMoveStock(existing) && nextStatus === "CANCELADA";
        if (finalize && input.payments === undefined) {
            throw new ValidationError([
                {
                    path: "body.payments",
                    message: "Informe pagamentos e parcelas ao finalizar a venda (status FINALIZADA)",
                },
            ], "Pagamentos obrigatorios");
        }
        if (input.payments !== undefined && !finalize) {
            throw new ValidationError([
                {
                    path: "body.payments",
                    message: "Pagamentos e parcelas so podem ser informados ao fechar a venda",
                },
            ], "Pagamentos invalidos");
        }
        const completedionDate = input.completedionDate !== undefined
            ? input.completedionDate
            : finalize
                ? new Date()
                : undefined;
        const shouldRecalculateTotals = input.recalculateTotals === true ||
            (hasHeaderChange && input.valueLiquid === undefined);
        let beforeRow;
        try {
            await db.transaction(async (tx) => {
                beforeRow = await this.getSaleRow(tx, enterpriseId, id);
                if (input.memberId !== undefined) {
                    await this.assertClientMember(tx, enterpriseId, input.memberId, finalize ? input.payments : undefined);
                }
                const nextMemberId = input.memberId ?? beforeRow.memberId;
                const nextVehiclesEnterprisesMembersId = input.vehiclesEnterprisesMembersId !== undefined
                    ? input.vehiclesEnterprisesMembersId
                    : beforeRow.vehiclesEnterprisesMembersId;
                if (nextVehiclesEnterprisesMembersId &&
                    (input.vehiclesEnterprisesMembersId !== undefined ||
                        input.memberId !== undefined)) {
                    await this.assertVehiclesEnterprisesMember(tx, enterpriseId, nextVehiclesEnterprisesMembersId, nextMemberId);
                }
                let row = (await tx
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
                            vehiclesEnterprisesMembersId: input.vehiclesEnterprisesMembersId,
                        }
                        : {}),
                    updatedAt: new Date(),
                })
                    .where(this.scope(enterpriseId, id))
                    .returning())[0];
                if (!row) {
                    throw new NotFoundError("Venda nao encontrada", "SALE_NOT_FOUND");
                }
                if (input.memberId !== undefined || input.member !== undefined) {
                    const memberId = input.memberId ?? row.memberId;
                    if (!memberId) {
                        throw new ValidationError([
                            {
                                path: "body.member",
                                message: "Informe memberId para associar membro a venda antes de alterar o snapshot",
                            },
                        ], "Membro obrigatorio");
                    }
                    await this.syncSaleMemberSnapshot(tx, enterpriseId, id, memberId, {
                        rebuildFromMember: input.memberId !== undefined,
                        overrides: input.member,
                    });
                }
                if (shouldRecalculateTotals && row.status === "ABERTA") {
                    await this.recalculateSaleTotalsFromItems(tx, enterpriseId, id, row);
                    row = (await this.getSaleRow(tx, enterpriseId, id));
                }
                if (row.status === "ABERTA") {
                    await this.assertSaleDiscountWithinMemberLimitForSeller(tx, enterpriseId, sellerUpdate?.sellerId ?? row.sellerId, {
                        subTotal: decNum(row.subTotal),
                        discountValuetems: decNum(row.discountValuetems),
                        valueDiscountFinancialProduct: decNum(row.valueDiscountFinancialProduct),
                        valueDiscountFinancialService: decNum(row.valueDiscountFinancialService),
                    });
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
                    this.assertSalePaymentsMatchSale(row.valueLiquid, row.createdAt, input.payments);
                    await this.handleCreditSaleMemberStatusOnFinalize(tx, enterpriseId, row.memberId, input.payments);
                    await this.insertSalePayments(tx, id, input.payments);
                    await this.recalculateSaleItemsCommission(tx, id, sellerUpdate?.sellerId ?? existing.sellerId, enterpriseId, input.payments);
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
        }
        catch (err) {
            const conflict = mapSaleUniqueViolation(err);
            if (conflict)
                throw conflict;
            throw err;
        }
    }
}
