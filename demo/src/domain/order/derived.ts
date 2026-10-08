import type { FormDraft } from './FormDraft'
import { isAmountVisible } from './visibility'

export function calcAmount(draft: FormDraft): number {
  return draft.qty * draft.unitPrice
}

/** Only write amount when online; offline left for applyVisibility */
export function applyDerived(draft: FormDraft): FormDraft {
  if (!isAmountVisible(draft)) return draft
  return { ...draft, amount: calcAmount(draft) }
}
