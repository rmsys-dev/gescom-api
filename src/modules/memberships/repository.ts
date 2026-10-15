import { enterprisesMembers } from "../../db/schema.js";
import { normalizeEmail } from "../../shared/validation/data-normalizers.js";

export const normalizeMemberListFilters = (query: {
  userId?: string;
  code?: number;
  class?: (typeof enterprisesMembers.$inferSelect)["class"];
  status?: (typeof enterprisesMembers.$inferSelect)["status"];
  postSalesStatus?: (typeof enterprisesMembers.$inferSelect)["postSalesStatus"];
  name?: string;
  registration?: string;
  email?: string;
  phone?: string;
  stateRegistration?: string;
  city?: string;
  uf?: string;
  address?: string;
  neighborhood?: string;
  cep?: string;
}) => ({
  userId: query.userId,
  code: query.code,
  class: query.class,
  status: query.status,
  postSalesStatus: query.postSalesStatus,
  name: query.name?.trim() || undefined,
  registration: query.registration
    ? query.registration.replace(/\D/g, "") || undefined
    : undefined,
  email: query.email ? normalizeEmail(query.email) : undefined,
  phone: query.phone?.replace(/\D/g, "") || undefined,
  stateRegistration: query.stateRegistration?.trim() || undefined,
  city: query.city?.trim() || undefined,
  uf: query.uf?.trim() || undefined,
  address: query.address?.trim() || undefined,
  neighborhood: query.neighborhood?.trim() || undefined,
  cep: query.cep?.replace(/\D/g, "") || undefined,
});
