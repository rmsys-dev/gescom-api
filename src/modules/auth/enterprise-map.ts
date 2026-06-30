import type { UserEnterpriseMembership } from "./repository.js";

export const mapEnterprises = (rows: UserEnterpriseMembership[]) =>
  rows.map((row) => ({
    id: row.enterpriseId,
    registration: row.enterpriseRegistration,
    tradeName: row.enterpriseTradeName,
    legalName: row.enterpriseLegalName,
    memberId: row.memberId,
    class: row.class,
  }));

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
