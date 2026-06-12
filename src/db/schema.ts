import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as addresses from "./entities/addresses.js";
import * as departments from "./entities/departments.js";
import * as enterprises from "./entities/enterprises.js";
import * as enums from "./enums.js";
import * as members from "./entities/members.js";
import * as sequences from "./entities/sequences.js";
import * as users from "./entities/users.js";
import * as authentication from "./entities/authentication.js";
import * as products from "./entities/products.js";
import * as sales from "./entities/sales.js";
import * as stock from "./entities/stock.js";
import * as typeOfCustomers from "./entities/typeSupplierCustomers.js";
import * as typeNetworks from "./entities/typeNetworks.js";
import * as auditoriums from "./auditoriums.js";

export * from "./entities/addresses.js";
export * from "./entities/departments.js";
export * from "./entities/enterprises.js";
export * from "./enums.js";
export * from "./entities/members.js";
export * from "./entities/sequences.js";
export * from "./entities/users.js";
export * from "./entities/authentication.js";
export * from "./entities/products.js";
export * from "./entities/sales.js";
export * from "./entities/stock.js";
export * from "./entities/typeSupplierCustomers.js";
export * from "./entities/typeNetworks.js";
export * from "./auditoriums.js";

/**RELAÇÕES**/

import * as addressesRelations from "./relations/addresses-relations.js";
import * as enterpriseRelations from "./relations/enterprise-relations.js";
import * as membersRelations from "./relations/members.relations.js";
import * as usersRelations from "./relations/users.relations.js";
import * as authRelations from "./relations/auth-relations.js";
import * as productsRelations from "./relations/products-relations.js";
import * as salesRelations from "./relations/sales-relations.js";
import * as stockRelations from "./relations/stock-relations.js";
import * as typeOfCustomersRelations from "./relations/type-supplier-customers-relations.js";
import * as typeNetworksRelations from "./relations/type-networks-relations.js";

export * from "./relations/addresses-relations.js";
export * from "./relations/enterprise-relations.js";
export * from "./relations/members.relations.js";
export * from "./relations/users.relations.js";
export * from "./relations/auth-relations.js";
export * from "./relations/products-relations.js";
export * from "./relations/sales-relations.js";
export * from "./relations/stock-relations.js";
export * from "./relations/type-supplier-customers-relations.js";
export * from "./relations/type-networks-relations.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não definida no ambiente.");
}

const client = postgres(connectionString, { prepare: false });
const schema = {
  ...addresses,
  ...departments,
  ...enterprises,
  ...enums,
  ...members,
  ...sequences,
  ...users,
  ...authentication,
  ...products,
  ...sales,
  ...stock,
  ...typeOfCustomers,
  ...typeNetworks,
  ...auditoriums,
  ...addressesRelations,
  ...enterpriseRelations,
  ...membersRelations,
  ...usersRelations,
  ...authRelations,
  ...productsRelations,
  ...salesRelations,
  ...stockRelations,
  ...typeOfCustomersRelations,
  ...typeNetworksRelations,
};

export const db = drizzle(client, { schema });
