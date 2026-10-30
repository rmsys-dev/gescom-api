import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  index,
  integer,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  marketplaceCouponDiscountTypeEnum,
  marketplaceCouponRedemptionStatusEnum,
  marketplaceCouponScopeEnum,
} from "../enums.js";
import { tz, valorDuasCasasDecimais } from "../functions.js";
import { enterprises } from "./enterprises.js";
import { enterprisesMembers } from "./members.js";
import {
  marketplaceOrders,
  marketplaceProducts,
} from "./marketplace-products.js";

/**
 * Cupom de desconto da loja virtual (por empresa).
 * Valor fixo (R$) ou porcentagem sobre a base elegível (pedido ou um produto).
 */
export const marketplaceCoupons = pgTable(
  "marketplace_coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 32 }).notNull(),
    discountType: marketplaceCouponDiscountTypeEnum("discount_type").notNull(),
    discountValue: decimal("discount_value", valorDuasCasasDecimais).notNull(),
    scope: marketplaceCouponScopeEnum("scope").notNull(),
    marketplaceProductId: uuid("marketplace_product_id").references(
      () => marketplaceProducts.id,
      { onDelete: "restrict" },
    ),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: tz("starts_at"),
    endsAt: tz("ends_at"),
    /** Null = usos ilimitados. */
    maxUses: integer("max_uses"),
    maxUsesPerCustomer: integer("max_uses_per_customer").notNull().default(1),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("marketplace_coupons_enterprise_code_unique").on(
      t.enterprisesId,
      t.code,
    ),
    index("marketplace_coupons_enterprise_active_idx").on(
      t.enterprisesId,
      t.isActive,
    ),
    check(
      "marketplace_coupons_discount_value_positive_chk",
      sql`${t.discountValue} > 0`,
    ),
    check(
      "marketplace_coupons_percentage_max_chk",
      sql`${t.discountType} <> 'porcentagem' OR ${t.discountValue} <= 100`,
    ),
    check(
      "marketplace_coupons_scope_product_chk",
      sql`(${t.scope} = 'produto' AND ${t.marketplaceProductId} IS NOT NULL)
        OR (${t.scope} = 'qualquer_produto' AND ${t.marketplaceProductId} IS NULL)`,
    ),
    check(
      "marketplace_coupons_max_uses_chk",
      sql`${t.maxUses} IS NULL OR ${t.maxUses} >= 1`,
    ),
    check(
      "marketplace_coupons_max_uses_per_customer_chk",
      sql`${t.maxUsesPerCustomer} >= 1`,
    ),
    check(
      "marketplace_coupons_validity_chk",
      sql`${t.startsAt} IS NULL OR ${t.endsAt} IS NULL OR ${t.startsAt} <= ${t.endsAt}`,
    ),
  ],
);

/**
 * Uso de cupom em um pedido da loja.
 * Cancelamento marca `liberado` para liberar o limite de usos.
 */
export const marketplaceCouponRedemptions = pgTable(
  "marketplace_coupon_redemptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => marketplaceCoupons.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => marketplaceOrders.id, { onDelete: "cascade" }),
    enterprisesMembersId: uuid("enterprises_members_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "restrict" }),
    discountAmount: decimal(
      "discount_amount",
      valorDuasCasasDecimais,
    ).notNull(),
    status: marketplaceCouponRedemptionStatusEnum("status")
      .notNull()
      .default("aplicado"),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("marketplace_coupon_redemptions_order_unique").on(t.orderId),
    index("marketplace_coupon_redemptions_coupon_status_idx").on(
      t.couponId,
      t.status,
    ),
    index("marketplace_coupon_redemptions_member_coupon_idx").on(
      t.enterprisesMembersId,
      t.couponId,
      t.status,
    ),
  ],
);
