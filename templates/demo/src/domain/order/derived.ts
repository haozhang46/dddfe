import type { Draft } from 'immer'
import type { OrderDraft } from './model'
import { isAmountVisible } from './visibility'

export function calcAmount(draft: OrderDraft): number {
  return draft.qty * draft.unitPrice
}

/** Only write amount when online; offline left for applyVisibility. */
export function applyDerived(draft: Draft<OrderDraft>): void {
  if (!isAmountVisible(draft)) return
  draft.amount = calcAmount(draft)
}
