import { assertPositiveQuantity } from 'core-lib'

/** Line total for an order that uses the shared quantity rule. */
export function orderLineTotal(unitPrice: number, qty: number): number {
  const safeQty = assertPositiveQuantity(qty)
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error('unit price must be a non-negative finite number')
  }
  return unitPrice * safeQty
}
