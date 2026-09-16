export const paginateArray = (items, limit, offset) => ({
    items: items.slice(offset, offset + limit),
    total: items.length,
    limit,
    offset,
});
