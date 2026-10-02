import type { DemoDatabase } from '@/app/store/types'
import type { Product, ProductImage, ProductVariant } from '@/entities/product/model/types'
import type { Outfit, OutfitItem } from '@/entities/outfit/model/types'

export interface OutfitItemDetail {
  item: OutfitItem
  product: Product
  variant: ProductVariant
  image: ProductImage | null
  price: number
}

export interface OutfitDetail {
  outfit: Outfit
  items: OutfitItemDetail[]
  total: number
}

function primaryVariantImage(variant: ProductVariant) {
  return variant.images.find(image => image.isPrimary) ?? variant.images[0] ?? null
}

export function selectOwnedOutfits(database: DemoDatabase, userId: string): Outfit[] {
  return [...database.outfits]
    .filter(outfit => outfit.ownerId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function selectOutfitDetail(database: DemoDatabase, outfitId: string): OutfitDetail | null {
  const outfit = database.outfits.find(item => item.id === outfitId)
  if (!outfit) return null

  const items = outfit.items
    .map(item => {
      const product = database.products.find(candidate => candidate.id === item.productId && candidate.active)
      const variant = product?.variants.find(candidate => candidate.id === item.variantId && candidate.active)
      if (!product || !variant) return null

      return {
        item,
        product,
        variant,
        image: primaryVariantImage(variant),
        price: variant.priceOverride ?? product.basePrice,
      }
    })
    .filter(Boolean) as OutfitItemDetail[]

  return {
    outfit,
    items,
    total: items.reduce((sum, item) => sum + item.price, 0),
  }
}
