import { vi } from 'vitest'

import type { CatalogCategory, CatalogImage, CatalogProduct, CatalogVariant } from '@/shared/api/commerceCatalogApi'

/**
 * In-memory stand-in for the public Commerce catalog (gateway prefix /commerce). It wraps the
 * `fetch` stub installed before it, so identity and wardrobe requests still reach their mocks.
 * Rules follow the real API: only ACTIVE products and variants are returned, no login is needed,
 * unknown query parameters are rejected, keyword is at most 120 characters, size is 1..100.
 */

const PREFIX = '/commerce/api/v1'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface MockCall {
  method: string
  path: string
  headers: Headers
  body: Record<string, unknown> | undefined
}

interface MockFailure {
  method: string
  path: RegExp
  status: number
  code: string
}

let products: CatalogProduct[] = []
let categories: CatalogCategory[] = []
// Requests only reach this mock after a test configured it; otherwise they pass through to the previous fetch.
let armed = false
const failures: MockFailure[] = []
const gates: Array<{ method: string; path: RegExp; promise: Promise<void> }> = []
const calls: MockCall[] = []

function jsonResponse(status: number, body?: unknown, contentType = 'application/json') {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': contentType } })
}

function problem(status: number, code: string, detail = code) {
  return jsonResponse(status, { type: 'about:blank', title: code, status, detail, code }, 'application/problem+json')
}

function activeVariantsOf(product: CatalogProduct): CatalogVariant[] {
  return product.variants.filter(variant => variant.variant_status === 'ACTIVE')
}

function publicProduct(product: CatalogProduct): CatalogProduct {
  return { ...product, variants: activeVariantsOf(product) }
}

function isListed(product: CatalogProduct): boolean {
  return product.product_status === 'ACTIVE' && activeVariantsOf(product).length > 0
}

async function handle(url: URL, input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  const method = (init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined))
  let body: Record<string, unknown> | undefined
  if (typeof init.body === 'string') {
    try {
      body = JSON.parse(init.body) as Record<string, unknown>
    } catch {
      body = undefined
    }
  }
  const path = url.pathname
  calls.push({ method, path: `${path}${url.search}`, headers, body })

  const target = `${path}${url.search}`
  const gate = gates.find(candidate => candidate.method === method && candidate.path.test(target))
  if (gate) await gate.promise
  if (init.signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError')

  const failure = failures.find(candidate => candidate.method === method && candidate.path.test(target))
  if (failure) return problem(failure.status, failure.code)

  const rest = path.slice(PREFIX.length)

  if (rest === '/categories' && method === 'GET') {
    return jsonResponse(200, { items: categories.filter(category => category.is_active) })
  }

  if (rest === '/products' && method === 'GET') {
    const allowed = new Set(['keyword', 'category_id', 'min_price_vnd', 'max_price_vnd', 'demographic_segment', 'page', 'size'])
    for (const key of url.searchParams.keys()) if (!allowed.has(key)) return problem(400, 'INVALID_REQUEST')
    const keyword = (url.searchParams.get('keyword') ?? '').trim().toLowerCase()
    const categoryId = url.searchParams.get('category_id')
    const page = Number(url.searchParams.get('page') ?? '0')
    const size = Number(url.searchParams.get('size') ?? '20')
    if (keyword.length > 120 || (categoryId && !UUID_PATTERN.test(categoryId))) return problem(400, 'INVALID_REQUEST')
    if (!Number.isInteger(page) || !Number.isInteger(size) || page < 0 || size < 1 || size > 100) return problem(400, 'INVALID_REQUEST')

    const matches = products.filter(
      product =>
        isListed(product) &&
        (!keyword || product.name.toLowerCase().includes(keyword) || (product.description ?? '').toLowerCase().includes(keyword)) &&
        (!categoryId || product.category_id === categoryId),
    )
    return jsonResponse(200, {
      items: matches.slice(page * size, page * size + size).map(publicProduct),
      page,
      size,
      total_elements: matches.length,
      total_pages: matches.length === 0 ? 0 : Math.ceil(matches.length / size),
    })
  }

  const detail = /^\/products\/([^/]+)$/.exec(rest)
  if (detail && method === 'GET') {
    if (!UUID_PATTERN.test(detail[1])) return problem(400, 'INVALID_REQUEST')
    const product = products.find(candidate => candidate.product_id === detail[1])
    if (!product || !isListed(product)) return problem(404, 'RESOURCE_NOT_FOUND')
    return jsonResponse(200, publicProduct(product))
  }

  if (rest === '/variants/batch-lookup' && method === 'POST') {
    const ids = body?.variant_ids
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 || !ids.every(id => typeof id === 'string' && UUID_PATTERN.test(id))) {
      return problem(400, 'INVALID_REQUEST')
    }
    const wanted = new Set(ids as string[])
    const items = products
      .filter(product => product.product_status === 'ACTIVE')
      .flatMap(activeVariantsOf)
      .filter(variant => wanted.has(variant.variant_id))
    return jsonResponse(200, { items })
  }

  return problem(404, 'RESOURCE_NOT_FOUND')
}

export function installCommerceMockBackend() {
  const inner = globalThis.fetch
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin)
    if (!armed || !url.pathname.startsWith(`${PREFIX}/`)) return inner(input, init)
    return handle(url, input, init)
  })
}

export function resetCommerceMockBackend() {
  armed = false
  products = []
  categories = []
  failures.length = 0
  gates.length = 0
  calls.length = 0
}

export function seedCommerceCatalog(catalog: { products: CatalogProduct[]; categories?: CatalogCategory[] }) {
  armed = true
  products = catalog.products.map(product => ({ ...product, variants: product.variants.map(variant => ({ ...variant })) }))
  categories = catalog.categories ? [...catalog.categories] : []
}

/** Finds a variant (active or not) with its product, so the wardrobe mock can build outfit items from it. */
export function lookupMockVariant(variantId: string): { product: CatalogProduct; variant: CatalogVariant } | null {
  for (const product of products) {
    const variant = product.variants.find(candidate => candidate.variant_id === variantId)
    if (variant) return { product, variant }
  }
  return null
}

export function deactivateMockVariant(variantId: string) {
  const found = lookupMockVariant(variantId)
  if (found) found.variant.variant_status = 'INACTIVE'
}

export function getCommerceMockCalls() {
  return [...calls]
}

/** Makes matching requests (tested against "path?query") answer with a Problem Details error until the next reset. */
export function failCommerceRequest(method: string, path: RegExp, status: number, code: string) {
  armed = true
  failures.push({ method: method.toUpperCase(), path, status, code })
}

/** Holds matching requests until the returned function is called, to observe debounce, abort and waiting states. */
export function holdCommerceRequests(method: string, path: RegExp): () => void {
  armed = true
  let release: () => void = () => undefined
  const promise = new Promise<void>(resolve => {
    release = resolve
  })
  gates.push({ method: method.toUpperCase(), path, promise })
  return release
}

let sequence = 0
const nextId = () => `c0000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`

export function mockImage(overrides: Partial<CatalogImage> = {}): CatalogImage {
  return {
    image_id: nextId(),
    variant_id: nextId(),
    image_url: 'https://res.cloudinary.com/demo/image/upload/product.jpg',
    alt_text: 'Ảnh sản phẩm',
    display_order: 0,
    is_primary: true,
    ...overrides,
  }
}

export function mockVariant(overrides: Partial<CatalogVariant> = {}): CatalogVariant {
  const id = overrides.variant_id ?? nextId()
  return {
    variant_id: id,
    product_id: nextId(),
    sku: `SKU-${id.slice(-6)}`,
    size: 'M',
    color: 'Trắng',
    material: null,
    unit_price_vnd: 450000,
    variant_status: 'ACTIVE',
    available_quantity: 5,
    images: [mockImage({ variant_id: id })],
    ...overrides,
  }
}

/** Builds a product whose variants point back to it; pass variants without product_id and it is filled in. */
export function mockProduct(overrides: Partial<CatalogProduct> = {}, variants: Array<Partial<CatalogVariant>> = [{}]): CatalogProduct {
  const productId = overrides.product_id ?? nextId()
  return {
    product_id: productId,
    category_id: nextId(),
    brand_id: nextId(),
    category_name: 'Áo',
    brand_name: 'StyleMind Select',
    name: 'Áo blouse cổ vuông',
    description: null,
    demographic_segment: 'WOMEN',
    product_status: 'ACTIVE',
    variants: variants.map(variant => mockVariant({ ...variant, product_id: productId })),
    ...overrides,
  }
}
