import type { Option } from '../../domain/order'

export interface CityQuery {
  listByProvince(province: string, signal?: AbortSignal): Promise<Option[]>
}
