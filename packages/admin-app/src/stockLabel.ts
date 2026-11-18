import { assertPositiveQuantity } from 'core-lib'

/** Admin stock label. Quantity goes through core-lib. */
export function formatStockLabel(sku: string, qty: number): string {
  const safeQty = assertPositiveQuantity(qty)
  const id = sku.trim()
  if (!id) throw new Error('sku is required')
  return `${id}: ${safeQty}`
}
