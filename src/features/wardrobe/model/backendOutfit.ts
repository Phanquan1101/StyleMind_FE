import type { OutfitCreationSource, OutfitItemView, OutfitSummary } from '@/shared/api/wardrobeApi'

export const OUTFIT_NAME_MAX_LENGTH = 100
export const OUTFIT_MAX_ITEMS = 10

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Backend outfits use UUID ids; the older demo outfits use ids such as "outfit-manual-123". */
export function isUuid(value: string | undefined): value is string {
  return value !== undefined && UUID_PATTERN.test(value)
}

export function outfitSourceLabel(source: OutfitCreationSource): string {
  return source === 'AI' ? 'AI' : 'Thủ công'
}

/** Unavailable (discontinued) items are not counted in the total. */
export function outfitTotal(items: OutfitItemView[]): number {
  return items.reduce((sum, item) => (item.available && item.unit_price_vnd !== null ? sum + item.unit_price_vnd : sum), 0)
}

/** Merge a loaded page into the list; an outfit that is already listed keeps its position and takes the new data. */
export function mergeOutfitPage(current: OutfitSummary[], incoming: OutfitSummary[]): OutfitSummary[] {
  const merged = new Map(current.map(outfit => [outfit.outfit_id, outfit]))
  incoming.forEach(outfit => merged.set(outfit.outfit_id, outfit))
  return [...merged.values()]
}

export type OutfitNameCheck = { ok: true; name: string } | { ok: false; message: string }

export function checkOutfitName(raw: string): OutfitNameCheck {
  const name = raw.trim()
  if (!name) return { ok: false, message: 'Vui lòng nhập tên outfit' }
  if (Array.from(name).length > OUTFIT_NAME_MAX_LENGTH) {
    return { ok: false, message: `Tên outfit tối đa ${OUTFIT_NAME_MAX_LENGTH} ký tự` }
  }
  return { ok: true, name }
}
