import type { OrderDraft } from '../../domain/order'

export interface OrderRepository {
  load(orderId: string, signal?: AbortSignal): Promise<OrderDraft>
  saveDraft(
    draft: OrderDraft,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<OrderDraft>
}
