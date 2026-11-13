/** Product variant size is an API-provided label (letters, numbers, or store-specific values). */
export type ProductSize = string

export interface ProductImage {
  id: string
  url: string
  alt: string
  isPrimary: boolean
  order: number
}

export interface ProductVariant {
  id: string
  /** Real SKU and material fields returned with the Commerce variant. */
  sku?: string
  material?: string
  color: string
  colorHex: string
  size: ProductSize
  stock: number
  priceOverride?: number
  images: ProductImage[]
  active: boolean
}

export interface ProductCategory {
  id: string
  label: string
  description: string
  active: boolean
  order: number
  /** Number of products in this category (admin API only). */
  productCount?: number
}

export interface Product {
  id: string
  categoryId: string
  /** Category name when the catalog API provides it (used to group outfit items). */
  categoryName?: string
  name: string
  brand: string
  description: string
  basePrice: number
  material: string
  fit: string
  pattern: string
  styleIds: string[]
  occasionIds: string[]
  tags: string[]
  variants: ProductVariant[]
  active: boolean
  /** Admin catalog rows retain deleted products for audit, but they can no longer be edited or restored. */
  deleted?: boolean
  featured: boolean
  createdAt: string
}

export interface FashionMetadataOption {
  id: string
  label: string
  active: boolean
}

export interface FashionMetadata {
  styles: FashionMetadataOption[]
  occasions: FashionMetadataOption[]
  colors: FashionMetadataOption[]
  materials: FashionMetadataOption[]
  fits: FashionMetadataOption[]
  patterns: FashionMetadataOption[]
}

export interface CompatibilityRule {
  id: string
  sourceType: string
  targetType: string
  score: number
  note: string
  active: boolean
}
