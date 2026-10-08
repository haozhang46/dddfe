import type { FormDraft } from '../../domain/order/FormDraft'
import type { OrderRepository } from '../ports/OrderRepository'

export function createLoadOrder(repo: OrderRepository) {
  return (orderId: string, signal?: AbortSignal): Promise<FormDraft> =>
    repo.load(orderId, signal)
}

export type LoadOrder = ReturnType<typeof createLoadOrder>
