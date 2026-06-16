import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  pgTable,
  uniqueIndex,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";
import { statusEnum } from "../enums.js";
import { tz } from "../functions.js";

//Tabela de usuários
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userName: varchar("user_name", { length: 255 }).notNull(),
    userRegistration: varchar("user_registration", { length: 14 }).notNull(), // CPF/CNPJ
    userEmail: varchar("user_email", { length: 255 }).notNull(), // Email
    userPhone: varchar("user_phone", { length: 20 }).notNull(), // Telefone
    status: statusEnum("status").default("ATIVO").notNull(),
    onboardingCompleted: boolean("onboarding_completed")
      .default(false)
      .notNull(),
    registeredOn: date("registered_on", { mode: "date" })
      .default(sql`CURRENT_DATE`)
      .notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("users_registration_active_unique")
      .on(t.userRegistration)
      .where(sql`${t.deletedAt} is null`),
    uniqueIndex("users_email_active_unique")
      .on(t.userEmail)
      .where(sql`${t.userEmail} is not null and ${t.deletedAt} is null`),
    uniqueIndex("users_phone_active_unique")
      .on(t.userPhone)
      .where(sql`${t.userPhone} is not null and ${t.deletedAt} is null`),
    index("users_active_name_idx").on(t.deletedAt, t.userName),
  ],
);
