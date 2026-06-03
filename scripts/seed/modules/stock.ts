import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../../../src/db/index.js";
import {
  productsEnterprises,
  stockBatchBalances,
  stockBatches,
  stockLocations,
  stockMinMax,
  stockMovements,
  stockSectors,
  stockSectorsRental,
} from "../../../src/db/schema.js";
import { SEED_VOLUMES } from "../lib/constants.js";
import { resolveBootstrapContext } from "../lib/context.js";
import type { ProductCatalogRefs } from "./product-catalog.js";

export type StockSeedRefs = {
  sectorIds: string[];
  locationIds: string[];
  batchIds: string[];
};

export async function seedStock(
  catalog: ProductCatalogRefs,
): Promise<StockSeedRefs> {
  const ctx = await resolveBootstrapContext();
  console.log("Seed estoque (setores, locacoes, saldos)...");

  const sectorIds: string[] = [];
  const locationIds: string[] = [];
  const batchIds: string[] = [];

  for (let s = 1; s <= SEED_VOLUMES.setoresEstoque; s++) {
    const desc = `Setor Seed ${String(s).padStart(2, "0")}`;
    let sectorId: string;

    const existingSector = (
      await db
        .select({ id: stockSectors.id })
        .from(stockSectors)
        .where(eq(stockSectors.description, desc))
        .limit(1)
    )[0];

    if (existingSector) {
      sectorId = existingSector.id;
    } else {
      const [row] = await db
        .insert(stockSectors)
        .values({ description: desc })
        .returning();
      sectorId = row!.id;
      console.log(`  Setor criado: ${desc}`);
    }
    sectorIds.push(sectorId);

    for (let l = 1; l <= SEED_VOLUMES.locacoesPorSetor; l++) {
      const code = `S${String(s)}-L${String(l).padStart(2, "0")}`;
      let locationId: string;

      const existingLoc = (
        await db
          .select({ id: stockLocations.id })
          .from(stockLocations)
          .where(
            and(
              eq(stockLocations.stockSectorId, sectorId),
              eq(stockLocations.code, code),
            ),
          )
          .limit(1)
      )[0];

      if (existingLoc) {
        locationId = existingLoc.id;
      } else {
        const [row] = await db
          .insert(stockLocations)
          .values({
            code,
            description: `Locacao ${code}`,
            stockSectorId: sectorId,
            status: "ATIVO",
          })
          .returning();
        locationId = row!.id;
      }
      locationIds.push(locationId);
    }
  }

  for (let i = 0; i < catalog.productsEnterprisesIds.length; i++) {
    const peId = catalog.productsEnterprisesIds[i]!;
    const locationId = locationIds[i % locationIds.length]!;
    const quantity = String(50 + (i % 10) * 15);

    const peRow = (
      await db
        .select({ controlsBatch: productsEnterprises.controlsBatch })
        .from(productsEnterprises)
        .where(eq(productsEnterprises.id, peId))
        .limit(1)
    )[0];

    if (peRow?.controlsBatch) {
      const batchNumber = `LOTE-SEED-${String(i + 1).padStart(4, "0")}`;
      let batchId: string;

      const existingBatch = (
        await db
          .select({ id: stockBatches.id })
          .from(stockBatches)
          .where(
            and(
              eq(stockBatches.productsEnterprisesId, peId),
              eq(stockBatches.batchNumber, batchNumber),
            ),
          )
          .limit(1)
      )[0];

      if (existingBatch) {
        batchId = existingBatch.id;
      } else {
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 2);
        const [row] = await db
          .insert(stockBatches)
          .values({
            batchNumber,
            productsEnterprisesId: peId,
            manufacturingDate: new Date(),
            expiryDate: expiry,
            documentRef: "NF-SEED-001",
            status: "ATIVO",
            notes: "Lote seed teste",
          })
          .returning();
        batchId = row!.id;
      }
      batchIds.push(batchId);

      const balanceExisting = (
        await db
          .select({ id: stockBatchBalances.id })
          .from(stockBatchBalances)
          .where(
            and(
              eq(stockBatchBalances.stockBatchId, batchId),
              eq(stockBatchBalances.stockLocationId, locationId),
            ),
          )
          .limit(1)
      )[0];

      if (!balanceExisting) {
        await db.insert(stockBatchBalances).values({
          stockBatchId: batchId,
          stockLocationId: locationId,
          quantity,
        });
      }
    } else {
      const rentalExisting = (
        await db
          .select({ id: stockSectorsRental.id })
          .from(stockSectorsRental)
          .where(
            and(
              eq(stockSectorsRental.productsEnterprisesId, peId),
              eq(stockSectorsRental.stockLocationId, locationId),
            ),
          )
          .limit(1)
      )[0];

      if (!rentalExisting) {
        await db.insert(stockSectorsRental).values({
          productsEnterprisesId: peId,
          stockLocationId: locationId,
          quantity,
        });
      }
    }

    const minMaxExisting = (
      await db
        .select({ id: stockMinMax.id })
        .from(stockMinMax)
        .where(eq(stockMinMax.productsEnterprisesId, peId))
        .limit(1)
    )[0];

    if (!minMaxExisting) {
      await db.insert(stockMinMax).values({
        quantityMin: "5.0000",
        quantityMax: "500.0000",
        productsEnterprisesId: peId,
      });
    }
  }

  const samplePeId = catalog.productsEnterprisesIds[0];
  const sampleLocId = locationIds[0];
  if (samplePeId && sampleLocId) {
    const movementExisting = (
      await db
        .select({ id: stockMovements.id })
        .from(stockMovements)
        .where(eq(stockMovements.documentRef, "SEED-ENTRADA-001"))
        .limit(1)
    )[0];

    if (!movementExisting) {
      const sectorId = sectorIds[0]!;
      await db.insert(stockMovements).values({
        transferGroupId: randomUUID(),
        type: "ENTRADA",
        productsEnterprisesId: samplePeId,
        toStockSectorId: sectorId,
        toStockLocationId: sampleLocId,
        quantity: "100.0000",
        toQuantityBefore: "0.0000",
        toQuantityAfter: "100.0000",
        userId: ctx.adminUserId,
        notes: "Entrada inicial seed",
        documentRef: "SEED-ENTRADA-001",
      });
    }
  }

  console.log(
    `Seed estoque concluido (${String(sectorIds.length)} setores, ${String(locationIds.length)} locacoes).`,
  );

  return { sectorIds, locationIds, batchIds };
}

export async function resolveStockLocationForProduct(
  productsEnterprisesId: string,
): Promise<{
  stockSectorId: string;
  stockLocationId: string;
  stockBatchId: string | null;
}> {
  const peRow = (
    await db
      .select({ controlsBatch: productsEnterprises.controlsBatch })
      .from(productsEnterprises)
      .where(eq(productsEnterprises.id, productsEnterprisesId))
      .limit(1)
  )[0];

  if (peRow?.controlsBatch) {
    const batchRow = (
      await db
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
      const locRow = (
        await db
          .select({
            sectorId: stockLocations.stockSectorId,
          })
          .from(stockLocations)
          .where(eq(stockLocations.id, batchRow.locationId))
          .limit(1)
      )[0];

      return {
        stockSectorId: locRow!.sectorId,
        stockLocationId: batchRow.locationId,
        stockBatchId: batchRow.batchId,
      };
    }
  }

  const rentalRow = (
    await db
      .select({ locationId: stockSectorsRental.stockLocationId })
      .from(stockSectorsRental)
      .where(eq(stockSectorsRental.productsEnterprisesId, productsEnterprisesId))
      .limit(1)
  )[0];

  if (rentalRow) {
    const locRow = (
      await db
        .select({ sectorId: stockLocations.stockSectorId })
        .from(stockLocations)
        .where(eq(stockLocations.id, rentalRow.locationId))
        .limit(1)
    )[0];

    return {
      stockSectorId: locRow!.sectorId,
      stockLocationId: rentalRow.locationId,
      stockBatchId: null,
    };
  }

  throw new Error(
    `Saldo de estoque nao encontrado para produto ${productsEnterprisesId}`,
  );
}
