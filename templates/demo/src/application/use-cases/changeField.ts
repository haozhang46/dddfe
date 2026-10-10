import {
  applyChange,
  ensureCityValid,
  type FieldPath,
  type Option,
  type OrderDraft,
} from '../../domain/order'
import type { LoadCities } from './loadCities'

export type ChangeFieldResult = {
  draft: OrderDraft
  cityOptions?: Option[]
}

export function createChangeField(loadCities: LoadCities) {
  return async (
    draft: OrderDraft,
    path: FieldPath,
    value: unknown,
    signal?: AbortSignal,
  ): Promise<ChangeFieldResult> => {
    let next = applyChange(draft, { path, value })
    let cityOptions: Option[] | undefined

    if (path === 'province' && next.province) {
      cityOptions = await loadCities(next.province, signal)
      next = ensureCityValid(next, cityOptions)
    } else if (path === 'province' && !next.province) {
      cityOptions = []
    }

    return { draft: next, cityOptions }
  }
}

export type ChangeField = ReturnType<typeof createChangeField>
