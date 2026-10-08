export type PayType = 'online' | 'offline'

export type FieldPath =
  | 'payType'
  | 'qty'
  | 'unitPrice'
  | 'amount'
  | 'province'
  | 'city'

export type FormDraft = {
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

export function createFormDraft(partial?: Partial<FormDraft>): FormDraft {
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

export function setPath(draft: FormDraft, path: FieldPath, value: unknown): FormDraft {
  switch (path) {
    case 'payType':
      if (value !== 'online' && value !== 'offline') return draft
      return { ...draft, payType: value }
    case 'qty': {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 1) return draft
      return { ...draft, qty: Math.floor(n) }
    }
    case 'unitPrice': {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0) return draft
      return { ...draft, unitPrice: Math.floor(n) }
    }
    case 'amount': {
      if (value === null) return { ...draft, amount: null }
      const n = Number(value)
      if (!Number.isFinite(n)) return draft
      return { ...draft, amount: Math.floor(n) }
    }
    case 'province':
      return { ...draft, province: String(value) }
    case 'city':
      return { ...draft, city: String(value) }
    default:
      return draft
  }
}
