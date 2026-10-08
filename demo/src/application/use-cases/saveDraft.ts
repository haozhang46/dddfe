import type { FormDraft } from '../../domain/order/FormDraft'
import type { OrderRepository } from '../ports/OrderRepository'

export function createSaveDraft(repo: OrderRepository) {
  return (
    draft: FormDraft,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<FormDraft> => repo.saveDraft(draft, expectedVersion, signal)
}

export type SaveDraft = ReturnType<typeof createSaveDraft>
