import { activeVariants, productImage, type CatalogProduct, type CatalogVariant } from '@/shared/api/commerceCatalogApi'

export const MAX_DRAFT_ITEMS = 10
export const DRAFT_NAME_MAX_LENGTH = 100

/** One variant picked from the Commerce catalog; the product's other active variants stay available for switching. */
export interface DraftItem {
  variantId: string
  productId: string
  productName: string
  brandName: string | null
  color: string | null
  size: string | null
  unitPriceVnd: number
  imageUrl: string | null
  imageAlt: string | null
  alternatives: CatalogVariant[]
  /** Set when Commerce says the variant is no longer on sale; such a draft cannot be saved. */
  discontinued: boolean
}

export interface OutfitDraft {
  name: string
  items: DraftItem[]
}

export interface OutfitDraftErrors {
  name?: string
  items?: string
}

export function createManualOutfitDraft(): OutfitDraft {
  return { name: '', items: [] }
}

export function createDraftItem(product: CatalogProduct, variant: CatalogVariant): DraftItem {
  const image = productImage(product, variant)
  return {
    variantId: variant.variant_id,
    productId: product.product_id,
    productName: product.name,
    brandName: product.brand_name,
    color: variant.color,
    size: variant.size,
    unitPriceVnd: variant.unit_price_vnd,
    imageUrl: image?.image_url ?? null,
    imageAlt: image?.alt_text ?? null,
    alternatives: activeVariants(product),
    discontinued: false,
  }
}

export type AddDraftResult = { draft: OutfitDraft; added: true } | { draft: OutfitDraft; added: false; reason: 'duplicate' | 'full' }

export function addDraftItem(draft: OutfitDraft, product: CatalogProduct, variant: CatalogVariant): AddDraftResult {
  if (draft.items.some(item => item.variantId === variant.variant_id)) return { draft, added: false, reason: 'duplicate' }
  if (draft.items.length >= MAX_DRAFT_ITEMS) return { draft, added: false, reason: 'full' }
  return { draft: { ...draft, items: [...draft.items, createDraftItem(product, variant)] }, added: true }
}

/** Switch a draft item to another active variant of the same product (rejects variants already in the draft). */
export function changeDraftVariant(draft: OutfitDraft, variantId: string, next: CatalogVariant): OutfitDraft {
  if (draft.items.some(item => item.variantId === next.variant_id && item.variantId !== variantId)) return draft
  return {
    ...draft,
    items: draft.items.map(item =>
      item.variantId === variantId
        ? {
            ...item,
            variantId: next.variant_id,
            color: next.color,
            size: next.size,
            unitPriceVnd: next.unit_price_vnd,
            imageUrl: next.images.find(image => image.is_primary)?.image_url ?? next.images[0]?.image_url ?? item.imageUrl,
            discontinued: false,
          }
        : item,
    ),
  }
}

export function removeDraftItem(draft: OutfitDraft, variantId: string): OutfitDraft {
  return { ...draft, items: draft.items.filter(item => item.variantId !== variantId) }
}

export function markDiscontinued(draft: OutfitDraft, activeVariantIds: ReadonlySet<string>): OutfitDraft {
  return { ...draft, items: draft.items.map(item => ({ ...item, discontinued: !activeVariantIds.has(item.variantId) })) }
}

export function draftTotal(draft: OutfitDraft): number {
  return draft.items.reduce((sum, item) => sum + item.unitPriceVnd, 0)
}

export function validateOutfitDraft(draft: OutfitDraft): OutfitDraftErrors {
  const errors: OutfitDraftErrors = {}
  const name = draft.name.trim()

  if (!name) {
    errors.name = 'Vui lòng nhập tên outfit'
  } else if (Array.from(name).length > DRAFT_NAME_MAX_LENGTH) {
    errors.name = `Tên outfit tối đa ${DRAFT_NAME_MAX_LENGTH} ký tự`
  }

  if (draft.items.length === 0) {
    errors.items = 'Vui lòng thêm ít nhất một món'
  } else if (draft.items.some(item => item.discontinued)) {
    errors.items = 'Một số món đã ngừng bán. Hãy xóa hoặc đổi phiên bản trước khi lưu.'
  }

  return errors
}
