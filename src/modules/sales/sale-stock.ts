import { db } from "../../db/index.js";
import { measurementUnits, stockMovements } from "../../db/schema.js";
import { eq, like } from "drizzle-orm";
import { NotFoundError, ValidationError } from "../../shared/errors/app-error.js";
import { isServiceProductTypeById } from "../../shared/products/product-type-service.js";
import {
  assertBatchBelongsToProduct,
  assertSectorBelongsToEnterprise,
  assertSufficientStock,
  getLocationSectorId,
  getProductEnterpriseForStock,
} from "../stock/balance.js";
import { productRequiresStockLocation } from "../stock/stock-location.js";
import {
  createStockMovementInTx,
  stockMovementExistsByDocumentRef,
} from "../stock/movement.js";
import {
  assertQuantityMatchesWholeFractional,
  type WholeFractional,
} from "./sale-quantity-logic.js";
import type { saleItemInputSchema } from "./schema.js";
import type { z } from "zod";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type SaleItemInput = z.infer<typeof saleItemInputSchema>;

async function getUnitWholeFractional(
  unitId: string,
  tx?: Tx,
): Promise<WholeFractional> {
  const runner = tx ?? db;
  const row = (
    await runner
      .select({ wholeFractional: measurementUnits.wholeFractional })
      .from(measurementUnits)
      .where(eq(measurementUnits.id, unitId))
      .limit(1)
  )[0];
  if (!row) {
    throw new NotFoundError("Unidade de medida nao encontrada", "UNIT_NOT_FOUND");
  }
  return row.wholeFractional;
}

export type SaleItemRow = {
  id: string;
  productsEnterprisesId: string;
  productTypeId: string;
  locationsId: string | null;
  stockBatchId: string | null;
  sectorId: string | null;
  quantity: string;
};

import {
  saleItemStockOutRef,
  saleItemStockReturnRef,
  saleItemStockRevisionOutRef,
  saleItemStockRevisionReturnRef,
} from "./sale-stock-refs.js";
export {
  saleItemStockOutRef,
  saleItemStockReturnRef,
  saleItemStockRevisionOutRef,
  saleItemStockRevisionReturnRef,
} from "./sale-stock-refs.js";

async function getLastSaleItemStockRevision(
  tx: Tx,
  saleId: string,
  saleItemId: string,
): Promise<number | null> {
  const prefix = `SALE:${saleId}:ITEM:${saleItemId}:REV:`;
  const rows = await tx
    .select({ documentRef: stockMovements.documentRef })
    .from(stockMovements)
    .where(like(stockMovements.documentRef, `${prefix}%`));

  let maxRevision: number | null = null;
  for (const row of rows) {
    const ref = row.documentRef;
    if (!ref?.startsWith(prefix)) continue;
    const revision = Number(ref.slice(prefix.length));
    if (Number.isInteger(revision) && revision > 0) {
      maxRevision =
        maxRevision === null ? revision : Math.max(maxRevision, revision);
    }
  }
  return maxRevision;
}

function saleItemStockFieldsChanged(
  oldItem: SaleItemRow,
  newItem: SaleItemInput,
): boolean {
  return (
    oldItem.productsEnterprisesId !== newItem.productsEnterprisesId ||
    oldItem.sectorId !== (newItem.sectorId ?? null) ||
    oldItem.locationsId !== (newItem.locationsId ?? null) ||
    oldItem.stockBatchId !== (newItem.stockBatchId ?? null) ||
    Number(oldItem.quantity) !== newItem.quantity
  );
}

async function applySaleItemStockRevisionReturn(
  tx: Tx,
  params: {
    enterpriseId: string;
    userId: string | null;
    saleId: string;
    orderNumber: number;
    item: SaleItemRow;
    revision: number;
    quantity: number;
  },
) {
  const { enterpriseId, userId, saleId, orderNumber, item, revision, quantity } =
    params;

  const outRef = saleItemStockRevisionOutRef(saleId, item.id, revision);
  if (!(await stockMovementExistsByDocumentRef(tx, outRef))) {
    return;
  }

  const documentRef = saleItemStockRevisionReturnRef(saleId, item.id, revision);
  if (await stockMovementExistsByDocumentRef(tx, documentRef)) {
    return;
  }

  await createStockMovementInTx(tx, {
    enterpriseId,
    userId,
    input: {
      type: "DEVOLUCAO",
      productsEnterprisesId: item.productsEnterprisesId,
      quantity,
      toLocationsId: item.locationsId ?? undefined,
      toStockBatchId: item.stockBatchId,
      documentRef,
      notes: `Estorno revisao ${revision} venda pedido ${orderNumber}`,
    },
  });
}

export function saleReturnDocumentItemRef(salesReturnId: string) {
  return `SALE-RET-DOC:${salesReturnId}`;
}

function assertNonServiceStockFields(
  item: SaleItemInput,
  pathPrefix: string,
) {
  if (!item.sectorId) {
    throw new ValidationError(
      [
        {
          path: `${pathPrefix}.sectorId`,
          message: "Setor de estoque obrigatorio para produto com controle de locacao ou lote",
        },
      ],
      "Setor de estoque obrigatorio",
    );
  }
  if (!item.locationsId) {
    throw new ValidationError(
      [
        {
          path: `${pathPrefix}.locationsId`,
          message: "Locacao de estoque obrigatoria para produto com controle de locacao ou lote",
        },
      ],
      "Locacao de estoque obrigatoria",
    );
  }
}

function assertLocationNotAllowed(
  item: SaleItemInput,
  pathPrefix: string,
) {
  if (item.sectorId) {
    throw new ValidationError(
      [
        {
          path: `${pathPrefix}.sectorId`,
          message: "Produto sem controle de locacao nao aceita setor",
        },
      ],
      "Setor nao permitido",
    );
  }
  if (item.locationsId) {
    throw new ValidationError(
      [
        {
          path: `${pathPrefix}.locationsId`,
          message: "Produto sem controle de locacao nao aceita locacao",
        },
      ],
      "Locacao nao permitida",
    );
  }
}

export async function validateSaleItemStock(
  enterpriseId: string,
  item: SaleItemInput,
  pathPrefix = "items",
  tx?: Tx,
) {
  const pe = await getProductEnterpriseForStock(
    enterpriseId,
    item.productsEnterprisesId,
    tx,
  );

  if (pe.measurementUnitId !== item.unitId) {
    throw new ValidationError(
      [
        {
          path: `${pathPrefix}.unitId`,
          message: "Unidade divergente do produto da empresa",
        },
      ],
      "Unidade invalida",
    );
  }

  const wholeFractional = await getUnitWholeFractional(item.unitId, tx);
  assertQuantityMatchesWholeFractional(
    item.quantity,
    wholeFractional,
    pathPrefix,
  );

  if (pe.productTypeId !== item.productTypeId) {
    throw new ValidationError(
      [
        {
          path: `${pathPrefix}.productTypeId`,
          message: "Tipo de produto divergente do produto da empresa",
        },
      ],
      "Tipo de produto invalido",
    );
  }

  if (await isServiceProductTypeById(item.productTypeId)) {
    return;
  }

  if (productRequiresStockLocation(pe)) {
    assertNonServiceStockFields(item, pathPrefix);

    await assertSectorBelongsToEnterprise(
      enterpriseId,
      item.sectorId!,
      tx,
    );

    const locationSector = await getLocationSectorId(item.locationsId!, tx);
    if (locationSector.sectorId !== item.sectorId) {
      throw new ValidationError(
        [
          {
            path: `${pathPrefix}.sectorId`,
            message: "Setor nao corresponde a locacao informada",
          },
        ],
        "Setor invalido",
      );
    }
  } else {
    assertLocationNotAllowed(item, pathPrefix);
  }

  if (pe.controlsBatch) {
    if (!item.stockBatchId) {
      throw new ValidationError(
        [
          {
            path: `${pathPrefix}.stockBatchId`,
            message: "Produto com controle de lote, exige o lote informado",
          },
        ],
        "Lote obrigatorio",
      );
    }
    await assertBatchBelongsToProduct(
      item.productsEnterprisesId,
      item.stockBatchId,
    );
  } else if (item.stockBatchId) {
    throw new ValidationError(
      [
        {
          path: `${pathPrefix}.stockBatchId`,
          message: "Produto sem controle de lote, nao exige lote informado",
        },
      ],
      "Lote nao permitido",
    );
  }

  if (tx) {
    await assertSufficientStock(tx, {
      enterpriseId,
      productsEnterprisesId: item.productsEnterprisesId,
      quantity: item.quantity,
      pathPrefix: `${pathPrefix}.quantity`,
    });
  }
}

/** Verifica saldo antes de gravar item (sem reserva). */
export async function assertSaleItemStockAvailable(
  tx: Tx,
  enterpriseId: string,
  item: SaleItemInput,
  pathPrefix = "body",
) {
  await validateSaleItemStock(enterpriseId, item, pathPrefix, tx);
}

/** Baixa estoque de um item de venda (idempotente por linha). */
export async function applySaleItemStockOut(
  tx: Tx,
  params: {
    enterpriseId: string;
    userId: string | null;
    saleId: string;
    orderNumber: number;
    item: SaleItemRow;
  },
) {
  const { enterpriseId, userId, saleId, orderNumber, item } = params;
  if (await isServiceProductTypeById(item.productTypeId)) {
    return;
  }

  const documentRef = saleItemStockOutRef(saleId, item.id);
  if (await stockMovementExistsByDocumentRef(tx, documentRef)) {
    return;
  }

  await createStockMovementInTx(tx, {
    enterpriseId,
    userId,
    input: {
      type: "VENDA",
      productsEnterprisesId: item.productsEnterprisesId,
      quantity: Number(item.quantity),
      fromLocationsId: item.locationsId ?? undefined,
      fromStockBatchId: item.stockBatchId,
      documentRef,
      notes: `Venda pedido ${orderNumber}`,
    },
  });
}

/** Estorna estoque de um item de venda (idempotente por linha). */
export async function applySaleItemStockReturn(
  tx: Tx,
  params: {
    enterpriseId: string;
    userId: string | null;
    saleId: string;
    orderNumber: number;
    item: SaleItemRow;
  },
) {
  const { enterpriseId, userId, saleId, orderNumber, item } = params;
  if (await isServiceProductTypeById(item.productTypeId)) {
    return;
  }

  const outRef = saleItemStockOutRef(saleId, item.id);
  if (!(await stockMovementExistsByDocumentRef(tx, outRef))) {
    return;
  }

  const documentRef = saleItemStockReturnRef(saleId, item.id);
  if (await stockMovementExistsByDocumentRef(tx, documentRef)) {
    return;
  }

  await createStockMovementInTx(tx, {
    enterpriseId,
    userId,
    input: {
      type: "DEVOLUCAO",
      productsEnterprisesId: item.productsEnterprisesId,
      quantity: Number(item.quantity),
      toLocationsId: item.locationsId ?? undefined,
      toStockBatchId: item.stockBatchId,
      documentRef,
      notes: `Estorno venda pedido ${orderNumber}`,
    },
  });
}

/** Garante que todos os itens ja tiveram baixa antes de finalizar. */
export async function assertSaleItemsStockCommitted(
  tx: Tx,
  saleId: string,
  items: SaleItemRow[],
) {
  for (const item of items) {
    if (await isServiceProductTypeById(item.productTypeId)) {
      continue;
    }
    const ref = saleItemStockOutRef(saleId, item.id);
    if (await stockMovementExistsByDocumentRef(tx, ref)) {
      continue;
    }
    throw new ValidationError(
      [
        {
          path: "items",
          message: `Item ${item.id} sem baixa de estoque registrada`,
        },
      ],
      "Estoque pendente na venda",
    );
  }
}

/** Devolucao parcial/total via documento de devolucao (pedido finalizado). */
export async function applySaleReturnDocumentItemStockIn(
  tx: Tx,
  params: {
    enterpriseId: string;
    userId: string | null;
    salesReturnId: string;
    returnOrder: number;
    saleOrderNumber: number;
    returnItem: {
      quantity: string;
      saleItem: SaleItemRow;
    };
  },
) {
  const {
    enterpriseId,
    userId,
    salesReturnId,
    returnOrder,
    saleOrderNumber,
    returnItem,
  } = params;
  const item = returnItem.saleItem;
  if (await isServiceProductTypeById(item.productTypeId)) {
    return;
  }

  const documentRef = saleReturnDocumentItemRef(salesReturnId);
  if (await stockMovementExistsByDocumentRef(tx, documentRef)) {
    return;
  }

  await createStockMovementInTx(tx, {
    enterpriseId,
    userId,
    input: {
      type: "DEVOLUCAO",
      productsEnterprisesId: item.productsEnterprisesId,
      quantity: Number(returnItem.quantity),
      toLocationsId: item.locationsId ?? undefined,
      toStockBatchId: item.stockBatchId,
      documentRef,
      notes: `Devolucao ${returnOrder} pedido ${saleOrderNumber}`,
    },
  });
}

export async function applySaleStockMovements(
  tx: Tx,
  params: {
    enterpriseId: string;
    userId: string | null;
    saleId: string;
    orderNumber: number;
    items: SaleItemRow[];
    mode: "VENDA" | "DEVOLUCAO";
  },
) {
  const { enterpriseId, userId, saleId, orderNumber, items, mode } = params;

  for (const item of items) {
    if (mode === "VENDA") {
      await applySaleItemStockOut(tx, {
        enterpriseId,
        userId,
        saleId,
        orderNumber,
        item,
      });
    } else {
      await applySaleItemStockReturn(tx, {
        enterpriseId,
        userId,
        saleId,
        orderNumber,
        item,
      });
    }
  }
}

/** Sincroniza estoque ao alterar item de venda ABERTA (type VENDA). */
export async function syncSaleItemStockOnUpdate(
  tx: Tx,
  params: {
    enterpriseId: string;
    userId: string | null;
    saleId: string;
    orderNumber: number;
    oldItem: SaleItemRow;
    newItem: SaleItemInput;
  },
) {
  const { enterpriseId, userId, saleId, orderNumber, oldItem, newItem } =
    params;

  if (
    (await isServiceProductTypeById(oldItem.productTypeId)) ||
    (await isServiceProductTypeById(newItem.productTypeId))
  ) {
    return;
  }

  if (!saleItemStockFieldsChanged(oldItem, newItem)) {
    return;
  }

  const outRef = saleItemStockOutRef(saleId, oldItem.id);
  const returnRef = saleItemStockReturnRef(saleId, oldItem.id);
  const hasOut = await stockMovementExistsByDocumentRef(tx, outRef);
  const hasReturn = await stockMovementExistsByDocumentRef(tx, returnRef);

  if (hasOut && !hasReturn) {
    await applySaleItemStockReturn(tx, {
      enterpriseId,
      userId,
      saleId,
      orderNumber,
      item: oldItem,
    });
  }

  const lastRevision = await getLastSaleItemStockRevision(tx, saleId, oldItem.id);
  if (lastRevision !== null) {
    await applySaleItemStockRevisionReturn(tx, {
      enterpriseId,
      userId,
      saleId,
      orderNumber,
      item: oldItem,
      revision: lastRevision,
      quantity: Number(oldItem.quantity),
    });
  }

  await assertSaleItemStockAvailable(tx, enterpriseId, newItem, "body");

  const nextRevision = (lastRevision ?? 0) + 1;
  const revisionOutRef = saleItemStockRevisionOutRef(
    saleId,
    oldItem.id,
    nextRevision,
  );

  if (await stockMovementExistsByDocumentRef(tx, revisionOutRef)) {
    return;
  }

  await createStockMovementInTx(tx, {
    enterpriseId,
    userId,
    input: {
      type: "VENDA",
      productsEnterprisesId: newItem.productsEnterprisesId,
      quantity: newItem.quantity,
      fromLocationsId: newItem.locationsId ?? undefined,
      fromStockBatchId: newItem.stockBatchId ?? null,
      documentRef: revisionOutRef,
      notes: `Venda pedido ${orderNumber} (revisao ${nextRevision})`,
    },
  });
}
