import { sql } from "drizzle-orm";
import { boolean, decimal, integer, uuid } from "drizzle-orm/pg-core";
import { statusEnum } from "../enums.js";
import { varchar } from "drizzle-orm/pg-core";
import { pgTable, uniqueIndex, index } from "drizzle-orm/pg-core";
import { enterprises } from "./enterprises.js";
import { typeSped } from "./typeSped.js";
import { pisCofinsTypeEnum } from "../enums.js";
import { tz } from "../functions.js";
import { percentageDecimal } from "../functions.js";

//tabela de produtos. - Global
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: statusEnum("status").default("ATIVO").notNull(), // status do produto
    description: varchar("description", { length: 255 }).notNull(), // descrição do produto
    barCode: varchar("bar_code", { length: 255 }), // código de barras
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("products_bar_code_active_unique")
      .on(t.barCode)
      .where(sql`${t.status} = 'ATIVO' and ${t.barCode} is not null`),
  ],
);

// tabela de unidade de medida. - Global
export const measurementUnits = pgTable(
  "measurement_units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    unit: varchar("unit", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    compatible: varchar("compatible", { length: 255 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [uniqueIndex("measurement_units_unit_unique").on(t.unit)],
);

// tipos de produtos. - Global
export const productTypes = pgTable(
  "products_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: varchar("type", { length: 255 }).notNull(),  
    description: varchar("description", { length: 255 }).notNull(),
    manufacturing: boolean("manufacturing").notNull().default(false), // se fabricado o tipo produto.
    sales: boolean("sales").notNull().default(false), // se faz venda.
    typeSpedId: uuid("type_sped_id")
      .notNull()
      .references(() => typeSped.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [uniqueIndex("products_types_type_unique").on(t.type)],
);


// NCM de produtos. - Global
export const productsNcm = pgTable(
  "products_ncm",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ncm: varchar("ncm", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [uniqueIndex("products_ncm_ncm_unique").on(t.ncm)],
);

// tabela de CEST de produtos. - Global
export const productsCest = pgTable(
  "products_cest",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cest: varchar("cest", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    productsNcmId: uuid("products_ncm_id")
      .notNull()
      .references(() => productsNcm.id, { onDelete: "restrict" }),
    createdAt: tz("criado_em").defaultNow().notNull(),
    updatedAt: tz("alterado_em"),
  },
  (t) => [
    uniqueIndex("products_cest_cest_ncm_unique").on(t.cest, t.productsNcmId),
  ],
);

// ANP de produtos. - Global
export const productsAnp = pgTable(
  "products_anp",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    anp: varchar("anp", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    createdAt: tz("criado_em").defaultNow().notNull(),
    updatedAt: tz("alterado_em"),
  },
  (t) => [uniqueIndex("products_anp_unique").on(t.anp)],
);

// NBS de servicos. - Global
export const productsNbs = pgTable(
  "products_nbs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lc116Item: varchar("lc116_item", { length: 32 }).notNull(),
    lc116Description: varchar("lc116_description", { length: 255 }).notNull(),
    nbs: varchar("nbs", { length: 32 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    psOnerosa: varchar("ps_onerosa", { length: 1 }).notNull(),
    adqExterior: varchar("adq_exterior", { length: 1 }).notNull(),
    indop: varchar("indop", { length: 64 }).notNull(),
    cClassTrib: varchar("c_class_trib", { length: 64 }).notNull(),
    cClassTribName: varchar("c_class_trib_name", { length: 255 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("products_nbs_lc116_nbs_cclasstrib_unique").on(
      t.lc116Item,
      t.nbs,
      t.cClassTrib,
    ),
  ],
);

// TRIBUTACAO DO ICMS. - Global
export const icmsTaxation = pgTable(
  "icms_taxation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    icms: varchar("icms", { length: 255 }).notNull(), 
    icmsRate: decimal("icms_rate", { precision: 14, scale: 2 }), 
    simplesIcmsRate: decimal("simples_icms_rate", { precision: 14, scale: 2 }), 
    description: varchar("description", { length: 255 }).notNull(), 
    createdAt: tz("criado_em").defaultNow().notNull(),
    updatedAt: tz("alterado_em"),
  },
  (t) => [uniqueIndex("icms_taxation_icms_unique").on(t.icms)],
);

// TRIBUTACAO DO PRODUTO. - Global
export const productTaxation = pgTable(
  "product_taxation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cst_pis_entrada: varchar("cst_pis_entrada", { length: 255 }).notNull(),
    cst_pis_saida: varchar("cst_pis_saida", { length: 255 }).notNull(),
    cst_cofins_entrada: varchar("cst_cofins_entrada", {
      length: 255,
    }).notNull(),
    cst_cofins_saida: varchar("cst_cofins_saida", { length: 255 }).notNull(),
    productsEnterprisesId: uuid("products_enterprises_id")
      .notNull()
      .references(() => productsEnterprises.id, { onDelete: "restrict" }),
    icmsTaxationId: uuid("icms_taxation_id") 
      .notNull()
      .references(() => icmsTaxation.id, { onDelete: "restrict" }),
    pisCofinsSituationId: uuid("pis_cofins_situation_id")
      .notNull()
      .references(() => pisCofinsSituation.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("product_taxation_products_enterprises_id_unique").on(
      t.productsEnterprisesId,
    ),
  ],
);

// SITUACAO DO PIS / COFINS. - Global
export const pisCofinsSituation = pgTable(
  "pis_cofins_situation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cst: varchar("cst", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    type: pisCofinsTypeEnum("type").notNull(), 
    framing: integer("framing").notNull(), 
    pisRate: decimal("pis_rate", { precision: 14, scale: 4 }), 
    cofinsRate: decimal("cofins_rate", { precision: 14, scale: 4 }), 
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [uniqueIndex("pis_cofins_situation_cst_unique").on(t.cst)],
);

// GRUPO DE PRODUTOS. - Fechado por tenant
export const productGroups = pgTable(
  "product_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 255 }).notNull(),
    profitMargin: decimal("profit_margin", { precision: 14, scale: 4 }), 
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("product_groups_enterprise_description_unique").on(
      t.enterprisesId,
      t.description,
    ),
    index("product_groups_enterprise_idx").on(t.enterprisesId),
  ],
);

// SUBGRUPO DE PRODUTOS. - Fechado por tenant
export const productSubgroups = pgTable(
  "product_subgroups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 255 }).notNull(),
    generatesComission: boolean("generates_comission").notNull().default(false), // Gera comissão
    comissionOnSightSeller: decimal("comission_on_sight_seller", percentageDecimal)
      .notNull()
      .default("0.00"), // Comissão a vista do vendedor
    comissionToTermsSeller: decimal("comission_to_terms_seller", percentageDecimal)
      .notNull()
      .default("0.00"), // Comissão a prazo do vendedor
    comissionPartialSeller: decimal("comission_partial_seller", percentageDecimal)
      .notNull()
      .default("0.00"), // Comissão parcial do vendedor
    comissionOnSightManager: decimal("comission_on_sight_manager", percentageDecimal)
      .notNull()
      .default("0.00"), // Comissão a vista do gerente
    comissionToTermsManager: decimal("comission_to_terms_manager", percentageDecimal)
      .notNull()
      .default("0.00"), // Comissão a prazo do gerente
    comissionPartialManager: decimal("comission_partial_manager", percentageDecimal)
      .notNull()
      .default("0.00"), // Comissão parcial do gerente
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("product_subgroups_enterprise_description_unique").on(
      t.enterprisesId,
      t.description,
    ),
    index("product_subgroups_enterprise_idx").on(t.enterprisesId),
  ],
);

// MARCA DE PRODUTOS. - Fechado por tenant
export const productBrands = pgTable(
  "product_brands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 255 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("product_brands_enterprise_description_unique").on(
      t.enterprisesId,
      t.description,
    ),
    index("product_brands_enterprise_idx").on(t.enterprisesId),
  ],
);

// tabela ligacao entre produtos e empresas. - Fechado por tenant
export const productsEnterprises = pgTable(
  "products_enterprises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: integer("code"),
    description: varchar("description", { length: 255 }).notNull(),
    origin: varchar("origin", { length: 255 }), // numero original
    manufacturer: varchar("manufacturer", { length: 255 }), //  numero do fabricante
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    measurementUnitId: uuid("measurement_unit_id") // unidade de medida
      .notNull()
      .references(() => measurementUnits.id, { onDelete: "restrict" }),
    productTypeId: uuid("product_type_id") // tipo de produto
      .notNull()
      .references(() => productTypes.id, { onDelete: "restrict" }),
    productNcmId: uuid("product_ncm_id") // NCM de produto
      .references(() => productsNcm.id, { onDelete: "restrict" }),
    productCestId: uuid("product_cest_id") // CEST de produto
      .references(() => productsCest.id, { onDelete: "restrict" }),
    productAnpId: uuid("product_anp_id") // ANP de produto
      .references(() => productsAnp.id, { onDelete: "restrict" }),
    productNbsId: uuid("product_nbs_id") // NBS de servico
      .references(() => productsNbs.id, { onDelete: "restrict" }),
    productGroupId: uuid("product_group_id") // grupo de produtos
      .notNull()
      .references(() => productGroups.id, { onDelete: "restrict" }),
    productSubgroupId: uuid("product_subgroup_id") // subgrupo de produtos
      .notNull()
      .references(() => productSubgroups.id, { onDelete: "restrict" }),
    productBrandId: uuid("product_brand_id") // marca de produtos
      .notNull()
      .references(() => productBrands.id, { onDelete: "restrict" }),
    controlsBatch: boolean("controls_batch").notNull().default(false), // controla lote do produto
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("products_enterprises_product_id_enterprises_id_unique").on(
      t.productId,
      t.enterprisesId,
    ),
    uniqueIndex("products_enterprises_enterprise_code_unique")
      .on(t.enterprisesId, t.code)
      .where(sql`${t.code} is not null`),
  ],
);

// PRODUTO APLICACAO. - Fechado por tenant
export const productApplication = pgTable(
  "product_application",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    description: varchar("description", { length: 255 }).notNull(),
    productsEnterprisesId: uuid("products_enterprises_id")
      .notNull()
      .references(() => productsEnterprises.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex(
      "product_application_products_enterprises_id_description_unique",
    ).on(t.productsEnterprisesId, t.description),
  ],
);

// TABELA DE PRECOS. - Fechado por tenant
export const prices = pgTable(
  "prices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    price: decimal("price", { precision: 14, scale: 4 }).notNull(),   // preço de venda
    averageCost: decimal("average_cost", { precision: 14, scale: 4 }), // custo médio
    actualRealCost: decimal("actual_real_cost", { precision: 14, scale: 4 }), // custo real
    previousCost: decimal("previous_cost", { precision: 14, scale: 4 }), // custo anterior
    priceCost: decimal("price_cost", { precision: 14, scale: 4 }), // custo atual.
    productsEnterprisesId: uuid("products_enterprises_id")
      .notNull()
      .references(() => productsEnterprises.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("prices_products_enterprises_id_unique").on(
      t.productsEnterprisesId,
    ),
  ],
);

// TABELA DE PRECOS PROMOCIONAIS. - Fechado por tenant
export const promotionalPrices = pgTable(
  "promotional_prices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    description: varchar("description", { length: 255 }),
    price: decimal("price", { precision: 14, scale: 4 }).notNull(),
    startDate: tz("start_date").notNull(),
    endDate: tz("end_date").notNull(),
    productsEnterprisesId: uuid("products_enterprises_id")
      .notNull()
      .references(() => productsEnterprises.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
);
