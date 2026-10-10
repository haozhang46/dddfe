import type { OrderDraft } from '../../domain/order'
import type { OrderRepository } from '../ports/OrderRepository'

export function createSaveDraft(repo: OrderRepository) {
  return (
    draft: OrderDraft,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<OrderDraft> => repo.saveDraft(draft, expectedVersion, signal)
}

export type SaveDraft = ReturnType<typeof createSaveDraft>
