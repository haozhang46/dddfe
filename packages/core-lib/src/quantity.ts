/** Shared kernel: an order quantity is a positive integer. */
export function assertPositiveQuantity(qty: number): number {
  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error('quantity must be a positive integer')
  }
  return qty
}
