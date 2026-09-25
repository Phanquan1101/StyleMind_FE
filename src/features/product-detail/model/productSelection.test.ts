import { describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'

import { getProductSelection } from './productSelection'

const product = createDemoSeed().products.find(item => item.id === 'prd-blouse-01')

if (!product) throw new Error('Expected blouse seed product to exist')

describe('getProductSelection', () => {
  it('switches the visible gallery when color changes', () => {
    const white = getProductSelection(product, { color: 'Trắng', size: 'M' })
    const black = getProductSelection(product, { color: 'Đen', size: 'M' })

    expect(white.images[0]?.url).not.toBe(black.images[0]?.url)
  })

  it('marks an out-of-stock size as unavailable', () => {
    const result = getProductSelection(product, { color: 'Đen', size: 'XL' })

    expect(result.canPurchase).toBe(false)
    expect(result.error).toBe('Kích thước này hiện đã hết hàng')
  })
})
