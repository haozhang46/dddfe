import { describe, expect, it } from 'vitest'
import { assertPositiveQuantity } from './quantity'

describe('assertPositiveQuantity', () => {
  it('returns a positive integer unchanged', () => {
    expect(assertPositiveQuantity(3)).toBe(3)
  })

  it('rejects zero, fractions, and negatives', () => {
    expect(() => assertPositiveQuantity(0)).toThrow(/positive integer/)
    expect(() => assertPositiveQuantity(1.5)).toThrow(/positive integer/)
    expect(() => assertPositiveQuantity(-2)).toThrow(/positive integer/)
  })
})
