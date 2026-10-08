import type { Option } from '../../domain/order/ensureCityValid'
import type { CityQuery } from '../ports/CityQuery'

export function createLoadCities(query: CityQuery) {
  return (province: string, signal?: AbortSignal): Promise<Option[]> =>
    query.listByProvince(province, signal)
}

export type LoadCities = ReturnType<typeof createLoadCities>
