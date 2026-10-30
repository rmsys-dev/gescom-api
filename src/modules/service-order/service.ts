import type { EntityAuditContext } from "../../shared/audit/entity-audit.js";
import {
  salesService,
  type SaleAuthContext,
} from "../sales/service.js";
import type {
  ConvertBudgetToOsInput,
  ConvertOsToSaleInput,
  CreateSaleItemInput,
  CreateServiceOrderInput,
  ListSaleSellersQuery,
  ListServiceOrdersQuery,
  PatchSaleInput,
  PatchSaleItemInput,
} from "../sales/schema.js";
import { listSaleSellers } from "../sales/sellers.js";

const CHANNEL = "service_order" as const;

export class ServiceOrderService {
  public list(enterpriseId: string, query: ListServiceOrdersQuery) {
    return salesService.list(enterpriseId, query, CHANNEL);
  }

  public summary(enterpriseId: string, query: ListServiceOrdersQuery) {
    return salesService.summary(enterpriseId, query, CHANNEL);
  }

  public listSellers(enterpriseId: string, query: ListSaleSellersQuery) {
    return listSaleSellers(enterpriseId, query);
  }

  public getById(enterpriseId: string, serviceOrderId: string) {
    return salesService.getById(enterpriseId, serviceOrderId, CHANNEL);
  }

  public getPrintHtml(
    enterpriseId: string,
    serviceOrderId: string,
    mode: "html" | "pdf" = "html",
  ) {
    return salesService.getPrintHtml(
      enterpriseId,
      serviceOrderId,
      mode,
      CHANNEL,
    );
  }

  public getPrintPdf(enterpriseId: string, serviceOrderId: string) {
    return salesService.getPrintPdf(enterpriseId, serviceOrderId, CHANNEL);
  }

  public listConversions(enterpriseId: string, serviceOrderId: string) {
    return salesService.listSaleConversions(
      enterpriseId,
      serviceOrderId,
      CHANNEL,
    );
  }

  public create(
    enterpriseId: string,
    auth: SaleAuthContext | null,
    input: CreateServiceOrderInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    return salesService.create(
      enterpriseId,
      auth,
      { ...input, type: "ORDEM DE SERVICO" },
      audit,
      gescomClient,
      CHANNEL,
    );
  }

  public patch(
    enterpriseId: string,
    serviceOrderId: string,
    auth: SaleAuthContext | null,
    input: PatchSaleInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    return salesService.patch(
      enterpriseId,
      serviceOrderId,
      auth,
      input,
      audit,
      gescomClient,
      CHANNEL,
    );
  }

  public addItem(
    enterpriseId: string,
    serviceOrderId: string,
    auth: SaleAuthContext | null,
    input: CreateSaleItemInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    return salesService.addItem(
      enterpriseId,
      serviceOrderId,
      auth,
      input,
      audit,
      gescomClient,
      CHANNEL,
    );
  }

  public updateItem(
    enterpriseId: string,
    serviceOrderId: string,
    saleItemId: string,
    userId: string | null,
    input: PatchSaleItemInput,
    audit: EntityAuditContext,
  ) {
    return salesService.updateItem(
      enterpriseId,
      serviceOrderId,
      saleItemId,
      userId,
      input,
      audit,
      CHANNEL,
    );
  }

  public removeItem(
    enterpriseId: string,
    serviceOrderId: string,
    saleItemId: string,
    userId: string | null,
    audit: EntityAuditContext,
  ) {
    return salesService.removeItem(
      enterpriseId,
      serviceOrderId,
      saleItemId,
      userId,
      audit,
      CHANNEL,
    );
  }

  public recalculateTotals(
    enterpriseId: string,
    serviceOrderId: string,
    audit: EntityAuditContext,
  ) {
    return salesService.recalculateTotals(
      enterpriseId,
      serviceOrderId,
      audit,
      CHANNEL,
    );
  }

  public convertFromBudget(
    enterpriseId: string,
    budgetSaleId: string,
    auth: SaleAuthContext | null,
    input: ConvertBudgetToOsInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    return salesService.convertBudgetToOs(
      enterpriseId,
      budgetSaleId,
      auth,
      input,
      audit,
      gescomClient,
    );
  }

  public convertToSale(
    enterpriseId: string,
    serviceOrderId: string,
    auth: SaleAuthContext | null,
    input: ConvertOsToSaleInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    return salesService.convertOsToSale(
      enterpriseId,
      serviceOrderId,
      auth,
      input,
      audit,
      gescomClient,
    );
  }

  public cancel(
    enterpriseId: string,
    serviceOrderId: string,
    userId: string | null,
    audit: EntityAuditContext,
  ) {
    return salesService.cancelOs(
      enterpriseId,
      serviceOrderId,
      userId,
      audit,
    );
  }

  public estorno(
    enterpriseId: string,
    serviceOrderId: string,
    audit: EntityAuditContext,
  ) {
    return salesService.estornoOsToOpen(enterpriseId, serviceOrderId, audit);
  }
}

export const serviceOrderService = new ServiceOrderService();
