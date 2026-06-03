import { and, eq } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import {
  icmsTaxation,
  measurementUnits,
  pisCofinsSituation,
  prices,
  productApplication,
  productBrands,
  productGroups,
  productSubgroups,
  productTaxation,
  productTypes,
  products,
  productsCest,
  productsEnterprises,
  productsNcm,
} from "../../../src/db/schema.js";
import { SEED_VOLUMES } from "../lib/constants.js";
import { resolveBootstrapContext } from "../lib/context.js";

export type ProductCatalogRefs = {
  measurementUnitId: string;
  productTypeId: string;
  productGroupId: string;
  productSubgroupId: string;
  productBrandId: string;
  productsNcmId: string;
  icmsTaxationId: string;
  pisCofinsSituationIds: { entrada: string; saida: string };
  productsEnterprisesIds: string[];
};

async function ensureByUnique<T extends { id: string }>(
  label: string,
  find: () => Promise<T | undefined>,
  create: () => Promise<T>,
): Promise<string> {
  const existing = await find();
  if (existing) {
    return existing.id;
  }
  const row = await create();
  console.log(`  Catalogo criado: ${label}`);
  return row.id;
}

export async function seedProductCatalog(): Promise<ProductCatalogRefs> {
  const ctx = await resolveBootstrapContext();
  console.log(`Seed catalogo de produtos (${String(SEED_VOLUMES.products)} itens)...`);

  const measurementUnitId = await ensureByUnique(
    "Unidade UN",
    async () =>
      (
        await db
          .select()
          .from(measurementUnits)
          .where(eq(measurementUnits.unit, "UN"))
          .limit(1)
      )[0],
    async () => {
      const [row] = await db
        .insert(measurementUnits)
        .values({ unit: "UN", description: "Unidade" })
        .returning();
      return row!;
    },
  );

  await ensureByUnique(
    "Unidade CX",
    async () =>
      (
        await db
          .select()
          .from(measurementUnits)
          .where(eq(measurementUnits.unit, "CX"))
          .limit(1)
      )[0],
    async () => {
      const [row] = await db
        .insert(measurementUnits)
        .values({ unit: "CX", description: "Caixa" })
        .returning();
      return row!;
    },
  );

  const productTypeId = await ensureByUnique(
    "Tipo 00 Mercadoria",
    async () =>
      (
        await db
          .select()
          .from(productTypes)
          .where(eq(productTypes.type, "00"))
          .limit(1)
      )[0],
    async () => {
      const [row] = await db
        .insert(productTypes)
        .values({ type: "00", description: "Mercadoria para revenda" })
        .returning();
      return row!;
    },
  );

  const productGroupId = await ensureByUnique(
    "Grupo Geral",
    async () =>
      (
        await db
          .select()
          .from(productGroups)
          .where(eq(productGroups.description, "Geral Seed"))
          .limit(1)
      )[0],
    async () => {
      const [row] = await db
        .insert(productGroups)
        .values({ description: "Geral Seed", profitMargin: "25.0000" })
        .returning();
      return row!;
    },
  );

  const productSubgroupId = await ensureByUnique(
    "Subgrupo Padrao",
    async () =>
      (
        await db
          .select()
          .from(productSubgroups)
          .where(eq(productSubgroups.description, "Padrao Seed"))
          .limit(1)
      )[0],
    async () => {
      const [row] = await db
        .insert(productSubgroups)
        .values({ description: "Padrao Seed" })
        .returning();
      return row!;
    },
  );

  const productBrandId = await ensureByUnique(
    "Marca Seed",
    async () =>
      (
        await db
          .select()
          .from(productBrands)
          .where(eq(productBrands.description, "Marca Seed"))
          .limit(1)
      )[0],
    async () => {
      const [row] = await db
        .insert(productBrands)
        .values({ description: "Marca Seed" })
        .returning();
      return row!;
    },
  );

  const productsNcmId = await ensureByUnique(
    "NCM 84713012",
    async () =>
      (
        await db
          .select()
          .from(productsNcm)
          .where(eq(productsNcm.ncm, "84713012"))
          .limit(1)
      )[0],
    async () => {
      const [row] = await db
        .insert(productsNcm)
        .values({
          ncm: "84713012",
          description: "Maquinas automaticas processamento dados portateis",
        })
        .returning();
      return row!;
    },
  );

  await ensureByUnique(
    "CEST 2105300",
    async () =>
      (
        await db
          .select()
          .from(productsCest)
          .where(eq(productsCest.cest, "2105300"))
          .limit(1)
      )[0],
    async () => {
      const [row] = await db
        .insert(productsCest)
        .values({
          cest: "2105300",
          description: "CEST seed teste",
          productsNcmId,
        })
        .returning();
      return row!;
    },
  );

  const icmsTaxationId = await ensureByUnique(
    "ICMS 00",
    async () =>
      (
        await db
          .select()
          .from(icmsTaxation)
          .where(eq(icmsTaxation.icms, "00"))
          .limit(1)
      )[0],
    async () => {
      const [row] = await db
        .insert(icmsTaxation)
        .values({
          icms: "00",
          icmsRate: "18.00",
          simplesIcmsRate: "0.00",
          description: "Tributada integralmente",
        })
        .returning();
      return row!;
    },
  );

  const pisEntradaId = await ensureByUnique(
    "PIS entrada 50",
    async () =>
      (
        await db
          .select()
          .from(pisCofinsSituation)
          .where(eq(pisCofinsSituation.cst, "50"))
          .limit(1)
      )[0],
    async () => {
      const [row] = await db
        .insert(pisCofinsSituation)
        .values({
          cst: "50",
          description: "Operacao com direito a credito",
          type: "ENTRADA",
          framing: 1,
          pisRate: "1.6500",
          cofinsRate: "7.6000",
        })
        .returning();
      return row!;
    },
  );

  const pisSaidaId = await ensureByUnique(
    "PIS saida 01",
    async () =>
      (
        await db
          .select()
          .from(pisCofinsSituation)
          .where(eq(pisCofinsSituation.cst, "01"))
          .limit(1)
      )[0],
    async () => {
      const [row] = await db
        .insert(pisCofinsSituation)
        .values({
          cst: "01",
          description: "Operacao tributavel basica",
          type: "SAIDA",
          framing: 1,
          pisRate: "1.6500",
          cofinsRate: "7.6000",
        })
        .returning();
      return row!;
    },
  );

  const productsEnterprisesIds: string[] = [];

  for (let i = 1; i <= SEED_VOLUMES.products; i++) {
    const barCode = `SEED7900000${String(i).padStart(5, "0")}`;
    const description = `Produto Seed ${String(i).padStart(3, "0")}`;

    let productId: string;
    const existingProduct = (
      await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.barCode, barCode))
        .limit(1)
    )[0];

    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      const [product] = await db
        .insert(products)
        .values({ description, barCode, status: "ATIVO" })
        .returning();
      productId = product!.id;
    }

    let peId: string;
    const existingPe = (
      await db
        .select({ id: productsEnterprises.id })
        .from(productsEnterprises)
        .where(
          and(
            eq(productsEnterprises.productId, productId),
            eq(productsEnterprises.enterprisesId, ctx.enterpriseId),
          ),
        )
        .limit(1)
    )[0];

    if (existingPe) {
      peId = existingPe.id;
    } else {
      const [pe] = await db
        .insert(productsEnterprises)
        .values({
          code: 1000 + i,
          description,
          origin: "0",
          manufacturer: "Fabricante Seed",
          productId,
          enterprisesId: ctx.enterpriseId,
          measurementUnitId,
          productTypeId,
          productNcmId: productsNcmId,
          productGroupId,
          productSubgroupId,
          productBrandId,
          controlsBatch: i % 3 === 0,
        })
        .returning();
      peId = pe!.id;
    }

    productsEnterprisesIds.push(peId);

    const priceExisting = (
      await db
        .select({ id: prices.id })
        .from(prices)
        .where(eq(prices.productsEnterprisesId, peId))
        .limit(1)
    )[0];

    if (!priceExisting) {
      const unitPrice = (10 + (i % 20) * 2.5).toFixed(4);
      const cost = (Number(unitPrice) * 0.6).toFixed(4);
      await db.insert(prices).values({
        price: unitPrice,
        averageCost: cost,
        priceCost: cost,
        productsEnterprisesId: peId,
      });
    }

    const taxExisting = (
      await db
        .select({ id: productTaxation.id })
        .from(productTaxation)
        .where(eq(productTaxation.productsEnterprisesId, peId))
        .limit(1)
    )[0];

    if (!taxExisting) {
      await db.insert(productTaxation).values({
        cst_pis_entrada: "50",
        cst_pis_saida: "01",
        cst_cofins_entrada: "50",
        cst_cofins_saida: "01",
        productsEnterprisesId: peId,
        icmsTaxationId,
      });
    }

    const appExisting = (
      await db
        .select({ id: productApplication.id })
        .from(productApplication)
        .where(
          and(
            eq(productApplication.productsEnterprisesId, peId),
            eq(productApplication.description, "Uso geral seed"),
          ),
        )
        .limit(1)
    )[0];

    if (!appExisting) {
      await db.insert(productApplication).values({
        description: "Uso geral seed",
        productsEnterprisesId: peId,
      });
    }
  }

  console.log(
    `Catalogo de produtos concluido (${String(productsEnterprisesIds.length)} produtos-empresa).`,
  );

  return {
    measurementUnitId,
    productTypeId,
    productGroupId,
    productSubgroupId,
    productBrandId,
    productsNcmId,
    icmsTaxationId,
    pisCofinsSituationIds: { entrada: pisEntradaId, saida: pisSaidaId },
    productsEnterprisesIds,
  };
}
