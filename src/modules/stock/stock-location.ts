export function productRequiresStockLocation(product: {
  controlsBatch: boolean;
  controlsRental: boolean;
}) {
  return product.controlsRental || product.controlsBatch;
}
