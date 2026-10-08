import type { FormDraft } from './FormDraft'

export type Option = { value: string; label: string }

export function ensureCityValid(draft: FormDraft, cityOptions: Option[]): FormDraft {
  if (!draft.city) return draft
  const ok = cityOptions.some((o) => o.value === draft.city)
  if (ok) return draft
  return { ...draft, city: '' }
}
