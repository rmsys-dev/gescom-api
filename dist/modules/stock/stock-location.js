export function productRequiresStockLocation(product) {
    return product.controlsRental || product.controlsBatch;
}
