import type { OrderRepository } from '../../application/ports/OrderRepository'
import { createFormDraft, type FormDraft } from '../../domain/order/FormDraft'
import { delay } from '../mock/delay'
import { RequestQueue } from '../queue/RequestQueue'

export function createMockOrderRepository(
  queue: RequestQueue = new RequestQueue(),
): OrderRepository {
  let store: FormDraft = createFormDraft({
    province: '浙江',
    city: '杭州',
  })

  return {
    load(orderId, signal) {
      return queue.enqueue(
        async (qSignal) => {
          await delay(250, qSignal)
          if (store.id !== orderId) {
            store = createFormDraft({ id: orderId, province: '浙江', city: '杭州' })
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
