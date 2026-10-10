import type { OrderDraft } from './model'
import { isAmountVisible } from './visibility'

export function canSubmit(draft: OrderDraft): boolean {
  if (draft.qty < 1) return false
  if (!draft.province || !draft.city) return false
  if (isAmountVisible(draft)) {
    return draft.amount !== null && draft.amount > 0
  }
  return true
}
