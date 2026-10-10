import { produce, type Draft } from 'immer'

export type PayType = 'online' | 'offline'

export type FieldPath =
  | 'payType'
  | 'qty'
  | 'unitPrice'
  | 'amount'
  | 'province'
  | 'city'

export type OrderDraft = {
  id: string
  version: number
  payType: PayType
  qty: number
  /** fen */
  unitPrice: number
  /** fen; null when hidden (offline) */
  amount: number | null
  province: string
  city: string
}

export type FieldChange = {
  path: FieldPath
  value: unknown
}

export function createOrderDraft(partial?: Partial<OrderDraft>): OrderDraft {
  return {
    id: 'order-1',
    version: 1,
    payType: 'online',
    qty: 1,
    unitPrice: 100,
    amount: 100,
    province: '',
    city: '',
    ...partial,
  }
}

/** Mutate draft in place — call only inside `produce`. */
export function setPath(
  draft: Draft<OrderDraft>,
  path: FieldPath,
  value: unknown,
): void {
  switch (path) {
    case 'payType':
      if (value !== 'online' && value !== 'offline') return
      draft.payType = value
      return
    case 'qty': {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 1) return
      draft.qty = Math.floor(n)
      return
    }
    case 'unitPrice': {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0) return
      draft.unitPrice = Math.floor(n)
      return
    }
    case 'amount': {
      if (value === null) {
        draft.amount = null
        return
      }
      const n = Number(value)
      if (!Number.isFinite(n)) return
      draft.amount = Math.floor(n)
      return
    }
    case 'province':
      draft.province = String(value)
      return
    case 'city':
      draft.city = String(value)
      return
    default:
      return
  }
}

/** Public immutable entry when callers need setPath alone. */
export function setPathImmutable(
  draft: OrderDraft,
  path: FieldPath,
  value: unknown,
): OrderDraft {
  return produce(draft, (d) => {
    setPath(d, path, value)
  })
}
