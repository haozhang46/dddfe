import type { OrderRepository } from '../../application/ports/OrderRepository'
import { createOrderDraft, type OrderDraft } from '../../domain/order'
import { delay } from '../mock/delay'
import { RequestQueue } from '../queue/RequestQueue'

export function createMockOrderRepository(queue: RequestQueue): OrderRepository {
  let store: OrderDraft = createOrderDraft({
    province: '浙江',
    city: '杭州',
  })

  return {
    load(orderId, signal) {
      return queue.enqueue(
        async (qSignal) => {
          await delay(250, qSignal)
          if (store.id !== orderId) {
            store = createOrderDraft({ id: orderId, province: '浙江', city: '杭州' })
          }
          return { ...store }
        },
        { key: `order:load:${orderId}`, signal },
      )
    },

    saveDraft(draft, expectedVersion, signal) {
      return queue.enqueue(
        async (qSignal) => {
          await delay(300, qSignal)
          if (draft.version !== expectedVersion) {
            throw new Error('VERSION_CONFLICT')
          }
          store = { ...draft, version: expectedVersion + 1 }
          return { ...store }
        },
        { key: `order:write:${draft.id}`, signal },
      )
    },
  }
}
