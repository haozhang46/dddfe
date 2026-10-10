import {
  canSubmit,
  isAmountVisible,
  type Option,
  type OrderDraft,
} from '../../../domain/order'
import type { Phase } from './orchestrator'

export type FormViewModel = {
  values: OrderDraft
  ui: {
    amountVisible: boolean
    cityOptions: Option[]
    saving: boolean
    phase: Phase
    dirty: boolean
    lastSavedAt: number | null
  }
  errors: Partial<Record<keyof OrderDraft | 'form', string>>
  canSubmit: boolean
}

export function buildViewModel(args: {
  draft: OrderDraft
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
