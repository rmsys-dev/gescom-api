import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  marketplaceDeliveryStatusEnum,
  marketplaceDeliveryTypeEnum,
  marketplaceOrderStatusEnum,
  marketplacePaymentStatusEnum,
  marketplaceStorePaymentMethodEnum,
} from "../enums.js";
import { enterprises } from "./enterprises.js";
import { enterprisesMembers } from "./members.js";
import { productsEnterprises } from "./products.js";
import { tz, valorDuasCasasDecimais } from "../functions.js";

/** Publicação do produto na loja virtual (não altera products_enterprises). */
export const marketplaceProducts = pgTable(
  "marketplace_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    productsEnterprisesId: uuid("products_enterprises_id")
      .notNull()
      .references(() => productsEnterprises.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 255 }).notNull(),
    isPublished: boolean("is_published").notNull().default(false),
    featured: boolean("featured").notNull().default(false),
    freeShipping: boolean("free_shipping").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    storeTitle: varchar("store_title", { length: 255 }),
    storeDescription: text("store_description"),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("marketplace_products_enterprise_pe_unique").on(
      t.enterprisesId,
      t.productsEnterprisesId,
    ),
    uniqueIndex("marketplace_products_enterprise_slug_unique").on(
      t.enterprisesId,
      t.slug,
    ),
    index("marketplace_products_enterprise_published_idx").on(
      t.enterprisesId,
      t.isPublished,
    ),
    index("marketplace_products_slug_idx").on(t.slug),
  ],
);

/** Fotos extras da vitrine (além de products_enterprises.photo_url). Até 5 extras → 6 no total. */
export const marketplaceProductPhotos = pgTable(
  "marketplace_product_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    marketplaceProductId: uuid("marketplace_product_id")
      .notNull()
      .references(() => marketplaceProducts.id, { onDelete: "cascade" }),
    photoUrl: varchar("photo_url", { length: 500 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    index("marketplace_product_photos_product_idx").on(t.marketplaceProductId),
    uniqueIndex("marketplace_product_photos_product_url_unique").on(
      t.marketplaceProductId,
      t.photoUrl,
    ),
  ],
);

/** Características chave/valor da vitrine. */
export const marketplaceProductCharacteristics = pgTable(
  "marketplace_product_characteristics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    marketplaceProductId: uuid("marketplace_product_id")
      .notNull()
      .references(() => marketplaceProducts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    value: varchar("value", { length: 500 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("marketplace_product_characteristics_name_unique").on(
      t.marketplaceProductId,
      t.name,
    ),
    index("marketplace_product_characteristics_product_idx").on(
      t.marketplaceProductId,
    ),
  ],
);

/** Opções de variante (ex.: Cor, Tamanho). */
export const marketplaceProductVariantOptions = pgTable(
  "marketplace_product_variant_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    marketplaceProductId: uuid("marketplace_product_id")
      .notNull()
      .references(() => marketplaceProducts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("marketplace_product_variant_options_name_unique").on(
      t.marketplaceProductId,
      t.name,
    ),
    index("marketplace_product_variant_options_product_idx").on(
      t.marketplaceProductId,
    ),
  ],
);

/** Valores de uma opção (ex.: Azul, P). */
export const marketplaceProductVariantOptionValues = pgTable(
  "marketplace_product_variant_option_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    optionId: uuid("option_id")
      .notNull()
      .references(() => marketplaceProductVariantOptions.id, {
        onDelete: "cascade",
      }),
    value: varchar("value", { length: 255 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("marketplace_product_variant_option_values_unique").on(
      t.optionId,
      t.value,
    ),
    index("marketplace_product_variant_option_values_option_idx").on(
      t.optionId,
    ),
  ],
);

/** SKU / combinação de variantes na loja. */
export const marketplaceProductVariants = pgTable(
  "marketplace_product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    marketplaceProductId: uuid("marketplace_product_id")
      .notNull()
      .references(() => marketplaceProducts.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 100 }),
    productsEnterprisesId: uuid("products_enterprises_id").references(
      () => productsEnterprises.id,
      { onDelete: "set null" },
    ),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("marketplace_product_variants_sku_unique")
      .on(t.marketplaceProductId, t.sku)
      .where(sql`${t.sku} is not null`),
    index("marketplace_product_variants_product_idx").on(
      t.marketplaceProductId,
    ),
  ],
);

/** Seleção option_value por variant. */
export const marketplaceProductVariantSelections = pgTable(
  "marketplace_product_variant_selections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => marketplaceProductVariants.id, { onDelete: "cascade" }),
    optionValueId: uuid("option_value_id")
      .notNull()
      .references(() => marketplaceProductVariantOptionValues.id, {
        onDelete: "restrict",
      }),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("marketplace_product_variant_selections_unique").on(
      t.variantId,
      t.optionValueId,
    ),
    index("marketplace_product_variant_selections_variant_idx").on(t.variantId),
  ],
);

/** Avaliações do cliente na loja. */
export const marketplaceProductReviews = pgTable(
  "marketplace_product_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    marketplaceProductId: uuid("marketplace_product_id")
      .notNull()
      .references(() => marketplaceProducts.id, { onDelete: "cascade" }),
    enterprisesMembersId: uuid("enterprises_members_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    title: varchar("title", { length: 255 }),
    comment: text("comment"),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("marketplace_product_reviews_member_unique").on(
      t.marketplaceProductId,
      t.enterprisesMembersId,
    ),
    index("marketplace_product_reviews_product_idx").on(t.marketplaceProductId),
    check(
      "marketplace_product_reviews_rating_chk",
      sql`${t.rating} >= 1 and ${t.rating} <= 5`,
    ),
  ],
);

/** Perguntas do cliente na loja. */
export const marketplaceProductQuestions = pgTable(
  "marketplace_product_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    marketplaceProductId: uuid("marketplace_product_id")
      .notNull()
      .references(() => marketplaceProducts.id, { onDelete: "cascade" }),
    enterprisesMembersId: uuid("enterprises_members_id").references(
      () => enterprisesMembers.id,
      { onDelete: "set null" },
    ),
    question: text("question").notNull(),
    answer: text("answer"),
    answeredAt: tz("answered_at"),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    index("marketplace_product_questions_product_idx").on(
      t.marketplaceProductId,
    ),
  ],
);

/** Item do carrinho do cliente na loja. */
export const marketplaceCartItems = pgTable(
  "marketplace_cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    enterprisesMembersId: uuid("enterprises_members_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "cascade" }),
    marketplaceProductId: uuid("marketplace_product_id")
      .notNull()
      .references(() => marketplaceProducts.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("marketplace_cart_items_member_product_unique").on(
      t.enterprisesMembersId,
      t.marketplaceProductId,
    ),
    index("marketplace_cart_items_enterprise_member_idx").on(
      t.enterprisesId,
      t.enterprisesMembersId,
    ),
    check("marketplace_cart_items_quantity_chk", sql`${t.quantity} >= 1`),
  ],
);

/** Favorito do cliente na loja. */
export const marketplaceFavorites = pgTable(
  "marketplace_favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    enterprisesMembersId: uuid("enterprises_members_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "cascade" }),
    marketplaceProductId: uuid("marketplace_product_id")
      .notNull()
      .references(() => marketplaceProducts.id, { onDelete: "cascade" }),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("marketplace_favorites_member_product_unique").on(
      t.enterprisesMembersId,
      t.marketplaceProductId,
    ),
    index("marketplace_favorites_enterprise_member_idx").on(
      t.enterprisesId,
      t.enterprisesMembersId,
    ),
  ],
);

/**
 * Pedido da loja virtual (checkout web; independente de sales).
 * Criado após endereço/retirada com status `criado`; pagamento vem depois.
 */
export const marketplaceOrders = pgTable(
  "marketplace_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    enterprisesMembersId: uuid("enterprises_members_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "restrict" }),
    code: varchar("code", { length: 32 }).notNull(),
    status: marketplaceOrderStatusEnum("status").notNull().default("criado"),
    /** Preenchido após escolha/confirmação do pagamento. */
    paymentMethod: marketplaceStorePaymentMethodEnum("payment_method"),
    /** Acompanha o ciclo do pagamento independente do status do pedido. */
    paymentStatus: marketplacePaymentStatusEnum("payment_status")
      .notNull()
      .default("pendente"),
    contactName: varchar("contact_name", { length: 255 }).notNull(),
    contactEmail: varchar("contact_email", { length: 255 }).notNull(),
    contactPhone: varchar("contact_phone", { length: 32 }),
    addressLabel: varchar("address_label", { length: 100 }),
    addressRecipient: varchar("address_recipient", { length: 255 }),
    addressPhone: varchar("address_phone", { length: 32 }),
    addressZip: varchar("address_zip", { length: 16 }),
    addressStreet: varchar("address_street", { length: 255 }),
    addressNumber: varchar("address_number", { length: 32 }),
    addressComplement: varchar("address_complement", { length: 255 }),
    addressDistrict: varchar("address_district", { length: 255 }),
    addressCity: varchar("address_city", { length: 255 }),
    addressState: varchar("address_state", { length: 2 }),
    subtotal: decimal("subtotal", valorDuasCasasDecimais).notNull(),
    shipping: decimal("shipping", valorDuasCasasDecimais)
      .notNull()
      .default("0"),
    /** Desconto aplicado por cupom (0 se nenhum). */
    discountAmount: decimal("discount_amount", valorDuasCasasDecimais)
      .notNull()
      .default("0"),
    /** Snapshot do código do cupom no momento do pedido. */
    couponCode: varchar("coupon_code", { length: 32 }),
    /**
     * FK do cupom usado. Sem `.references()` aqui para evitar ciclo com
     * `marketplace_coupons` (que referencia o pedido via redemptions).
     * A FK é criada na migration.
     */
    couponId: uuid("coupon_id"),
    total: decimal("total", valorDuasCasasDecimais).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("marketplace_orders_enterprise_code_unique").on(
      t.enterprisesId,
      t.code,
    ),
    index("marketplace_orders_enterprise_member_idx").on(
      t.enterprisesId,
      t.enterprisesMembersId,
    ),
    index("marketplace_orders_enterprise_status_idx").on(
      t.enterprisesId,
      t.status,
    ),
    index("marketplace_orders_coupon_idx").on(t.couponId),
    check(
      "marketplace_orders_discount_amount_chk",
      sql`${t.discountAmount} >= 0`,
    ),
  ],
);

/** Item snapshot do pedido da loja. */
export const marketplaceOrderItems = pgTable(
  "marketplace_order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => marketplaceOrders.id, { onDelete: "cascade" }),
    marketplaceProductId: uuid("marketplace_product_id")
      .notNull()
      .references(() => marketplaceProducts.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(),
    image: varchar("image", { length: 500 }),
    unitPrice: decimal("unit_price", valorDuasCasasDecimais).notNull(),
    quantity: integer("quantity").notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("marketplace_order_items_order_idx").on(t.orderId),
    check("marketplace_order_items_quantity_chk", sql`${t.quantity} >= 1`),
  ],
);

/**
 * Controle de entrega/retirada do pedido da loja (`deliverys`).
 * Criado junto com o pedido; itens vinculados em marketplace_delivery_items.
 */
export const marketplaceDeliverys = pgTable(
  "marketplace_deliverys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => marketplaceOrders.id, { onDelete: "cascade" }),
    type: marketplaceDeliveryTypeEnum("type").notNull(),
    status: marketplaceDeliveryStatusEnum("status")
      .notNull()
      .default("pendente"),
    recipientName: varchar("recipient_name", { length: 255 }),
    recipientPhone: varchar("recipient_phone", { length: 32 }),
    addressLabel: varchar("address_label", { length: 100 }),
    addressZip: varchar("address_zip", { length: 16 }),
    addressStreet: varchar("address_street", { length: 255 }),
    addressNumber: varchar("address_number", { length: 32 }),
    addressComplement: varchar("address_complement", { length: 255 }),
    addressDistrict: varchar("address_district", { length: 255 }),
    addressCity: varchar("address_city", { length: 255 }),
    addressState: varchar("address_state", { length: 2 }),
    shipping: decimal("shipping", valorDuasCasasDecimais)
      .notNull()
      .default("0"),
    notes: varchar("notes", { length: 500 }),
    trackingCode: varchar("tracking_code", { length: 100 }),
    estimatedAt: tz("estimated_at"),
    readyAt: tz("ready_at"),
    shippedAt: tz("shipped_at"),
    completedAt: tz("completed_at"),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    index("marketplace_deliverys_order_idx").on(t.orderId),
    index("marketplace_deliverys_enterprise_status_idx").on(
      t.enterprisesId,
      t.status,
    ),
    index("marketplace_deliverys_enterprise_type_idx").on(
      t.enterprisesId,
      t.type,
    ),
  ],
);

/** Itens vinculados a uma entrega/retirada do pedido. */
export const marketplaceDeliveryItems = pgTable(
  "marketplace_delivery_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => marketplaceDeliverys.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => marketplaceOrderItems.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("marketplace_delivery_items_delivery_item_unique").on(
      t.deliveryId,
      t.orderItemId,
    ),
    index("marketplace_delivery_items_order_item_idx").on(t.orderItemId),
    check("marketplace_delivery_items_quantity_chk", sql`${t.quantity} >= 1`),
  ],
);
