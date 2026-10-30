import { relations } from "drizzle-orm";
import {
  marketplaceCartItems,
  marketplaceDeliveryItems,
  marketplaceDeliverys,
  marketplaceFavorites,
  marketplaceOrderItems,
  marketplaceOrders,
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
    cartItems: many(marketplaceCartItems),
    favorites: many(marketplaceFavorites),
    orderItems: many(marketplaceOrderItems),
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

export const marketplaceCartItemsRelations = relations(
  marketplaceCartItems,
  ({ one }) => ({
    enterprise: one(enterprises, {
      fields: [marketplaceCartItems.enterprisesId],
      references: [enterprises.id],
    }),
    member: one(enterprisesMembers, {
      fields: [marketplaceCartItems.enterprisesMembersId],
      references: [enterprisesMembers.id],
    }),
    marketplaceProduct: one(marketplaceProducts, {
      fields: [marketplaceCartItems.marketplaceProductId],
      references: [marketplaceProducts.id],
    }),
  }),
);

export const marketplaceFavoritesRelations = relations(
  marketplaceFavorites,
  ({ one }) => ({
    enterprise: one(enterprises, {
      fields: [marketplaceFavorites.enterprisesId],
      references: [enterprises.id],
    }),
    member: one(enterprisesMembers, {
      fields: [marketplaceFavorites.enterprisesMembersId],
      references: [enterprisesMembers.id],
    }),
    marketplaceProduct: one(marketplaceProducts, {
      fields: [marketplaceFavorites.marketplaceProductId],
      references: [marketplaceProducts.id],
    }),
  }),
);

export const marketplaceOrdersRelations = relations(
  marketplaceOrders,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [marketplaceOrders.enterprisesId],
      references: [enterprises.id],
    }),
    member: one(enterprisesMembers, {
      fields: [marketplaceOrders.enterprisesMembersId],
      references: [enterprisesMembers.id],
    }),
    items: many(marketplaceOrderItems),
    deliverys: many(marketplaceDeliverys),
  }),
);

export const marketplaceOrderItemsRelations = relations(
  marketplaceOrderItems,
  ({ one, many }) => ({
    order: one(marketplaceOrders, {
      fields: [marketplaceOrderItems.orderId],
      references: [marketplaceOrders.id],
    }),
    marketplaceProduct: one(marketplaceProducts, {
      fields: [marketplaceOrderItems.marketplaceProductId],
      references: [marketplaceProducts.id],
    }),
    deliveryItems: many(marketplaceDeliveryItems),
  }),
);

export const marketplaceDeliverysRelations = relations(
  marketplaceDeliverys,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [marketplaceDeliverys.enterprisesId],
      references: [enterprises.id],
    }),
    order: one(marketplaceOrders, {
      fields: [marketplaceDeliverys.orderId],
      references: [marketplaceOrders.id],
    }),
    items: many(marketplaceDeliveryItems),
  }),
);

export const marketplaceDeliveryItemsRelations = relations(
  marketplaceDeliveryItems,
  ({ one }) => ({
    delivery: one(marketplaceDeliverys, {
      fields: [marketplaceDeliveryItems.deliveryId],
      references: [marketplaceDeliverys.id],
    }),
    orderItem: one(marketplaceOrderItems, {
      fields: [marketplaceDeliveryItems.orderItemId],
      references: [marketplaceOrderItems.id],
    }),
  }),
);
