import type { Outfit } from '@/entities/outfit/model/types'
import type { Product, ProductVariant } from '@/entities/product/model/types'

export interface OutfitDraftItem {
  id: string
  productId: string
  variantId: string
  /** Snapshot of the product taken when it was added, so the draft still renders after the catalog page or filter changes. */
  product: Product
}

export interface OutfitDraft {
  ownerId: string
  name: string
  items: OutfitDraftItem[]
}

export interface OutfitDraftErrors {
  name?: string
  items?: string
}

export const UNAVAILABLE_ITEMS_MESSAGE = 'Có món không còn bán. Hãy đổi màu/size hoặc xóa món đó trước khi lưu.'

export function createManualOutfitDraft(ownerId: string): OutfitDraft {
  return {
    ownerId,
    name: '',
    items: [],
  }
}

// Ids come from a counter, never from the item position: positions are reused after a removal and made ids collide
// (one click on "Xóa" then removed two items).
let draftItemSequence = 0

export function createDraftItem(product: Product, variantId: string): OutfitDraftItem {
  draftItemSequence += 1
  return { id: `draft-item-${draftItemSequence}`, productId: product.id, variantId, product }
}

/** First variant with a primary image, else the first active one. */
export function defaultVariantOf(product: Product): ProductVariant | undefined {
  const active = product.variants.filter(variant => variant.active)
  return active.find(variant => variant.images.some(image => image.isPrimary)) ?? active[0]
}

/** The variant of an item is gone or inactive, or its product is no longer sold. */
export function isDraftItemUnavailable(item: OutfitDraftItem): boolean {
  const variant = item.product.variants.find(candidate => candidate.id === item.variantId)
  return !item.product.active || !variant || !variant.active
}

export interface DraftItemGroup {
  key: string
  name: string
  items: OutfitDraftItem[]
}

/** Items grouped by category, in order of first appearance. */
export function groupDraftItemsByCategory(items: OutfitDraftItem[]): DraftItemGroup[] {
  const groups = new Map<string, DraftItemGroup>()
  for (const item of items) {
    const key = item.product.categoryId || 'other'
    const group = groups.get(key) ?? { key, name: item.product.categoryName || 'Khác', items: [] }
    group.items.push(item)
    groups.set(key, group)
  }
  return [...groups.values()]
}

export function validateOutfitDraft(draft: OutfitDraft): OutfitDraftErrors {
  const errors: OutfitDraftErrors = {}

  if (!draft.name.trim()) {
    errors.name = 'Vui lòng nhập tên outfit'
  }

  if (draft.items.length === 0) {
    errors.items = 'Vui lòng thêm ít nhất một món'
  } else if (draft.items.some(isDraftItemUnavailable)) {
    errors.items = UNAVAILABLE_ITEMS_MESSAGE
  }

  return errors
}

export function draftToOutfit(draft: OutfitDraft, now: string): Outfit {
  const parsedTime = Date.parse(now)
  const stamp = Number.isFinite(parsedTime) ? parsedTime : Date.now()

  return {
    id: `outfit-manual-${stamp}`,
    ownerId: draft.ownerId,
    name: draft.name.trim(),
    source: 'manual',
    visibility: 'private',
    items: draft.items.map((item, index) => ({
      id: `outfit-item-${stamp}-${index + 1}`,
      productId: item.productId,
      variantId: item.variantId,
      addedBy: 'owner',
    })),
    createdAt: now,
    updatedAt: now,
  }
}
