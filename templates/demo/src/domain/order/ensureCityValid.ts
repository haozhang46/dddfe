import { produce } from 'immer'
import type { OrderDraft } from './model'

export type Option = { value: string; label: string }

export function ensureCityValid(draft: OrderDraft, cityOptions: Option[]): OrderDraft {
  return produce(draft, (d) => {
    if (!d.city) return
    const ok = cityOptions.some((o) => o.value === d.city)
    if (!ok) d.city = ''
  })
}
