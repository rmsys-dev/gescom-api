import { relations } from "drizzle-orm";
import {
  marketplaceProductCharacteristics,
  marketplaceProductPhotos,
  marketplaceProductQuestions,
  marketplaceProductReviews,
  marketplaceProductVariantOptionValues,
  marketplaceProductVariantOptions,
  marketplaceProductVariantSelections,
  marketplaceProductVariants,
  marketplaceProducts,
} from "../entities/marketplace-products.js";
import { enterprises } from "../entities/enterprises.js";
import { enterprisesMembers } from "../entities/members.js";
import { productsEnterprises } from "../entities/products.js";

export const marketplaceProductsRelations = relations(
  marketplaceProducts,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [marketplaceProducts.enterprisesId],
      references: [enterprises.id],
    }),
    productsEnterprise: one(productsEnterprises, {
      fields: [marketplaceProducts.productsEnterprisesId],
      references: [productsEnterprises.id],
    }),
    photos: many(marketplaceProductPhotos),
    characteristics: many(marketplaceProductCharacteristics),
    variantOptions: many(marketplaceProductVariantOptions),
    variants: many(marketplaceProductVariants),
    reviews: many(marketplaceProductReviews),
    questions: many(marketplaceProductQuestions),
  }),
);

export const marketplaceProductPhotosRelations = relations(
  marketplaceProductPhotos,
  ({ one }) => ({
    marketplaceProduct: one(marketplaceProducts, {
      fields: [marketplaceProductPhotos.marketplaceProductId],
      references: [marketplaceProducts.id],
    }),
  }),
);

export const marketplaceProductCharacteristicsRelations = relations(
  marketplaceProductCharacteristics,
  ({ one }) => ({
    marketplaceProduct: one(marketplaceProducts, {
      fields: [marketplaceProductCharacteristics.marketplaceProductId],
      references: [marketplaceProducts.id],
    }),
  }),
);

export const marketplaceProductVariantOptionsRelations = relations(
  marketplaceProductVariantOptions,
  ({ one, many }) => ({
    marketplaceProduct: one(marketplaceProducts, {
      fields: [marketplaceProductVariantOptions.marketplaceProductId],
      references: [marketplaceProducts.id],
    }),
    values: many(marketplaceProductVariantOptionValues),
  }),
);

export const marketplaceProductVariantOptionValuesRelations = relations(
  marketplaceProductVariantOptionValues,
  ({ one, many }) => ({
    option: one(marketplaceProductVariantOptions, {
      fields: [marketplaceProductVariantOptionValues.optionId],
      references: [marketplaceProductVariantOptions.id],
    }),
    selections: many(marketplaceProductVariantSelections),
  }),
);

export const marketplaceProductVariantsRelations = relations(
  marketplaceProductVariants,
  ({ one, many }) => ({
    marketplaceProduct: one(marketplaceProducts, {
      fields: [marketplaceProductVariants.marketplaceProductId],
      references: [marketplaceProducts.id],
    }),
    productsEnterprise: one(productsEnterprises, {
      fields: [marketplaceProductVariants.productsEnterprisesId],
      references: [productsEnterprises.id],
    }),
    selections: many(marketplaceProductVariantSelections),
  }),
);

export const marketplaceProductVariantSelectionsRelations = relations(
  marketplaceProductVariantSelections,
  ({ one }) => ({
    variant: one(marketplaceProductVariants, {
      fields: [marketplaceProductVariantSelections.variantId],
      references: [marketplaceProductVariants.id],
    }),
    optionValue: one(marketplaceProductVariantOptionValues, {
      fields: [marketplaceProductVariantSelections.optionValueId],
      references: [marketplaceProductVariantOptionValues.id],
    }),
  }),
);

export const marketplaceProductReviewsRelations = relations(
  marketplaceProductReviews,
  ({ one }) => ({
    marketplaceProduct: one(marketplaceProducts, {
      fields: [marketplaceProductReviews.marketplaceProductId],
      references: [marketplaceProducts.id],
    }),
    member: one(enterprisesMembers, {
      fields: [marketplaceProductReviews.enterprisesMembersId],
      references: [enterprisesMembers.id],
    }),
  }),
);

export const marketplaceProductQuestionsRelations = relations(
  marketplaceProductQuestions,
  ({ one }) => ({
    marketplaceProduct: one(marketplaceProducts, {
      fields: [marketplaceProductQuestions.marketplaceProductId],
      references: [marketplaceProducts.id],
    }),
    member: one(enterprisesMembers, {
      fields: [marketplaceProductQuestions.enterprisesMembersId],
      references: [enterprisesMembers.id],
    }),
  }),
);
