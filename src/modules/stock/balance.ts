import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  productsEnterprises,
  stockBatchBalances,
  stockBatches,
  stockLocations,
  stockSectorsRental,
} from "../../db/schema.js";
import {
  NotFoundError,
  ValidationError,
} from "../../shared/errors/app-error.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
  },
): Promise<number> {
  const { productsEnterprises, stockLocationId, stockBatchId } = params;

  if (productsEnterprises.controlsBatch) {
    if (!stockBatchId) return 0;
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
    const rows = await tx
      .select()
      .from(stockBatchBalances)
      .where(
        and(
          eq(stockBatchBalances.stockBatchId, stockBatchId),
          eq(stockBatchBalances.stockLocationId, stockLocationId),
        ),
      )
      .limit(1);
    const existing = rows[0];
    const before = existing ? Number(existing.quantity) : 0;
    const after = before + delta;
    if (after < 0) {
      throw new ValidationError(
        [{ path: "body.quantity", message: "Saldo insuficiente no lote/locacao" }],
        "Saldo insuficiente",
      );
    }
    if (existing) {
      await tx
        .update(stockBatchBalances)
        .set({ quantity: after.toString(), updatedAt: new Date() })
        .where(eq(stockBatchBalances.id, existing.id));
    } else if (delta > 0) {
      await tx.insert(stockBatchBalances).values({
        stockBatchId,
        stockLocationId,
        quantity: after.toString(),
      });
    }
    return { before, after };
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

  const rows = await tx
    .select()
    .from(stockSectorsRental)
    .where(
      and(
        eq(stockSectorsRental.productsEnterprisesId, productsEnterprises.id),
        eq(stockSectorsRental.stockLocationId, stockLocationId),
      ),
    )
    .limit(1);
  const existing = rows[0];
  const before = existing ? Number(existing.quantity) : 0;
  const after = before + delta;
  if (after < 0) {
    throw new ValidationError(
      [{ path: "body.quantity", message: "Saldo insuficiente na locacao" }],
      "Saldo insuficiente",
    );
  }
  if (existing) {
    await tx
      .update(stockSectorsRental)
      .set({ quantity: after.toString(), updatedAt: new Date() })
      .where(eq(stockSectorsRental.id, existing.id));
  } else if (delta > 0) {
    await tx.insert(stockSectorsRental).values({
      productsEnterprisesId: productsEnterprises.id,
      stockLocationId,
      quantity: after.toString(),
    });
  }
  return { before, after };
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
