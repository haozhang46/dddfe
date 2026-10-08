import type { Option } from '../../domain/order/ensureCityValid'

export interface CityQuery {
  listByProvince(province: string, signal?: AbortSignal): Promise<Option[]>
}
