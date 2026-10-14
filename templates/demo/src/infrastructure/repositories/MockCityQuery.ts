import type { CityQuery } from '../../application/ports/CityQuery'
import { citiesOf } from '../mock/cityData'
import { delay } from '../mock/delay'
import { QueuePriority, type RequestQueue } from '../queue/RequestQueue'

export function createMockCityQuery(queue: RequestQueue): CityQuery {
  return {
    listByProvince(province, signal) {
      return queue.enqueue(
        async (qSignal) => {
          await delay(200, qSignal)
          return citiesOf(province)
        },
        { key: `cities:${province}`, signal, priority: QueuePriority.userWaiting },
      )
    },
  }
}
