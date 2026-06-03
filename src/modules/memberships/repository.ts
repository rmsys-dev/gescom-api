import { enterprisesMembers } from "../../db/schema.js";
import {
  normalizeCpfCnpj,
  normalizeEmail,
  normalizePhone,
} from "../../shared/validation/data-normalizers.js";

export const normalizeMemberListFilters = (query: {
  userId?: string;
  class?: (typeof enterprisesMembers.$inferSelect)["class"];
  status?: (typeof enterprisesMembers.$inferSelect)["status"];
  registration?: string;
  email?: string;
  phone?: string;
}) => ({
  userId: query.userId,
  class: query.class,
  status: query.status,
  registration: query.registration
    ? normalizeCpfCnpj(query.registration)
    : undefined,
  email: query.email ? normalizeEmail(query.email) : undefined,
  phone: query.phone ? normalizePhone(query.phone) : undefined,
});
