import { describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'

import { getProductSelection } from './productSelection'

const product = createDemoSeed().products.find(item => item.id === 'prd-blouse-01')

if (!product) throw new Error('Expected blouse seed product to exist')

describe('getProductSelection', () => {
  it('switches the visible gallery when color changes', () => {
    const [firstColor, secondColor] = Array.from(new Set(product.variants.map(variant => variant.color)))
    const white = getProductSelection(product, { color: firstColor, size: 'M' })
    const black = getProductSelection(product, { color: secondColor, size: 'M' })

    expect(white.images[0]?.url).not.toBe(black.images[0]?.url)
  })

  it('treats an active variant as purchasable without stock checks', () => {
    const zeroStockVariant = product.variants.find(variant => variant.active && variant.stock === 0)

    expect(zeroStockVariant).toBeDefined()

    const result = getProductSelection(product, {
      color: zeroStockVariant!.color,
      size: zeroStockVariant!.size,
    })

    expect(result.canPurchase).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('sorts letter sizes first, then numeric sizes by value, then other labels', () => {
    const labels = ['Một cỡ', '10', 'XL', '4', '28', 'S', '2XL', '6']
    const variants = labels.map((size, index) => ({
      id: `v-${index}`, color: 'Đen', colorHex: '#000', size: size as never, stock: 3, images: [], active: true,
    }))
    const sorted = getProductSelection({ ...product, variants }, { color: 'Đen' }).sizeOptions.map(option => option.size as string)

    expect(sorted).toEqual(['S', 'XL', '2XL', '4', '6', '10', '28', 'Một cỡ'])
  })
})
