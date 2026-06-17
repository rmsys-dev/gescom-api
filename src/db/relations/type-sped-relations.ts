import { relations } from "drizzle-orm";
import { typeSped } from "../entities/typeSped.js";
import { productTypes } from "../entities/products.js";

export const typeSpedRelations = relations(typeSped, ({ many }) => ({
  productTypes: many(productTypes),
}));
