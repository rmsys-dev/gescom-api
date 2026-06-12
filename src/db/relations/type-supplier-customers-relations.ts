import { relations } from "drizzle-orm";
import { typeSupplierCustomers } from "../entities/typeSupplierCustomers.js";
import { enterprisesMembers } from "../entities/members.js";

export const typeSupplierCustomersRelations = relations(
  typeSupplierCustomers,
  ({ many }) => ({
    members: many(enterprisesMembers),
  }),
);
