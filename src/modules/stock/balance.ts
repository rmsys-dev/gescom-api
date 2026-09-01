import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  productsEnterprises,
  stockBatchBalances,
  stockBatches,
  stockLocations,
  stockSectors,
  stockSectorsRental,
} from "../../db/schema.js";
import { isPostgresUniqueViolation } from "../../shared/db/postgres-errors.js";
import {
  NotFoundError,
  ValidationError,
} from "../../shared/errors/app-error.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type StockBalanceRow = {
  id: string;
  quantity: string;
};

function insufficientStock(path: string, message: string): ValidationError {
  return new ValidationError([{ path, message }], "Saldo insuficiente");
}

async function lockStockBatchBalanceRow(
  tx: Tx,
  stockBatchId: string,
  stockLocationId: string,
): Promise<StockBalanceRow | undefined> {
  const rows = await tx
    .select({
      id: stockBatchBalances.id,
      quantity: stockBatchBalances.quantity,
    })
    .from(stockBatchBalances)
    .where(
      and(
        eq(stockBatchBalances.stockBatchId, stockBatchId),
        eq(stockBatchBalances.stockLocationId, stockLocationId),
      ),
    )
    .for("update")
    .limit(1);
  return rows[0];
}

async function lockStockSectorRentalRow(
  tx: Tx,
  productsEnterprisesId: string,
  stockLocationId: string,
): Promise<StockBalanceRow | undefined> {
  const rows = await tx
    .select({
      id: stockSectorsRental.id,
      quantity: stockSectorsRental.quantity,
    })
    .from(stockSectorsRental)
    .where(
      and(
        eq(stockSectorsRental.productsEnterprisesId, productsEnterprisesId),
        eq(stockSectorsRental.stockLocationId, stockLocationId),
      ),
    )
    .for("update")
    .limit(1);
  return rows[0];
}

async function applyDeltaToLockedBalance(params: {
  delta: number;
  existing: StockBalanceRow | undefined;
  insufficientPath: string;
  insufficientMessage: string;
  insert: () => Promise<StockBalanceRow>;
  update: (id: string, after: string) => Promise<void>;
  retryLoad: () => Promise<StockBalanceRow | undefined>;
}): Promise<{ before: number; after: number }> {
  let { existing } = params;
  const { delta, insufficientPath, insufficientMessage, insert, update, retryLoad } =
    params;

  if (!existing) {
    if (delta < 0) {
      throw insufficientStock(insufficientPath, insufficientMessage);
    }
    if (delta === 0) {
      return { before: 0, after: 0 };
    }
    try {
      const inserted = await insert();
      return { before: 0, after: Number(inserted.quantity) };
    } catch (err) {
      if (!isPostgresUniqueViolation(err)) {
        throw err;
      }
      existing = await retryLoad();
      if (!existing) {
        throw err;
      }
    }
  }

  const before = Number(existing.quantity);
  const after = before + delta;
  if (after < 0) {
    throw insufficientStock(insufficientPath, insufficientMessage);
  }
  await update(existing.id, after.toString());
  return { before, after };
}

export type ProductEnterpriseStock = {
  id: string;
  controlsBatch: boolean;
  measurementUnitId: string;
  productTypeId: string;
};

export async function getProductEnterpriseForStock( // PRODUTO EMPRESA  
  enterpriseId: string,
  productsEnterprisesId: string,
  tx?: Tx,
): Promise<ProductEnterpriseStock> {
  const runner = tx ?? db;
  const row = (
    await runner
      .select({
        id: productsEnterprises.id,
        controlsBatch: productsEnterprises.controlsBatch,
        measurementUnitId: productsEnterprises.measurementUnitId,
        productTypeId: productsEnterprises.productTypeId,
      })
      .from(productsEnterprises)
      .where(
        and(
          eq(productsEnterprises.id, productsEnterprisesId),
          eq(productsEnterprises.enterprisesId, enterpriseId),
        ),
      )
      .limit(1)
  )[0];
  if (!row) {
    throw new NotFoundError(
      "Produto da empresa nao encontrado",
      "PRODUCT_ENTERPRISE_NOT_FOUND",
    );
  }
  return row;
}

export async function assertStockSectorBelongsToEnterprise(
  enterpriseId: string,
  stockSectorId: string,
  tx?: Tx,
) {
  const runner = tx ?? db;
  const row = (
    await runner
      .select({ id: stockSectors.id })
      .from(stockSectors)
      .where(
        and(
          eq(stockSectors.id, stockSectorId),
          eq(stockSectors.enterprisesId, enterpriseId),
        ),
      )
      .limit(1)
  )[0];
  if (!row) {
    throw new NotFoundError(
      "Setor de estoque nao encontrado",
      "STOCK_SECTOR_NOT_FOUND",
    );
  }
  return row;
}

export async function assertStockLocationBelongsToEnterprise(
  enterpriseId: string,
  stockLocationId: string,
  tx?: Tx,
) {
  const runner = tx ?? db;
  const row = (
    await runner
      .select({ id: stockLocations.id })
      .from(stockLocations)
      .innerJoin(stockSectors, eq(stockLocations.stockSectorId, stockSectors.id))
      .where(
        and(
          eq(stockLocations.id, stockLocationId),
          eq(stockSectors.enterprisesId, enterpriseId),
        ),
      )
      .limit(1)
  )[0];
  if (!row) {
    throw new NotFoundError(
      "Locacao fisica de estoque nao encontrada",
      "STOCK_LOCATION_NOT_FOUND",
    );
  }
  return row;
}

export async function getLocationSectorId( // LOCAÇÃO FÍSICA DENTRO DO SETOR
  stockLocationId: string,
  tx?: Tx,
): Promise<{ stockSectorId: string }> {
  const runner = tx ?? db;
  const row = (
    await runner
      .select({ stockSectorId: stockLocations.stockSectorId })
      .from(stockLocations)
      .where(eq(stockLocations.id, stockLocationId))
      .limit(1)
  )[0];
  if (!row) {
    throw new NotFoundError(
      "Locacao fisica de estoque nao encontrada",
      "STOCK_LOCATION_NOT_FOUND",
    );
  }
  return row;
}

export async function assertBatchBelongsToProduct( // LOTE PERTENCE AO PRODUTO EMPRESA
  productsEnterprisesId: string,
  stockBatchId: string,
  tx?: Tx,
) {
  const runner = tx ?? db;
  const row = (
    await runner
      .select({ id: stockBatches.id })
      .from(stockBatches)
      .where(
        and(
          eq(stockBatches.id, stockBatchId),
          eq(stockBatches.productsEnterprisesId, productsEnterprisesId),
        ),
      )
      .limit(1)
  )[0];
  if (!row) {
    throw new NotFoundError("Lote nao encontrado", "STOCK_BATCH_NOT_FOUND");
  }
}

export async function getStockBalance(   // SALDO DE ESTOQUE POR LOCAÇÃO FÍSICA DENTRO DO SETOR OU LOTE
  tx: Tx,
  params: {
    productsEnterprises: ProductEnterpriseStock;
    stockLocationId: string;
    stockBatchId?: string | null;
    /** Bloqueia a linha de saldo até o fim da transação (evita TOCTOU com assert + adjust). */
    lock?: boolean;
  },
): Promise<number> {
  const { productsEnterprises, stockLocationId, stockBatchId, lock } = params;

  if (productsEnterprises.controlsBatch) {
    if (!stockBatchId) return 0;
    if (lock) {
      const row = await lockStockBatchBalanceRow(tx, stockBatchId, stockLocationId);
      return row ? Number(row.quantity) : 0;
    }
    const rows = await tx
      .select({ quantity: stockBatchBalances.quantity })
      .from(stockBatchBalances)
      .where(
        and(
          eq(stockBatchBalances.stockBatchId, stockBatchId),
          eq(stockBatchBalances.stockLocationId, stockLocationId),
        ),
      )
      .limit(1);
    return rows[0] ? Number(rows[0].quantity) : 0;
  }

  if (lock) {
    const row = await lockStockSectorRentalRow(
      tx,
      productsEnterprises.id,
      stockLocationId,
    );
    return row ? Number(row.quantity) : 0;
  }

  const rows = await tx
    .select({ quantity: stockSectorsRental.quantity })
    .from(stockSectorsRental)
    .where(
      and(
        eq(stockSectorsRental.productsEnterprisesId, productsEnterprises.id),
        eq(stockSectorsRental.stockLocationId, stockLocationId),
      ),
    )
    .limit(1);
  return rows[0] ? Number(rows[0].quantity) : 0;
}

export async function assertSufficientStock(  // VERIFICA SE O SALDO DE ESTOQUE É SUFICIENTE
  tx: Tx,
  params: {
    enterpriseId: string;
    productsEnterprisesId: string;
    stockLocationId: string;
    stockBatchId?: string | null;
    quantity: number;
    pathPrefix?: string;
  },
) {
  const pe = await getProductEnterpriseForStock(  
    params.enterpriseId,
    params.productsEnterprisesId,
    tx,
  );
  const available = await getStockBalance(tx, {
    productsEnterprises: pe,
    stockLocationId: params.stockLocationId,
    stockBatchId: params.stockBatchId,
    lock: true,
  });
  if (available < params.quantity) {
    throw new ValidationError(
      [
        {
          path: params.pathPrefix ?? "body.quantity",
          message: `Saldo insuficiente. Disponivel: ${available}`,
        },
      ],
      "Saldo insuficiente",
    );
  }
}

export async function adjustStockBalance(  // AJUSTA O SALDO DE ESTOQUE POR LOCAÇÃO FÍSICA DENTRO DO SETOR OU LOTE
  tx: Tx,
  params: {
    productsEnterprises: ProductEnterpriseStock;
    stockLocationId: string;
    stockBatchId?: string | null;
    delta: number;
  },
): Promise<{ before: number; after: number }> {
  const { productsEnterprises, stockLocationId, stockBatchId, delta } = params;

  if (productsEnterprises.controlsBatch) {
    if (!stockBatchId) {
      throw new ValidationError(
        [
          {
            path: "body.stockBatchId",
            message: "Produto com controle de lote exige stockBatchId",
          },
        ],
        "Lote obrigatorio",
      );
    }
    await assertBatchBelongsToProduct(
      productsEnterprises.id,
      stockBatchId,
      tx,
    );
    const existing = await lockStockBatchBalanceRow(
      tx,
      stockBatchId,
      stockLocationId,
    );
    return applyDeltaToLockedBalance({
      delta,
      existing,
      insufficientPath: "body.quantity",
      insufficientMessage: "Saldo insuficiente no lote/locacao",
      insert: async () => {
        const [row] = await tx
          .insert(stockBatchBalances)
          .values({
            stockBatchId,
            stockLocationId,
            quantity: delta.toString(),
          })
          .returning({
            id: stockBatchBalances.id,
            quantity: stockBatchBalances.quantity,
          });
        if (!row) {
          throw new Error("Falha ao criar saldo de lote");
        }
        return row;
      },
      update: async (id, after) => {
        await tx
          .update(stockBatchBalances)
          .set({ quantity: after, updatedAt: new Date() })
          .where(eq(stockBatchBalances.id, id));
      },
      retryLoad: () => lockStockBatchBalanceRow(tx, stockBatchId, stockLocationId),
    });
  }

  if (stockBatchId) {
    throw new ValidationError(
      [
        {
          path: "body.stockBatchId",
          message: "Produto sem controle de lote nao aceita stockBatchId",
        },
      ],
      "Lote nao permitido",
    );
  }

  const existing = await lockStockSectorRentalRow(
    tx,
    productsEnterprises.id,
    stockLocationId,
  );
  return applyDeltaToLockedBalance({
    delta,
    existing,
    insufficientPath: "body.quantity",
    insufficientMessage: "Saldo insuficiente na locacao",
    insert: async () => {
      const [row] = await tx
        .insert(stockSectorsRental)
        .values({
          productsEnterprisesId: productsEnterprises.id,
          stockLocationId,
          quantity: delta.toString(),
        })
        .returning({
          id: stockSectorsRental.id,
          quantity: stockSectorsRental.quantity,
        });
      if (!row) {
        throw new Error("Falha ao criar saldo de locacao");
      }
      return row;
    },
    update: async (id, after) => {
      await tx
        .update(stockSectorsRental)
        .set({ quantity: after, updatedAt: new Date() })
        .where(eq(stockSectorsRental.id, id));
    },
    retryLoad: () =>
      lockStockSectorRentalRow(tx, productsEnterprises.id, stockLocationId),
  });
}

export type DefaultSaleItemStockRefs = {
  stockSectorId: string;
  stockLocationId: string;
  stockBatchId: string | null;
};

export async function resolveDefaultSaleItemStockRefs(
  enterpriseId: string,
  productsEnterprisesId: string,
  tx?: Tx,
  pathPrefix = "items",
): Promise<DefaultSaleItemStockRefs> {
  const runner = tx ?? db;
  const pe = await getProductEnterpriseForStock(
    enterpriseId,
    productsEnterprisesId,
    tx,
  );

  if (pe.controlsBatch) {
    const batchRow = (
      await runner
        .select({
          batchId: stockBatches.id,
          locationId: stockBatchBalances.stockLocationId,
        })
        .from(stockBatches)
        .innerJoin(
          stockBatchBalances,
          eq(stockBatchBalances.stockBatchId, stockBatches.id),
        )
        .where(eq(stockBatches.productsEnterprisesId, productsEnterprisesId))
        .limit(1)
    )[0];

    if (batchRow) {
      const locRow = await getLocationSectorId(batchRow.locationId, tx);
      return {
        stockSectorId: locRow.stockSectorId,
        stockLocationId: batchRow.locationId,
        stockBatchId: batchRow.batchId,
      };
    }
  }

  const rentalRow = (
    await runner
      .select({ locationId: stockSectorsRental.stockLocationId })
      .from(stockSectorsRental)
      .where(eq(stockSectorsRental.productsEnterprisesId, productsEnterprisesId))
      .limit(1)
  )[0];

  if (rentalRow) {
    const locRow = await getLocationSectorId(rentalRow.locationId, tx);
    return {
      stockSectorId: locRow.stockSectorId,
      stockLocationId: rentalRow.locationId,
      stockBatchId: null,
    };
  }

  throw new ValidationError(
    [
      {
        path: `${pathPrefix}.productsEnterprisesId`,
        message: "Produto sem estoque configurado na empresa",
      },
    ],
    "Estoque nao configurado",
  );
}
