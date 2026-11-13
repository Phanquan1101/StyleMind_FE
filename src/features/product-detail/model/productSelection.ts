import type { Product, ProductImage, ProductSize, ProductVariant } from '@/entities/product/model/types'

import { LETTER_SIZES } from './sizeSuggestion'

// Letter sizes first (XS...4XL), then numeric sizes by value, then any other label ("Một cỡ", "S/M"...).
function sizeRank(size: string): number {
  const letter = LETTER_SIZES.indexOf(size.toUpperCase())
  if (letter >= 0) return letter
  return /^\d+$/.test(size) ? 1000 + Number(size) : 5000
}

export interface ProductSelectionInput {
  color?: string | null
  size?: ProductSize | null
}

export interface ProductColorOption {
  color: string
  colorHex: string
  available: boolean
}

export interface ProductSizeOption {
  size: ProductSize
  stock: number
  available: boolean
}

export interface ProductSelection {
  selectedColor: string
  selectedSize: ProductSize | null
  variant: ProductVariant | null
  displayVariant: ProductVariant | null
  images: ProductImage[]
  price: number
  stock: number
  canPurchase: boolean
  error?: string
  colorOptions: ProductColorOption[]
  sizeOptions: ProductSizeOption[]
}

function activeVariants(product: Product) {
  return product.variants.filter(variant => variant.active)
}

function uniqueColorOptions(variants: ProductVariant[]): ProductColorOption[] {
  const options = new Map<string, ProductColorOption>()

  variants.forEach(variant => {
    if (!variant.color) return
    const current = options.get(variant.color)
    options.set(variant.color, {
      color: variant.color,
      colorHex: variant.colorHex,
      available: Boolean(current?.available || (variant.active && variant.stock > 0)),
    })
  })

  return Array.from(options.values())
}

function colorImages(variants: ProductVariant[]) {
  return Array.from(
    new Map(variants.flatMap(variant => variant.images).map(image => [image.url, image])).values(),
  )
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.order - b.order)
}

function sizeOptions(variants: ProductVariant[]): ProductSizeOption[] {
  const options = new Map<ProductSize, ProductSizeOption>()

  variants.forEach(variant => {
    if (!variant.size) return
    const current = options.get(variant.size)
    options.set(variant.size, {
      size: variant.size,
      stock: Math.max(current?.stock ?? 0, variant.stock),
      available: Boolean(current?.available || variant.active),
    })
  })

  return Array.from(options.values()).sort((a, b) => sizeRank(a.size) - sizeRank(b.size))
}

function variantPrice(product: Product, variant: ProductVariant | null) {
  return variant?.priceOverride ?? product.basePrice
}

export function getProductSelection(product: Product, selection: ProductSelectionInput = {}): ProductSelection {
  const variants = activeVariants(product)
  const fallbackVariant = variants[0] ?? null
  const selectedColor = selection.color ?? fallbackVariant?.color ?? ''
  const variantsByColor = selectedColor
    ? variants.filter(variant => variant.color === selectedColor)
    : variants.filter(variant => !variant.color)
  const hasSizes = variantsByColor.some(variant => Boolean(variant.size))
  const requestedVariant = selection.size
    ? variantsByColor.find(variant => variant.size === selection.size) ?? null
    : null
  const defaultVariant = hasSizes
    ? variantsByColor[0]
    : variantsByColor.find(variant => variant.stock > 0) ?? variantsByColor[0]
  const displayVariant = requestedVariant ?? defaultVariant ?? fallbackVariant
  const images = colorImages(variantsByColor.length ? variantsByColor : variants)
  const canPurchase = Boolean(requestedVariant?.active)

  return {
    selectedColor,
    selectedSize: selection.size ?? null,
    variant: requestedVariant,
    displayVariant,
    images,
    price: variantPrice(product, displayVariant),
    stock: requestedVariant?.stock ?? displayVariant?.stock ?? 0,
    canPurchase,
    error: selection.size && !canPurchase ? 'Phiên bản này hiện chưa thể mua' : undefined,
    colorOptions: uniqueColorOptions(variants),
    sizeOptions: sizeOptions(variantsByColor),
  }
}
