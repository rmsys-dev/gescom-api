import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { enterprises } from "./enterprises.js";
import { enterprisesMembers } from "./members.js";
import { productsEnterprises } from "./products.js";
import { tz } from "../functions.js";

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
    index("marketplace_product_reviews_product_idx").on(
      t.marketplaceProductId,
    ),
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
