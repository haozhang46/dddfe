import type { FieldChange, FormDraft } from './FormDraft'

/** Sync reactions keyed by which field changed */
export function applyReactions(draft: FormDraft, change: FieldChange): FormDraft {
  if (change.path === 'province') {
    return { ...draft, city: '' }
  }
  return draft
}
