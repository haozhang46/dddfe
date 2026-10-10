import type { Draft } from 'immer'
import type { FieldChange, OrderDraft } from './model'

/** Sync reactions keyed by which field changed — mutate inside `produce`. */
export function applyReactions(
  draft: Draft<OrderDraft>,
  change: FieldChange,
): void {
  if (change.path === 'province') {
    draft.city = ''
  }
}
