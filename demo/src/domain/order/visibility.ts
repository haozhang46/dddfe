import type { FormDraft } from './FormDraft'

export function isAmountVisible(draft: FormDraft): boolean {
  return draft.payType === 'online'
}

/** Last step of convergence: offline forces amount null */
export function applyVisibility(draft: FormDraft): FormDraft {
  if (!isAmountVisible(draft)) {
    return { ...draft, amount: null }
  }
  return draft
}
