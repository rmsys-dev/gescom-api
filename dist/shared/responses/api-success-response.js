export const createApiSuccessResponse = ({ message, data = null, pagination, }) => {
    if (pagination) {
        return {
            success: true,
            message,
            data: data ?? null,
            pagination,
        };
    }
    return {
        success: true,
        message,
        data: data ?? null,
    };
};
