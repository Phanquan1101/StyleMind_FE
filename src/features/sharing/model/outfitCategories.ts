import type { OutfitCategoryCountDto, OutfitItemDto } from '@/shared/api/communityApi'

export interface CategoryCount {
  id: string
  name: string
  count: number
}

/** Items per category, in order of first appearance. Items without category data are not counted. */
export function categoryCountsOfItems(items: OutfitItemDto[]): CategoryCount[] {
  const counts = new Map<string, CategoryCount>()
  for (const item of items) {
    if (!item.category_id) continue
    const current = counts.get(item.category_id)
    if (current) current.count += 1
    else counts.set(item.category_id, { id: item.category_id, name: item.category_name || 'Khác', count: 1 })
  }
  return [...counts.values()]
}

export function categoryCountsOfSummary(counts?: OutfitCategoryCountDto[] | null): CategoryCount[] {
  return (counts ?? []).filter(entry => entry.count > 0).map(entry => ({ id: entry.category_id, name: entry.category_name || 'Khác', count: entry.count }))
}

/** "3 món · 2 áo · 1 quần" (the per-category part is left out when the server sent no category data). */
export function formatOutfitSummary(total: number, counts: CategoryCount[]): string {
  const parts = counts.map(entry => `${entry.count} ${entry.name.toLocaleLowerCase('vi-VN')}`)
  return [`${total} món`, ...parts].join(' · ')
}
