import { describe, expect, it } from 'vitest'
import { applyChange } from './applyChange'
import { createFormDraft } from './FormDraft'
import { ensureCityValid } from './ensureCityValid'

describe('applyChange — dual source amount', () => {
  it('offline hides amount (visibility source)', () => {
    const draft = createFormDraft({ payType: 'online', qty: 2, unitPrice: 100, amount: 200 })
    const next = applyChange(draft, { path: 'payType', value: 'offline' })
    expect(next.payType).toBe('offline')
    expect(next.amount).toBeNull()
  })

  it('online derives amount from qty * unitPrice (calc source)', () => {
    const draft = createFormDraft({ payType: 'online', qty: 1, unitPrice: 100, amount: 100 })
    const next = applyChange(draft, { path: 'qty', value: 3 })
    expect(next.amount).toBe(300)
  })

  it('qty change under offline does not write amount', () => {
    const draft = createFormDraft({ payType: 'offline', qty: 1, amount: null })
    const next = applyChange(draft, { path: 'qty', value: 5 })
    expect(next.qty).toBe(5)
    expect(next.amount).toBeNull()
  })

  it('switching back to online recalculates amount', () => {
    const draft = createFormDraft({ payType: 'offline', qty: 4, unitPrice: 100, amount: null })
    const next = applyChange(draft, { path: 'payType', value: 'online' })
    expect(next.amount).toBe(400)
  })

  it('province change clears city', () => {
    const draft = createFormDraft({ province: '浙江', city: '杭州' })
    const next = applyChange(draft, { path: 'province', value: '江苏' })
    expect(next.province).toBe('江苏')
    expect(next.city).toBe('')
  })
})

describe('ensureCityValid', () => {
  it('clears city not in options', () => {
    const draft = createFormDraft({ city: '杭州' })
    const next = ensureCityValid(draft, [
      { value: '南京', label: '南京' },
      { value: '苏州', label: '苏州' },
    ])
    expect(next.city).toBe('')
  })
})
