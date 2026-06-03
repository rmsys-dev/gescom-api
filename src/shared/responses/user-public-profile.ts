export type UserApiSummary = {
  id: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  userRegistration?: string;
};

export const mapUserToApiSummary = (row: {
  id: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  userRegistration?: string;
}): UserApiSummary => {
  const summary: UserApiSummary = {
    id: row.id,
    userName: row.userName,
    userPhone: row.userPhone,
    userEmail: row.userEmail,
  };

  if (row.userRegistration !== undefined) {
    summary.userRegistration = row.userRegistration;
  }

  return summary;
};
