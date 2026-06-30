export type UserApiSummary = {
  id: string;
  userName: string;
  userPhone: string | null;
  userEmail: string | null;
  userRegistration?: string | null;
};

export const mapUserToApiSummary = (row: {
  id: string;
  userName: string;
  userPhone: string | null;
  userEmail: string | null;
  userRegistration?: string | null;
}): UserApiSummary => {
  const summary: UserApiSummary = {
    id: row.id,
    userName: row.userName,
    userPhone: row.userPhone,
    userEmail: row.userEmail,
  };

  if (row.userRegistration != null) {
    summary.userRegistration = row.userRegistration;
  }

  return summary;
};
