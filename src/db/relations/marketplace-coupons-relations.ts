import { relations } from "drizzle-orm";
import {
  marketplaceCouponRedemptions,
  marketplaceCoupons,
} from "../entities/marketplace-coupons.js";
import {
  marketplaceOrders,
  marketplaceProducts,
} from "../entities/marketplace-products.js";
import { enterprises } from "../entities/enterprises.js";
import { enterprisesMembers } from "../entities/members.js";

export const marketplaceCouponsRelations = relations(
  marketplaceCoupons,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [marketplaceCoupons.enterprisesId],
      references: [enterprises.id],
    }),
    marketplaceProduct: one(marketplaceProducts, {
      fields: [marketplaceCoupons.marketplaceProductId],
      references: [marketplaceProducts.id],
    }),
    redemptions: many(marketplaceCouponRedemptions),
  }),
);

export const marketplaceCouponRedemptionsRelations = relations(
  marketplaceCouponRedemptions,
  ({ one }) => ({
    enterprise: one(enterprises, {
      fields: [marketplaceCouponRedemptions.enterprisesId],
      references: [enterprises.id],
    }),
    coupon: one(marketplaceCoupons, {
      fields: [marketplaceCouponRedemptions.couponId],
      references: [marketplaceCoupons.id],
    }),
    order: one(marketplaceOrders, {
      fields: [marketplaceCouponRedemptions.orderId],
      references: [marketplaceOrders.id],
    }),
    member: one(enterprisesMembers, {
      fields: [marketplaceCouponRedemptions.enterprisesMembersId],
      references: [enterprisesMembers.id],
    }),
  }),
);
