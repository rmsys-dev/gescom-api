import { normalizeCpfCnpj, normalizeEmail, normalizePhone, } from "../../shared/validation/data-normalizers.js";
export const normalizeMemberListFilters = (query) => ({
    userId: query.userId,
    code: query.code,
    class: query.class,
    status: query.status,
    postSalesStatus: query.postSalesStatus,
    name: query.name?.trim() || undefined,
    registration: query.registration
        ? normalizeCpfCnpj(query.registration)
        : undefined,
    email: query.email ? normalizeEmail(query.email) : undefined,
    phone: query.phone ? normalizePhone(query.phone) : undefined,
});
