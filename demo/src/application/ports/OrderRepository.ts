import type { FormDraft } from '../../domain/order/FormDraft'

export interface OrderRepository {
  load(orderId: string, signal?: AbortSignal): Promise<FormDraft>
  saveDraft(
    draft: FormDraft,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<FormDraft>
}
