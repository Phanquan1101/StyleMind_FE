import { jsonRequest, performRequest } from './identityApi'

/**
 * Read-only access to the public Commerce catalog through the gateway (/commerce/**).
 * These endpoints need no login, so requests are sent without the bearer token.
 * Types follow the Commerce DTOs (ProductResponse, VariantResponse, VariantImageResponse, category).
 */
const CATALOG_PATH = '/commerce/api/v1'

export interface CatalogImage {
  image_id: string
  variant_id: string
  image_url: string
  alt_text: string | null
  display_order: number
  is_primary: boolean
}

export interface CatalogVariant {
  variant_id: string
  product_id: string
  sku: string
  size: string | null
  color: string | null
  material: string | null
  unit_price_vnd: number
  variant_status: string
  available_quantity: number
  images: CatalogImage[]
}

export interface CatalogProduct {
  product_id: string
  category_id: string
  brand_id: string
  category_name: string | null
  brand_name: string | null
  name: string
  description: string | null
  demographic_segment: string | null
  product_status: string
  variants: CatalogVariant[]
}

export interface CatalogProductPage {
  items: CatalogProduct[]
  page: number
  size: number
  total_elements: number
  total_pages: number
}

export interface CatalogCategory {
  id: string
  name: string
  slug: string
  is_active: boolean
}

export interface ProductSearchParams {
  keyword?: string
  categoryId?: string
  page?: number
  size?: number
  signal?: AbortSignal
}

export const commerceCatalogApi = {
  searchProducts({ keyword, categoryId, page = 0, size = 12, signal }: ProductSearchParams = {}) {
    const query = new URLSearchParams()
    if (keyword) query.set('keyword', keyword)
    if (categoryId) query.set('category_id', categoryId)
    query.set('page', String(page))
    query.set('size', String(size))
    return performRequest<CatalogProductPage>(`${CATALOG_PATH}/products?${query.toString()}`, { method: 'GET', signal }, false, false)
  },
  getProduct(productId: string, signal?: AbortSignal) {
    return performRequest<CatalogProduct>(`${CATALOG_PATH}/products/${encodeURIComponent(productId)}`, { method: 'GET', signal }, false, false)
  },
  async listCategories(signal?: AbortSignal) {
    const response = await performRequest<{ items: CatalogCategory[] }>(`${CATALOG_PATH}/categories`, { method: 'GET', signal }, false, false)
    return response.items
  },
  /** Returns only the variants that are still ACTIVE; ids missing from the answer are no longer on sale. */
  async lookupVariants(variantIds: string[], signal?: AbortSignal) {
    const response = await performRequest<{ items: CatalogVariant[] }>(
      `${CATALOG_PATH}/variants/batch-lookup`,
      { ...jsonRequest('POST', { variant_ids: variantIds }), signal },
      false,
      false,
    )
    return response.items
  },
}

export function activeVariants(product: CatalogProduct): CatalogVariant[] {
  return product.variants.filter(variant => variant.variant_status === 'ACTIVE')
}

export function lowestPrice(variants: CatalogVariant[]): number | null {
  return variants.length === 0 ? null : Math.min(...variants.map(variant => variant.unit_price_vnd))
}

/** The primary image of the preferred variant, else any image of the product, else null (show a placeholder). */
export function productImage(product: CatalogProduct, preferred?: CatalogVariant): CatalogImage | null {
  const candidates = preferred ? [preferred, ...product.variants] : product.variants
  for (const variant of candidates) {
    const image = variant.images.find(item => item.is_primary) ?? variant.images[0]
    if (image) return image
  }
  return null
}
