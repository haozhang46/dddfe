import { createChangeField } from '../../../application/use-cases/changeField'
import { createLoadCities } from '../../../application/use-cases/loadCities'
import { createLoadOrder } from '../../../application/use-cases/loadOrder'
import { createSaveDraft } from '../../../application/use-cases/saveDraft'
import { RequestQueue } from '../../../infrastructure/queue/RequestQueue'
import { createMockCityQuery } from '../../../infrastructure/repositories/MockCityQuery'
import { createMockOrderRepository } from '../../../infrastructure/repositories/MockOrderRepository'

export function createDeps() {
  const queue = new RequestQueue()
  const orderRepo = createMockOrderRepository(queue)
  const cityQuery = createMockCityQuery(queue)
  const loadCities = createLoadCities(cityQuery)

  return {
    loadOrder: createLoadOrder(orderRepo),
    saveDraft: createSaveDraft(orderRepo),
    loadCities,
    changeField: createChangeField(loadCities),
  }
}

export type Deps = ReturnType<typeof createDeps>
