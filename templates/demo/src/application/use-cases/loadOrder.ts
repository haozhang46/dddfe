import type { OrderDraft } from '../../domain/order'
import type { OrderRepository } from '../ports/OrderRepository'

export function createLoadOrder(repo: OrderRepository) {
  return (orderId: string, signal?: AbortSignal): Promise<OrderDraft> =>
    repo.load(orderId, signal)
}

export type LoadOrder = ReturnType<typeof createLoadOrder>
