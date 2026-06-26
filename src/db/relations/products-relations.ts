import { relations } from "drizzle-orm";
import {
  measurementUnits,
  productTypes,
  products,
  productsEnterprises,
  productsNcm,
  productsCest,
  productsAnp,
  productsNbs,
  productGroups,
  productSubgroups,
  productBrands,
  icmsTaxation,
  productTaxation,
  productApplication,
  prices,
  promotionalPrices,
  pisCofinsSituation,
} from "../entities/products.js";
import { enterprises } from "../entities/enterprises.js";
import { typeSped } from "../entities/typeSped.js";
import { stockSectorsRental, stockBatches } from "../entities/stock.js";

export const productsRelations = relations(products, ({ many }) => ({
  productsEnterprises: many(productsEnterprises),
}));

// relações da tabela de produtos e empresas.
export const productsEnterprisesRelations = relations(
  productsEnterprises,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productsEnterprises.productId],
      references: [products.id],
    }),
    enterprises: one(enterprises, {
      fields: [productsEnterprises.enterprisesId],
      references: [enterprises.id],
    }),
    measurementUnit: one(measurementUnits, {
      fields: [productsEnterprises.measurementUnitId],
      references: [measurementUnits.id],
    }),
    productType: one(productTypes, {
      fields: [productsEnterprises.productTypeId],
      references: [productTypes.id],
    }),
    productNcm: one(productsNcm, {
      fields: [productsEnterprises.productNcmId],
      references: [productsNcm.id],
    }),
    productCest: one(productsCest, {
      fields: [productsEnterprises.productCestId],
      references: [productsCest.id],
    }),
    productAnp: one(productsAnp, {
      fields: [productsEnterprises.productAnpId],
      references: [productsAnp.id],
    }),
    productNbs: one(productsNbs, {
      fields: [productsEnterprises.productNbsId],
      references: [productsNbs.id],
    }),
    productGroup: one(productGroups, {
      fields: [productsEnterprises.productGroupId],
      references: [productGroups.id],
    }),
    productSubgroup: one(productSubgroups, {
      fields: [productsEnterprises.productSubgroupId],
      references: [productSubgroups.id],
    }),
    productBrand: one(productBrands, {
      fields: [productsEnterprises.productBrandId],
      references: [productBrands.id],
    }),
    stockSectorsRental: many(stockSectorsRental),
    stockBatches: many(stockBatches),
  }),
);

// relações da tabela de unidade de medida.
export const measurementUnitsRelations = relations(
  measurementUnits,
  ({ many }) => ({
    productsEnterprises: many(productsEnterprises),
  }),
);

// relações da tabela de tipos de produtos.
export const productTypesRelations = relations(productTypes, ({ one, many }) => ({
  typeSped: one(typeSped, {
    fields: [productTypes.typeSpedId],
    references: [typeSped.id],
  }),
  productsEnterprises: many(productsEnterprises),
}));

// relações da tabela de NCM de produtos.
export const productsNcmRelations = relations(productsNcm, ({ many }) => ({
  productsEnterprises: many(productsEnterprises),
}));

// relações da tabela de CEST de produtos.
export const productsCestRelations = relations(
  productsCest,
  ({ one, many }) => ({
    productsNcm: one(productsNcm, {
      fields: [productsCest.productsNcmId],
      references: [productsNcm.id],
    }),
    productsEnterprises: many(productsEnterprises),
  }),
);

// relações da tabela de ANP de produtos.
export const productsAnpRelations = relations(productsAnp, ({ many }) => ({
  productsEnterprises: many(productsEnterprises),
}));

// relações da tabela de NBS de servicos.
export const productsNbsRelations = relations(productsNbs, ({ many }) => ({
  productsEnterprises: many(productsEnterprises),
}));

// relações da tabela de tributação do ICMS.
export const icmsTaxationRelations = relations(icmsTaxation, ({ many }) => ({
  productTaxations: many(productTaxation),
}));

// relações da tabela de tributação do produto.
export const productTaxationRelations = relations(
  productTaxation,
  ({ one }) => ({
    productsEnterprises: one(productsEnterprises, {
      fields: [productTaxation.productsEnterprisesId],
      references: [productsEnterprises.id],
    }),
    icmsTaxation: one(icmsTaxation, {
      fields: [productTaxation.icmsTaxationId],
      references: [icmsTaxation.id],
    }),
    pisCofinsSituation: one(pisCofinsSituation, {
      fields: [productTaxation.pisCofinsSituationId],
      references: [pisCofinsSituation.id],
    }),
  }),
);

// relações da tabela de PRODUTO APLICACAO.
export const productApplicationRelations = relations(
  productApplication,
  ({ one }) => ({
    productsEnterprises: one(productsEnterprises, {
      fields: [productApplication.productsEnterprisesId],
      references: [productsEnterprises.id],
    }),
  }),
);

// relações da tabela de GRUPO DE PRODUTOS.
export const productGroupsRelations = relations(productGroups, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [productGroups.enterprisesId],
    references: [enterprises.id],
  }),
  productsEnterprises: many(productsEnterprises),
}));

// relações da tabela de SUBGRUPO DE PRODUTOS.
export const productSubgroupsRelations = relations(
  productSubgroups,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [productSubgroups.enterprisesId],
      references: [enterprises.id],
    }),
    productsEnterprises: many(productsEnterprises),
  }),
);

// relações da tabela de MARCA DE PRODUTOS.
export const productBrandsRelations = relations(productBrands, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [productBrands.enterprisesId],
    references: [enterprises.id],
  }),
  productsEnterprises: many(productsEnterprises),
}));

// relações da tabela de TABELA DE PRECOS.
export const pricesRelations = relations(prices, ({ one }) => ({
  productsEnterprises: one(productsEnterprises, {
    fields: [prices.productsEnterprisesId],
    references: [productsEnterprises.id],
  }),
}));

// relações da tabela de TABELA DE PRECOS PROMOCIONAIS.
export const promotionalPricesRelations = relations(
  promotionalPrices,
  ({ one }) => ({
    productsEnterprises: one(productsEnterprises, {
      fields: [promotionalPrices.productsEnterprisesId],
      references: [productsEnterprises.id],
    }),
  }),
);
