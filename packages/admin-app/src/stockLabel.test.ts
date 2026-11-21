import { describe, expect, it } from 'vitest'
import { formatStockLabel } from './stockLabel'

describe('formatStockLabel', () => {
  it('formats sku and a core-lib quantity', () => {
    expect(formatStockLabel('sku-1', 4)).toBe('sku-1: 4')
  })

  it('rejects a quantity core-lib does not allow', () => {
    expect(() => formatStockLabel('sku-1', -1)).toThrow(/positive integer/)
  })

  it('rejects a blank sku', () => {
    expect(() => formatStockLabel('   ', 1)).toThrow(/sku is required/)
  })
})
