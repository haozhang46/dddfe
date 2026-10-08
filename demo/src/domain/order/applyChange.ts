import type { FieldChange, FormDraft } from './FormDraft'
import { setPath } from './FormDraft'
import { applyDerived } from './derived'
import { applyReactions } from './reactions'
import { applyVisibility } from './visibility'

/**
 * Deterministic convergence for one field edit:
 * setPath → reactions → derived → visibility
 */
export function applyChange(draft: FormDraft, change: FieldChange): FormDraft {
  let next = setPath(draft, change.path, change.value)
  next = applyReactions(next, change)
  next = applyDerived(next)
  next = applyVisibility(next)
  return next
}
