export const paginateArray = <T>(
  items: readonly T[],
  limit: number,
  offset: number,
) => ({
  items: items.slice(offset, offset + limit),
  total: items.length,
  limit,
  offset,
});
