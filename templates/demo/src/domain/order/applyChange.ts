import { produce } from 'immer'
import type { FieldChange, OrderDraft } from './model'
import { setPath } from './model'
import { applyDerived } from './derived'
import { applyReactions } from './reactions'
import { applyVisibility } from './visibility'

/**
 * Deterministic convergence for one field edit:
 * setPath → reactions → derived → visibility
 *
 * Single `produce` boundary — pipeline steps mutate the draft in place.
 */
export function applyChange(draft: OrderDraft, change: FieldChange): OrderDraft {
  return produce(draft, (d) => {
    setPath(d, change.path, change.value)
    applyReactions(d, change)
    applyDerived(d)
    applyVisibility(d)
  })
}
