import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { stockMovements } from "../../db/schema.js";
import { ValidationError } from "../../shared/errors/app-error.js";
import {
  adjustStockBalance,
  getLocationSectorId,
  getProductEnterpriseForStock,
} from "./balance.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type StockMovementType =
  | "ENTRADA"
  | "SAIDA"
  | "TRANSFERENCIA"
  | "AJUSTE"
  | "PERDA"
  | "VENDA"
  | "COMPRA"
  | "DEVOLUCAO"
  | "CANCELAMENTO"
  | "OUTROS";

export type CreateStockMovementTxInput = {
  type: StockMovementType;
  productsEnterprisesId: string;
  quantity: number;
  fromStockLocationId?: string;
  fromStockBatchId?: string | null;
  toStockLocationId?: string;
  toStockBatchId?: string | null;
  notes?: string | null;
  documentRef?: string | null;
  transferGroupId?: string;
};

export async function createStockMovementInTx(  // REGISTRA MOVIMENTAÇÃO DE ESTOQUE
  tx: Tx,
  params: {
    enterpriseId: string;
    userId: string | null;
    input: CreateStockMovementTxInput;
  },
) {
  const { enterpriseId, userId, input } = params;
  const productEnterprise = await getProductEnterpriseForStock(
    enterpriseId,
    input.productsEnterprisesId,
    tx,
  );

  const qty = input.quantity;
  const transferGroupId = input.transferGroupId ?? randomUUID();
  let fromStockBatchId = input.fromStockBatchId ?? null;
  let toStockBatchId = input.toStockBatchId ?? null;

  if (input.type === "TRANSFERENCIA") {
    if (!input.fromStockLocationId || !input.toStockLocationId) {  // TRANSFERÊNCIA EXIGE LOCAÇÕES DE ORIGEM E DESTINO
      throw new ValidationError(
        [
          {
            path: "body.fromStockLocationId",
            message: "TRANSFERENCIA exige locacoes de origem e destino",
          },
        ],
        "Transferencia invalida",
      );
    }
    if (input.fromStockLocationId === input.toStockLocationId) {  // LOCAÇÕES DE ORIGEM E DESTINO DEVEM SER DISTINTAS
      throw new ValidationError(
        [
          {
            path: "body.toStockLocationId",
            message: "Locacoes de origem e destino devem ser distintas",
          },
        ],
        "Transferencia invalida",
      );
    }
    if (
      (fromStockBatchId && !toStockBatchId) ||  // LOTE DE ORIGEM E DESTINO DEVEM SER INFORMADOS JUNTOS OU OMITIDOS AMBOS
      (!fromStockBatchId && toStockBatchId)
    ) {
      throw new ValidationError(
        [
          {
            path: "body.fromStockBatchId",
            message:
              "Informe fromStockBatchId e toStockBatchId juntos ou omita ambos",
          },
        ],
        "Transferencia invalida",
      );
    }
    if (productEnterprise.controlsBatch) {    // PRODUTO EMPRESA CONTROLA LOTE
      if (!fromStockBatchId || !toStockBatchId) {  // LOTE DE ORIGEM E DESTINO DEVEM SER INFORMADOS JUNTOS OU OMITIDOS AMBOS
        throw new ValidationError(
          [
            {
              path: "body.fromStockBatchId",
              message:
                "Produto com controle de lote exige fromStockBatchId e toStockBatchId na transferencia",
            },
          ],
          "Transferencia invalida",
        );
      }
    } else if (fromStockBatchId || toStockBatchId) {
      throw new ValidationError(
        [
          {
            path: "body.fromStockBatchId",
            message: "Produto sem controle de lote nao aceita lote na transferencia",
          },
        ],
        "Transferencia invalida",
      );
    }
  }

  let fromBefore: number | null = null;
  let fromAfter: number | null = null;
  let toBefore: number | null = null;
  let toAfter: number | null = null;
  let fromStockSectorId: string | null = null;
  let toStockSectorId: string | null = null;

  const decreaseTypes = ["SAIDA", "PERDA", "VENDA", "TRANSFERENCIA"];
  const increaseTypes = [
    "ENTRADA",
    "COMPRA",
    "DEVOLUCAO",
    "TRANSFERENCIA",
    "AJUSTE",
  ];

  if (decreaseTypes.includes(input.type) && input.fromStockLocationId) {  // DECRESCENTE: SAIDA, PERDA, VENDA, TRANSFERENCIA
    const sector = await getLocationSectorId(input.fromStockLocationId, tx);
    fromStockSectorId = sector.stockSectorId;
    const r = await adjustStockBalance(tx, {
      productsEnterprises: productEnterprise,
      stockLocationId: input.fromStockLocationId,
      stockBatchId: fromStockBatchId,
      delta: -qty,
    });
    fromBefore = r.before;
    fromAfter = r.after;
  }

  if (increaseTypes.includes(input.type) && input.toStockLocationId) {  // CRESCENTE: ENTRADA, COMPRA, DEVOLUCAO, TRANSFERENCIA, AJUSTE
    const sector = await getLocationSectorId(input.toStockLocationId, tx);
    toStockSectorId = sector.stockSectorId;
    const r = await adjustStockBalance(tx, {
      productsEnterprises: productEnterprise,
      stockLocationId: input.toStockLocationId,
      stockBatchId: toStockBatchId,
      delta: qty,
    });
    toBefore = r.before;
    toAfter = r.after;
  }

  const [row] = await tx
    .insert(stockMovements)
    .values({
      transferGroupId,
      type: input.type,
      productsEnterprisesId: input.productsEnterprisesId,
      fromStockSectorId,
      fromStockLocationId: input.fromStockLocationId ?? null,
      fromStockBatchId,
      toStockSectorId,
      toStockLocationId: input.toStockLocationId ?? null,
      toStockBatchId,
      quantity: qty.toString(),
      fromQuantityBefore: fromBefore !== null ? fromBefore.toString() : null,
      fromQuantityAfter: fromAfter !== null ? fromAfter.toString() : null,
      toQuantityBefore: toBefore !== null ? toBefore.toString() : null,
      toQuantityAfter: toAfter !== null ? toAfter.toString() : null,
      userId,
      notes: input.notes ?? null,
      documentRef: input.documentRef ?? null,
    })
    .returning();

  if (!row) throw new Error("Falha ao registrar movimento de estoque");
  return row;
}

export async function stockMovementExistsByDocumentRef(  // VERIFICA SE A MOVIMENTAÇÃO DE ESTOQUE JÁ EXISTE POR REFERÊNCIA DO DOCUMENTO
  tx: Tx,
  documentRef: string,
) {
  const row = (
    await tx
      .select({ id: stockMovements.id })
      .from(stockMovements)
      .where(eq(stockMovements.documentRef, documentRef))
      .limit(1)
  )[0];
  return Boolean(row);
}
