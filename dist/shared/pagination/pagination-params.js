export const DEFAULT_LIST_LIMIT = 50;
export const resolveListPagination = (query, defaultLimit = DEFAULT_LIST_LIMIT) => ({
    limit: query.limit ?? defaultLimit,
    offset: query.offset ?? 0,
});
