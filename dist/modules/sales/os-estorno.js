import { ValidationError } from "../../shared/errors/app-error.js";
import { formatQuantity } from "./sale-service-shared.js";
import { shouldMoveStock } from "./sale-financials.js";
export const OS_ESTORNO_MOVES_STOCK = false;
export const buildOsEstornoWorkOrderUpdate = () => ({
    status: "ABERTA",
    completedionDate: null,
    userClosedServiceId: null,
});
export const buildGeneratedSaleCancelUpdate = () => ({
    status: "CANCELADA",
    returnSituation: "SEM_DEVOLUCAO",
    sourceWorkOrderSaleId: null,
});
export const buildGeneratedSaleUnlinkUpdate = () => ({
    sourceWorkOrderSaleId: null,
});
export const buildGeneratedSaleItemUnlinkUpdate = () => ({
    sourceWorkOrderItemId: null,
});
export const buildOsEstornoItemUpdate = () => ({
    quantityConverted: formatQuantity(0),
});
export const generatedSaleCancelMovesStock = (sale) => shouldMoveStock({
    type: "VENDA",
    sourceWorkOrderSaleId: sale.sourceWorkOrderSaleId ?? "os",
});
export const assertOsEligibleForEstorno = (workOrder, generatedSales) => {
    if (workOrder.type !== "ORDEM DE SERVICO") {
        throw new ValidationError([
            {
                path: "params.saleId",
                message: "Somente ordens de servico podem ser estornadas",
            },
        ], "Tipo invalido");
    }
    if (workOrder.status !== "FINALIZADA") {
        throw new ValidationError([
            {
                path: "params.saleId",
                message: "Somente ordem de servico FINALIZADA pode ser estornada",
            },
        ], "Status invalido");
    }
    if (generatedSales.length === 0) {
        throw new ValidationError([
            {
                path: "params.saleId",
                message: "Ordem de servico sem venda gerada nao pode ser estornada",
            },
        ], "Venda vinculada obrigatoria");
    }
    for (const sale of generatedSales) {
        if (sale.returnSituation !== "SEM_DEVOLUCAO") {
            throw new ValidationError([
                {
                    path: "params.saleId",
                    message: "Venda gerada com devolucao nao pode ser estornada",
                },
            ], "Devolucao existente");
        }
    }
};
export const planOsEstorno = (workOrder, generatedSales) => {
    assertOsEligibleForEstorno(workOrder, generatedSales);
    return {
        workOrderUpdate: buildOsEstornoWorkOrderUpdate(),
        itemUpdate: buildOsEstornoItemUpdate(),
        generatedItemUnlink: buildGeneratedSaleItemUnlinkUpdate(),
        salesToCancel: generatedSales
            .filter((sale) => sale.status !== "CANCELADA")
            .map((sale) => ({
            id: sale.id,
            ...buildGeneratedSaleCancelUpdate(),
        })),
        salesToUnlink: generatedSales.map((sale) => ({
            id: sale.id,
            ...buildGeneratedSaleUnlinkUpdate(),
        })),
        movesStock: OS_ESTORNO_MOVES_STOCK,
    };
};
