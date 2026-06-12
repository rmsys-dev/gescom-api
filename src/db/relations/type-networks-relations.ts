import { relations } from "drizzle-orm";
import { typeNetworks } from "../entities/typeNetworks.js";
import { enterprisesMembers } from "../entities/members.js";

export const typeNetworksRelations = relations(typeNetworks, ({ many }) => ({
  members: many(enterprisesMembers),
}));
