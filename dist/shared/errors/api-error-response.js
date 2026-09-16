export const createApiErrorResponse = ({ requestId = null, code, message, details, }) => {
    if (!details || details.length === 0) {
        return {
            requestId,
            code,
            message,
        };
    }
    return {
        requestId,
        code,
        message,
        details,
    };
};
