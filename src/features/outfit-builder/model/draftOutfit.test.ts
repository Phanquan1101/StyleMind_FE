import { describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'

import {
  createDraftItem,
  createManualOutfitDraft,
  groupDraftItemsByCategory,
  isDraftItemUnavailable,
  UNAVAILABLE_ITEMS_MESSAGE,
  validateOutfitDraft,
} from './draftOutfit'

const product = createDemoSeed().products.find(item => item.active && item.variants.filter(variant => variant.active).length >= 2)!
const [first, second] = product.variants.filter(variant => variant.active)

describe('draft items', () => {
  it('gives every item a unique id even when product and variant repeat', () => {
    // Old ids were built from the item position and collided after removals (one click on "Xóa" removed two items).
    const ids = Array.from({ length: 50 }, () => createDraftItem(product, first.id).id)
    expect(new Set(ids).size).toBe(50)
  })

  it('flags an item whose variant is inactive, missing or whose product is switched off', () => {
    expect(isDraftItemUnavailable(createDraftItem(product, first.id))).toBe(false)
    expect(isDraftItemUnavailable(createDraftItem(product, 'unknown-variant'))).toBe(true)
    const switchedOff = { ...product, variants: product.variants.map(variant => (variant.id === first.id ? { ...variant, active: false } : variant)) }
    expect(isDraftItemUnavailable(createDraftItem(switchedOff, first.id))).toBe(true)
    expect(isDraftItemUnavailable(createDraftItem({ ...product, active: false }, second.id))).toBe(true)
  })

  it('groups items by category in order of first appearance', () => {
    const shirt = { ...product, id: 'p-shirt', categoryId: 'c-shirt', categoryName: 'Áo' }
    const pants = { ...product, id: 'p-pants', categoryId: 'c-pants', categoryName: 'Quần' }
    const other = { ...product, id: 'p-shirt-2', categoryId: 'c-shirt', categoryName: 'Áo' }
    const unnamed = { ...product, id: 'p-unknown', categoryId: '', categoryName: undefined }
    const groups = groupDraftItemsByCategory([shirt, pants, other, unnamed].map(item => createDraftItem(item, first.id)))

    expect(groups.map(group => `${group.name} (${group.items.length})`)).toEqual(['Áo (2)', 'Quần (1)', 'Khác (1)'])
  })
})

describe('validateOutfitDraft', () => {
  it('asks for a name and at least one item', () => {
    expect(validateOutfitDraft(createManualOutfitDraft('u'))).toEqual({ name: 'Vui lòng nhập tên outfit', items: 'Vui lòng thêm ít nhất một món' })
  })

  it('blocks saving while an item is no longer sold', () => {
    const draft = { ...createManualOutfitDraft('u'), name: 'Đi chơi', items: [createDraftItem(product, 'gone')] }
    expect(validateOutfitDraft(draft)).toEqual({ items: UNAVAILABLE_ITEMS_MESSAGE })
  })
})
