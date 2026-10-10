import type { Draft } from 'immer'
import type { OrderDraft } from './model'

export function isAmountVisible(draft: OrderDraft): boolean {
  return draft.payType === 'online'
}

/** Last step of convergence: offline forces amount null. */
export function applyVisibility(draft: Draft<OrderDraft>): void {
  if (!isAmountVisible(draft)) {
    draft.amount = null
  }
}
