import { db } from "../../db/index.js";
import { harbourSaleSyncEvents } from "../../db/schema.js";
import type { HarbourSaleSyncEventType } from "../../db/enums.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export { harbourEventForSaleTransition } from "./harbour-sale-sync-event.js";

export const enqueueHarbourSaleSync = async ( // Enfileira um evento de sincronização de venda para o Harbour
  tx: Tx,
  input: {
    enterprisesId: string;
    saleId: string;
    eventType: HarbourSaleSyncEventType;
  },
): Promise<void> => {
  await tx
    .insert(harbourSaleSyncEvents)
    .values({
      enterprisesId: input.enterprisesId,
      saleId: input.saleId,
      eventType: input.eventType,
    })
    .onConflictDoNothing();
};
