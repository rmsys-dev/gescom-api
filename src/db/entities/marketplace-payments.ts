import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
  decimal,
} from "drizzle-orm/pg-core";
import {
  marketplacePaymentAttemptOutcomeEnum,
  marketplacePaymentAuthTypeEnum,
  marketplacePaymentConfigStatusEnum,
  marketplacePaymentEnvironmentEnum,
  marketplacePaymentProviderEnum,
  marketplaceStorePaymentMethodEnum,
} from "../enums.js";
import { tz, valorDuasCasasDecimais } from "../functions.js";
import { enterprises } from "./enterprises.js";
import { marketplaceOrders } from "./marketplace-products.js";

export type MarketplacePaymentConfigSettings = {
  schemaVersion?: number;
  enabledMethods?: Array<"pix" | "credito" | "boleto">;
  maxInstallments?: number;
};

/**
 * Configuração de provedor de pagamento por empresa.
 * Segredos ficam cifrados; a API só devolve flags `has*`.
 */
export const marketplacePaymentConfigs = pgTable(
  "marketplace_payment_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    provider: marketplacePaymentProviderEnum("provider").notNull(),
    environment: marketplacePaymentEnvironmentEnum("environment").notNull(),
    authType: marketplacePaymentAuthTypeEnum("auth_type")
      .notNull()
      .default("BEARER_TOKEN"),
    status: marketplacePaymentConfigStatusEnum("status")
      .notNull()
      .default("RASCUNHO"),
    isDefault: boolean("is_default").notNull().default(false),
    label: varchar("label", { length: 120 }),
    externalAccountId: varchar("external_account_id", { length: 120 }),
    publicKey: varchar("public_key", { length: 255 }),
    settings: jsonb("settings").$type<MarketplacePaymentConfigSettings>(),
    apiKeyHeader: varchar("api_key_header", { length: 120 }),
    clientId: varchar("client_id", { length: 255 }),
    basicUsername: varchar("basic_username", { length: 255 }),
    certificatePem: text("certificate_pem"),
    tokenExpiresAt: tz("token_expires_at"),
    apiKeyEncrypted: text("api_key_encrypted"),
    accessTokenEncrypted: text("access_token_encrypted"),
    clientSecretEncrypted: text("client_secret_encrypted"),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    basicPasswordEncrypted: text("basic_password_encrypted"),
    privateKeyEncrypted: text("private_key_encrypted"),
    certificatePasswordEncrypted: text("certificate_password_encrypted"),
    webhookSecretEncrypted: text("webhook_secret_encrypted"),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    index("marketplace_payment_configs_enterprise_idx").on(t.enterprisesId),
    index("marketplace_payment_configs_enterprise_provider_idx").on(
      t.enterprisesId,
      t.provider,
    ),
    uniqueIndex("marketplace_payment_configs_active_default_unique")
      .on(t.enterprisesId)
      .where(sql`${t.status} = 'ATIVO' AND ${t.isDefault} = true`),
  ],
);

/**
 * Tentativa de cobrança de um pedido da loja.
 * Uma linha por tentativa — recusa permite nova cobrança.
 */
export const marketplacePayments = pgTable(
  "marketplace_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => marketplaceOrders.id, { onDelete: "cascade" }),
    configId: uuid("config_id")
      .notNull()
      .references(() => marketplacePaymentConfigs.id, { onDelete: "restrict" }),
    provider: marketplacePaymentProviderEnum("provider").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
    providerOrderId: varchar("provider_order_id", { length: 120 }),
    providerPaymentId: varchar("provider_payment_id", { length: 120 }),
    method: marketplaceStorePaymentMethodEnum("method").notNull(),
    amount: decimal("amount", valorDuasCasasDecimais).notNull(),
    outcome: marketplacePaymentAttemptOutcomeEnum("outcome")
      .notNull()
      .default("pending"),
    providerStatus: varchar("provider_status", { length: 64 }),
    providerStatusDetail: varchar("provider_status_detail", { length: 64 }),
    /** Artefatos para o cliente (QR Pix, boleto, URL 3DS). */
    clientAction: jsonb("client_action"),
    expiresAt: tz("expires_at"),
    lastPolledAt: tz("last_polled_at"),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("marketplace_payments_idempotency_key_unique").on(
      t.idempotencyKey,
    ),
    uniqueIndex("marketplace_payments_provider_order_unique")
      .on(t.provider, t.providerOrderId)
      .where(sql`${t.providerOrderId} is not null`),
    index("marketplace_payments_order_idx").on(t.orderId),
    index("marketplace_payments_enterprise_outcome_idx").on(
      t.enterprisesId,
      t.outcome,
    ),
  ],
);

/** Eventos append-only (resposta de cobrança e webhooks). */
export const marketplacePaymentEvents = pgTable(
  "marketplace_payment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => marketplacePayments.id, { onDelete: "cascade" }),
    provider: marketplacePaymentProviderEnum("provider").notNull(),
    eventId: varchar("event_id", { length: 160 }).notNull(),
    kind: varchar("kind", { length: 64 }).notNull(),
    summary: jsonb("summary"),
    occurredAt: tz("occurred_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("marketplace_payment_events_provider_event_unique").on(
      t.provider,
      t.eventId,
    ),
    index("marketplace_payment_events_payment_idx").on(t.paymentId),
  ],
);
