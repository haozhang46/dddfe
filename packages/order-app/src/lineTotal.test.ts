import { describe, expect, it } from 'vitest'
import { orderLineTotal } from './lineTotal'

describe('orderLineTotal', () => {
  it('multiplies price by a core-lib quantity', () => {
    expect(orderLineTotal(100, 3)).toBe(300)
  })

  it('rejects a quantity core-lib does not allow', () => {
    expect(() => orderLineTotal(100, 0)).toThrow(/positive integer/)
  })

  it('rejects a negative unit price', () => {
    expect(() => orderLineTotal(-1, 2)).toThrow(/unit price/)
  })
})
