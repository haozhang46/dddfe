import type { FormDraft } from './FormDraft'
import { isAmountVisible } from './visibility'

export function canSubmit(draft: FormDraft): boolean {
  if (draft.qty < 1) return false
  if (!draft.province || !draft.city) return false
  if (isAmountVisible(draft)) {
    return draft.amount !== null && draft.amount > 0
  }
  return true
}
