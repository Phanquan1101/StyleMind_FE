import { describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'

import { demoReducer, normalizeDemoDatabase } from './demoReducer'

describe('demoReducer', () => {
  it('caps cart quantity at variant stock', () => {
    const state = createDemoSeed()
    const next = demoReducer(state, {
      type: 'cart/lineAdded',
      payload: { productId: 'prd-blouse-01', variantId: 'var-blouse-white-m', quantity: 999, source: 'shop' },
    })

    expect(next.cartLines[0]?.quantity).toBe(8)
  })

  it('clears a session whose user no longer exists', () => {
    const state = { ...createDemoSeed(), session: { userId: 'missing-user', persistent: true } }

    expect(normalizeDemoDatabase(state).session).toBeNull()
  })
})
