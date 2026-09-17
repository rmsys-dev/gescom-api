import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { stockMovements } from "../../db/schema.js";
import { ValidationError } from "../../shared/errors/app-error.js";
import {
  adjustStockBalance,
  ensureStockSectorRentalAssignment,
  getLocationSectorId,
  getProductEnterpriseForStock,
  getStockBalance,
  type ProductEnterpriseStock,
} from "./balance.js";
import { productRequiresStockLocation } from "./stock-location.js";

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
  fromLocationsId?: string;
  fromStockBatchId?: string | null;
  toLocationsId?: string;
  toStockBatchId?: string | null;
  notes?: string | null;
  documentRef?: string | null;
  transferGroupId?: string;
};

const DECREASE_TYPES: StockMovementType[] = [
  "SAIDA",
  "PERDA",
  "VENDA",
  "TRANSFERENCIA",
];
const INCREASE_TYPES: StockMovementType[] = [
  "ENTRADA",
  "COMPRA",
  "DEVOLUCAO",
  "TRANSFERENCIA",
  "AJUSTE",
];

function assertMovementLocations(
  productEnterprise: ProductEnterpriseStock,
  input: CreateStockMovementTxInput,
) {
  const requiresLocation = productRequiresStockLocation(productEnterprise);
  const needsFrom = DECREASE_TYPES.includes(input.type);
  const needsTo = INCREASE_TYPES.includes(input.type);

  if (input.type === "TRANSFERENCIA" && !requiresLocation) {
    throw new ValidationError(
      [
        {
          path: "body.type",
          message: "TRANSFERENCIA exige produto com controle de locacao",
        },
      ],
      "Transferencia invalida",
    );
  }

  if (!requiresLocation) {
    if (input.fromLocationsId || input.toLocationsId) {
      throw new ValidationError(
        [
          {
            path: input.toLocationsId
              ? "body.toLocationsId"
              : "body.fromLocationsId",
            message: "Produto sem controle de locacao nao aceita locacao",
          },
        ],
        "Locacao nao permitida",
      );
    }
    return;
  }

  if (needsFrom && !input.fromLocationsId) {
    throw new ValidationError(
      [
        {
          path: "body.fromLocationsId",
          message: `${input.type} exige fromLocationsId`,
        },
      ],
      "Locacao obrigatoria",
    );
  }
  if (needsTo && !input.toLocationsId) {
    throw new ValidationError(
      [
        {
          path: "body.toLocationsId",
          message: `${input.type} exige toLocationsId`,
        },
      ],
      "Locacao obrigatoria",
    );
  }
}

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

  assertMovementLocations(productEnterprise, input);

  if (input.type === "TRANSFERENCIA") {
    if (!input.fromLocationsId || !input.toLocationsId) {  // TRANSFERÊNCIA EXIGE LOCAÇÕES DE ORIGEM E DESTINO
      throw new ValidationError(
        [
          {
            path: "body.fromLocationsId",
            message: "TRANSFERENCIA exige locacoes de origem e destino",
          },
        ],
        "Transferencia invalida",
      );
    }
    if (input.fromLocationsId === input.toLocationsId) {  // LOCAÇÕES DE ORIGEM E DESTINO DEVEM SER DISTINTAS
      throw new ValidationError(
        [
          {
            path: "body.toLocationsId",
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
  let fromSectorId: string | null = null;
  let toSectorId: string | null = null;

  const isTransfer = input.type === "TRANSFERENCIA";
  const skipProductBalance = isTransfer && productEnterprise.controlsBatch;

  if (isTransfer && !productEnterprise.controlsBatch) {
    const fromLocationsId = input.fromLocationsId!;
    const toLocationsId = input.toLocationsId!;
    const fromSector = await getLocationSectorId(fromLocationsId, tx);
    const toSector = await getLocationSectorId(toLocationsId, tx);
    fromSectorId = fromSector.sectorId;
    toSectorId = toSector.sectorId;
    await ensureStockSectorRentalAssignment(
      tx,
      productEnterprise.id,
      fromLocationsId,
    );
    await ensureStockSectorRentalAssignment(
      tx,
      productEnterprise.id,
      toLocationsId,
    );
    const total = await getStockBalance(tx, {
      productsEnterprises: productEnterprise,
      lock: true,
    });
    fromBefore = total;
    fromAfter = total;
    toBefore = total;
    toAfter = total;
  } else {
    if (DECREASE_TYPES.includes(input.type)) {  // DECRESCENTE: SAIDA, PERDA, VENDA, TRANSFERENCIA
      if (input.fromLocationsId) {
        const sector = await getLocationSectorId(input.fromLocationsId, tx);
        fromSectorId = sector.sectorId;
      }
      const r = await adjustStockBalance(tx, {
        productsEnterprises: productEnterprise,
        locationId: input.fromLocationsId,
        stockBatchId: fromStockBatchId,
        delta: -qty,
        skipProductBalance,
      });
      fromBefore = r.before;
      fromAfter = r.after;
    }

    if (INCREASE_TYPES.includes(input.type)) {  // CRESCENTE: ENTRADA, COMPRA, DEVOLUCAO, TRANSFERENCIA, AJUSTE
      if (input.toLocationsId) {
        const sector = await getLocationSectorId(input.toLocationsId, tx);
        toSectorId = sector.sectorId;
      }
      const r = await adjustStockBalance(tx, {
        productsEnterprises: productEnterprise,
        locationId: input.toLocationsId,
        stockBatchId: toStockBatchId,
        delta: qty,
        skipProductBalance,
      });
      toBefore = r.before;
      toAfter = r.after;
    }
  }

  const [row] = await tx
    .insert(stockMovements)
    .values({
      transferGroupId,
      type: input.type,
      productsEnterprisesId: input.productsEnterprisesId,
      fromSectorId,
      fromLocationsId: input.fromLocationsId ?? null,
      fromStockBatchId,
      toSectorId,
      toLocationsId: input.toLocationsId ?? null,
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
