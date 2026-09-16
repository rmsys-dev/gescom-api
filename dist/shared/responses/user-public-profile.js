export const mapUserToApiSummary = (row) => {
    const summary = {
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
