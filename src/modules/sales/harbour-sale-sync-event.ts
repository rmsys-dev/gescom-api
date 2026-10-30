import type { HarbourSaleSyncEventType } from "../../db/enums.js";

export const harbourEventForSaleTransition = (  // Retorna o evento de sincronização de venda para o Harbour para uma transição de venda
  type: string,
  status: string,
): HarbourSaleSyncEventType | null => {
  if (type === "VENDA" && status === "FINALIZADA") return "SALE_FINALIZED";
  if (type === "ORDEM DE SERVICO" && status === "FINALIZADA") {
    return "OS_FINALIZED";
  }
  if (type === "VENDA" && status === "CANCELADA") return "SALE_CANCELLED";
  if (type === "ORDEM DE SERVICO" && status === "CANCELADA") {
    return "OS_CANCELLED";
  }
  return null;
};
