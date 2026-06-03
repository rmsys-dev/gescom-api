export const DEFAULT_LIST_LIMIT = 50;

export type PaginationInput = {
  limit?: number;
  offset?: number;
};

export const resolveListPagination = (
  query: PaginationInput,
  defaultLimit = DEFAULT_LIST_LIMIT,
) => ({
  limit: query.limit ?? defaultLimit,
  offset: query.offset ?? 0,
});
