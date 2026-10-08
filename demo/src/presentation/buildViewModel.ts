import { canSubmit } from '../domain/order/canSubmit'
import type { FormDraft } from '../domain/order/FormDraft'
import { isAmountVisible } from '../domain/order/visibility'
import type { Option } from '../domain/order/ensureCityValid'
import type { Phase } from './orchestrator'

export type FormViewModel = {
  values: FormDraft
  ui: {
    amountVisible: boolean
    cityOptions: Option[]
    saving: boolean
    phase: Phase
    dirty: boolean
    lastSavedAt: number | null
  }
  errors: Partial<Record<keyof FormDraft | 'form', string>>
  canSubmit: boolean
}

export function buildViewModel(args: {
  draft: FormDraft
  phase: Phase
  cityOptions: Option[]
  dirty: boolean
  lastSavedAt: number | null
  error: string | null
}): FormViewModel {
  const { draft, phase, cityOptions, dirty, lastSavedAt, error } = args
  return {
    values: draft,
    ui: {
      amountVisible: isAmountVisible(draft),
      cityOptions,
      saving: phase === 'saving',
      phase,
      dirty,
      lastSavedAt,
    },
    errors: error ? { form: error } : {},
    canSubmit: canSubmit(draft),
  }
}
