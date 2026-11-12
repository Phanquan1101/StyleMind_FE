import { describe, expect, it } from 'vitest'

import type { OutfitItemDto } from '@/shared/api/communityApi'

import { categoryCountsOfItems, categoryCountsOfSummary, formatOutfitSummary } from './outfitCategories'

const item = (id: string, categoryId: string | null, categoryName: string | null): OutfitItemDto => ({
  outfit_item_id: id, variant_id: id, product_id: id, product_name: id, color: null, size: null, unit_price_vnd: 1, image_url: null, available: true,
  category_id: categoryId, category_name: categoryName,
})

describe('outfit category counts', () => {
  it('counts items per category in order of first appearance and skips items without category data', () => {
    const counts = categoryCountsOfItems([item('1', 'a', 'Áo'), item('2', 'q', 'Quần'), item('3', 'a', 'Áo'), item('4', null, null)])
    expect(counts).toEqual([{ id: 'a', name: 'Áo', count: 2 }, { id: 'q', name: 'Quần', count: 1 }])
  })

  it('formats "3 món · 2 áo · 1 quần"', () => {
    expect(formatOutfitSummary(3, [{ id: 'a', name: 'Áo', count: 2 }, { id: 'q', name: 'Quần', count: 1 }])).toBe('3 món · 2 áo · 1 quần')
    expect(formatOutfitSummary(2, [{ id: 'k', name: 'Áo khoác', count: 1 }])).toBe('2 món · 1 áo khoác')
  })

  it('shows only the total when the server sent no category data', () => {
    expect(formatOutfitSummary(3, categoryCountsOfSummary(undefined))).toBe('3 món')
    expect(formatOutfitSummary(3, categoryCountsOfSummary([]))).toBe('3 món')
  })

  it('maps the summary payload', () => {
    expect(categoryCountsOfSummary([{ category_id: 'a', category_name: 'Áo', count: 2 }, { category_id: 'x', category_name: null, count: 0 }])).toEqual([{ id: 'a', name: 'Áo', count: 2 }])
  })
})
