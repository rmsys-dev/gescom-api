import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  productsEnterprises,
  stockBatchBalances,
  stockBatches,
  locations,
  sectors,
  sectorsRental,
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
  locationId: string,
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
        eq(stockBatchBalances.locationsId, locationId),
      ),
    )
    .for("update")
    .limit(1);
  return rows[0];
}

async function lockProductEnterpriseStockBalance(
  tx: Tx,
  productsEnterprisesId: string,
): Promise<StockBalanceRow> {
  const rows = await tx
    .select({
      id: productsEnterprises.id,
      quantity: productsEnterprises.stockBalance,
    })
    .from(productsEnterprises)
    .where(eq(productsEnterprises.id, productsEnterprisesId))
    .for("update")
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new NotFoundError(
      "Produto da empresa nao encontrado",
      "PRODUCT_ENTERPRISE_NOT_FOUND",
    );
  }
  return row;
}

export async function applyProductStockBalanceDelta(
  tx: Tx,
  productsEnterprisesId: string,
  delta: number,
): Promise<{ before: number; after: number }> {
  const existing = await lockProductEnterpriseStockBalance(
    tx,
    productsEnterprisesId,
  );
  const before = Number(existing.quantity);
  const after = before + delta;
  if (after < 0) {
    throw insufficientStock("body.quantity", "Saldo insuficiente no produto");
  }
  if (delta === 0) {
    return { before, after: before };
  }
  await tx
    .update(productsEnterprises)
    .set({ stockBalance: after.toString(), updatedAt: new Date() })
    .where(eq(productsEnterprises.id, productsEnterprisesId));
  return { before, after };
}

export async function ensureStockSectorRentalAssignment(
  tx: Tx,
  productsEnterprisesId: string,
  locationId: string,
) {
  try {
    await tx
      .insert(sectorsRental)
      .values({
        productsEnterprisesId,
        locationsId: locationId,
      })
      .onConflictDoNothing({
        target: [sectorsRental.productsEnterprisesId, sectorsRental.locationsId],
      });
  } catch (err) {
    if (!isPostgresUniqueViolation(err)) {
      throw err;
    }
  }
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
  controlsRental: boolean;
  measurementUnitId: string;
  productTypeId: string;
};

export async function getProductEnterpriseForStock(
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
        controlsRental: productsEnterprises.controlsRental,
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

export async function assertSectorBelongsToEnterprise(
  enterpriseId: string,
  sectorId: string,
  tx?: Tx,
) {
  const runner = tx ?? db;
  const row = (
    await runner
      .select({ id: sectors.id })
      .from(sectors)
      .where(and(eq(sectors.id, sectorId), eq(sectors.enterprisesId, enterpriseId)))
      .limit(1)
  )[0];
  if (!row) {
    throw new NotFoundError(
      "Setor de estoque nao encontrado",
      "SECTOR_NOT_FOUND",
    );
  }
  return row;
}

export async function assertLocationBelongsToEnterprise(
  enterpriseId: string,
  locationId: string,
  tx?: Tx,
) {
  const runner = tx ?? db;
  const row = (
    await runner
      .select({ id: locations.id })
      .from(locations)
      .innerJoin(sectors, eq(locations.sectorId, sectors.id))
      .where(
        and(eq(locations.id, locationId), eq(sectors.enterprisesId, enterpriseId)),
      )
      .limit(1)
  )[0];
  if (!row) {
    throw new NotFoundError(
      "Locacao fisica de estoque nao encontrada",
      "LOCATION_NOT_FOUND",
    );
  }
  return row;
}

export async function getLocationSectorId(
  locationId: string,
  tx?: Tx,
): Promise<{ sectorId: string }> {
  const runner = tx ?? db;
  const row = (
    await runner
      .select({ sectorId: locations.sectorId })
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1)
  )[0];
  if (!row) {
    throw new NotFoundError(
      "Locacao fisica de estoque nao encontrada",
      "LOCATION_NOT_FOUND",
    );
  }
  return row;
}

export async function assertBatchBelongsToProduct(
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

export async function getStockBalance(
  tx: Tx,
  params: {
    productsEnterprises: ProductEnterpriseStock;
    lock?: boolean;
  },
): Promise<number> {
  const { productsEnterprises: pe, lock } = params;

  // Consulta sempre o saldo geral. Com lote, stock_batch_balances deve bater com este total.
  if (lock) {
    const row = await lockProductEnterpriseStockBalance(tx, pe.id);
    return Number(row.quantity);
  }

  const rows = await tx
    .select({ quantity: productsEnterprises.stockBalance })
    .from(productsEnterprises)
    .where(eq(productsEnterprises.id, pe.id))
    .limit(1);
  return rows[0] ? Number(rows[0].quantity) : 0;
}

export async function assertSufficientStock(
  tx: Tx,
  params: {
    enterpriseId: string;
    productsEnterprisesId: string;
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

export async function adjustStockBalance(
  tx: Tx,
  params: {
    productsEnterprises: ProductEnterpriseStock;
    locationId?: string | null;
    stockBatchId?: string | null;
    delta: number;
    skipProductBalance?: boolean;
  },
): Promise<{ before: number; after: number }> {
  const {
    productsEnterprises,
    locationId,
    stockBatchId,
    delta,
    skipProductBalance,
  } = params;

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
    if (!locationId) {
      throw new ValidationError(
        [
          {
            path: "body.toLocationsId",
            message: "Produto com controle de lote exige locacao",
          },
        ],
        "Locacao obrigatoria",
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
      locationId,
    );
    const result = await applyDeltaToLockedBalance({
      delta,
      existing,
      insufficientPath: "body.quantity",
      insufficientMessage: "Saldo insuficiente no lote/locacao",
      insert: async () => {
        const [row] = await tx
          .insert(stockBatchBalances)
          .values({
            stockBatchId,
            locationsId: locationId,
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
      retryLoad: () => lockStockBatchBalanceRow(tx, stockBatchId, locationId),
    });
    if (!skipProductBalance) {
      await applyProductStockBalanceDelta(tx, productsEnterprises.id, delta);
    }
    return result;
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

  if (locationId) {
    if (!productsEnterprises.controlsRental) {
      throw new ValidationError(
        [
          {
            path: "body.toLocationsId",
            message: "Produto sem controle de locacao nao aceita locacao",
          },
        ],
        "Locacao nao permitida",
      );
    }
    const result = await applyProductStockBalanceDelta(
      tx,
      productsEnterprises.id,
      delta,
    );
    await ensureStockSectorRentalAssignment(
      tx,
      productsEnterprises.id,
      locationId,
    );
    return result;
  }

  if (productsEnterprises.controlsRental) {
    throw new ValidationError(
      [
        {
          path: "body.toLocationsId",
          message: "Produto com controle de locacao exige locacao",
        },
      ],
      "Locacao obrigatoria",
    );
  }

  return applyProductStockBalanceDelta(tx, productsEnterprises.id, delta);
}

export type DefaultSaleItemStockRefs = {
  sectorId: string;
  locationsId: string;
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
          locationsId: stockBatchBalances.locationsId,
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
      const locRow = await getLocationSectorId(batchRow.locationsId, tx);
      return {
        sectorId: locRow.sectorId,
        locationsId: batchRow.locationsId,
        stockBatchId: batchRow.batchId,
      };
    }
  }

  const rentalRow = (
    await runner
      .select({ locationId: sectorsRental.locationsId })
      .from(sectorsRental)
      .where(eq(sectorsRental.productsEnterprisesId, productsEnterprisesId))
      .limit(1)
  )[0];

  if (rentalRow) {
    const locRow = await getLocationSectorId(rentalRow.locationId, tx);
    return {
      sectorId: locRow.sectorId,
      locationsId: rentalRow.locationId,
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
