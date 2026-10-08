import { applyChange } from '../../domain/order/applyChange'
import type { FieldPath, FormDraft } from '../../domain/order/FormDraft'
import { ensureCityValid, type Option } from '../../domain/order/ensureCityValid'
import type { LoadCities } from './loadCities'

export type ChangeFieldResult = {
  draft: FormDraft
  cityOptions?: Option[]
}

export function createChangeField(loadCities: LoadCities) {
  return async (
    draft: FormDraft,
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
