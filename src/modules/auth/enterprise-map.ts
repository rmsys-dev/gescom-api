import type { UserEnterpriseMembership } from "./repository.js";
import { resolveEnterpriseParametersMany } from "../enterprises/parameters/resolve.js";
import { serializeEnterpriseParameters } from "../enterprises/parameters/catalog.js";

export const mapEnterprises = async (rows: UserEnterpriseMembership[]) => {
  const parametersByEnterprise = await resolveEnterpriseParametersMany(
    rows.map((row) => row.enterpriseId),
  );

  return rows.map((row) => ({
    id: row.enterpriseId,
    registration: row.enterpriseRegistration,
    tradeName: row.enterpriseTradeName,
    legalName: row.enterpriseLegalName,
    memberId: row.memberId,
    class: row.class,
    parameters:
      parametersByEnterprise.get(row.enterpriseId) ??
      serializeEnterpriseParameters({}),
  }));
};

export const mapAuthUser = (user: {
  id: string;
  userName: string;
  userEmail: string | null;
  userRegistration: string | null;
  onboardingCompleted: boolean;
}) => ({
  id: user.id,
  name: user.userName,
  email: user.userEmail ?? null,
  registration: user.userRegistration ?? null,
  onboardingCompleted: user.onboardingCompleted,
});
