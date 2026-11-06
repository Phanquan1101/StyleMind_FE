import { beforeEach, describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'
import { activeVariants, commerceCatalogApi, lowestPrice, productImage } from '@/shared/api/commerceCatalogApi'
import { getIdentityMockCalls, seedIdentitySession } from '@/test/identityMockBackend'
import {
  deactivateMockVariant,
  failCommerceRequest,
  getCommerceMockCalls,
  mockImage,
  mockProduct,
  mockVariant,
  seedCommerceCatalog,
} from '@/test/commerceMockBackend'

const DEMO_STORAGE_KEY = 'stylemind.demo.database'

function signIn() {
  const database = createDemoSeed()
  database.session = { userId: 'usr-customer-01', persistent: true }
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(database))
  seedIdentitySession('usr-customer-01')
}

describe('Commerce catalog client', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('calls the public catalog endpoints under /commerce without an Authorization header', async () => {
    signIn()
    const product = mockProduct({ name: 'Áo sơ mi' }, [{ color: 'Trắng', size: 'M' }])
    seedCommerceCatalog({ products: [product], categories: [{ id: product.category_id, name: 'Áo', slug: 'ao', is_active: true }] })

    await commerceCatalogApi.searchProducts({ keyword: 'sơ mi', categoryId: product.category_id })
    await commerceCatalogApi.searchProducts()
    await commerceCatalogApi.getProduct(product.product_id)
    await commerceCatalogApi.listCategories()
    await commerceCatalogApi.lookupVariants([product.variants[0].variant_id])

    const calls = getCommerceMockCalls()
    expect(calls.map(call => `${call.method} ${call.path}`)).toEqual([
      `GET /commerce/api/v1/products?keyword=s%C6%A1+mi&category_id=${product.category_id}&page=0&size=12`,
      'GET /commerce/api/v1/products?page=0&size=12',
      `GET /commerce/api/v1/products/${product.product_id}`,
      'GET /commerce/api/v1/categories',
      'POST /commerce/api/v1/variants/batch-lookup',
    ])
    expect(calls[4].body).toEqual({ variant_ids: [product.variants[0].variant_id] })
    calls.forEach(call => expect(call.headers.get('Authorization')).toBeNull())
    expect(getIdentityMockCalls().filter(call => call.path.includes('refresh'))).toHaveLength(0)
  })

  it('returns only active variants from search, detail and lookup', async () => {
    const product = mockProduct({}, [{ color: 'Trắng' }, { color: 'Đen' }])
    seedCommerceCatalog({ products: [product] })
    deactivateMockVariant(product.variants[1].variant_id)

    const page = await commerceCatalogApi.searchProducts()
    expect(page.items[0].variants.map(variant => variant.color)).toEqual(['Trắng'])
    expect((await commerceCatalogApi.getProduct(product.product_id)).variants).toHaveLength(1)
    const found = await commerceCatalogApi.lookupVariants(product.variants.map(variant => variant.variant_id))
    expect(found.map(variant => variant.variant_id)).toEqual([product.variants[0].variant_id])
  })

  it('maps Problem Details errors to status and code', async () => {
    seedCommerceCatalog({ products: [] })

    await expect(commerceCatalogApi.getProduct('c0000000-0000-4000-8000-0000000000ff')).rejects.toMatchObject({ status: 404, code: 'RESOURCE_NOT_FOUND' })
    await expect(commerceCatalogApi.searchProducts({ size: 101 })).rejects.toMatchObject({ status: 400, code: 'INVALID_REQUEST' })
    failCommerceRequest('GET', /\/categories/, 503, 'SERVICE_UNAVAILABLE')
    await expect(commerceCatalogApi.listCategories()).rejects.toMatchObject({ status: 503 })
  })

  it('passes the abort signal to fetch so a replaced search can be cancelled', async () => {
    seedCommerceCatalog({ products: [mockProduct()] })
    const controller = new AbortController()
    controller.abort()

    await expect(commerceCatalogApi.searchProducts({ signal: controller.signal })).rejects.toBeDefined()
  })
})

describe('Commerce catalog helpers', () => {
  it('keeps active variants and finds the lowest price', () => {
    const product = mockProduct({}, [{ unit_price_vnd: 500000 }, { unit_price_vnd: 300000 }, { unit_price_vnd: 100000, variant_status: 'INACTIVE' }])
    const active = activeVariants(product)
    expect(active).toHaveLength(2)
    expect(lowestPrice(active)).toBe(300000)
    expect(lowestPrice([])).toBeNull()
  })

  it('prefers the primary image of the preferred variant, then any image, then null', () => {
    const own = mockVariant({ images: [mockImage({ image_url: 'https://cdn.test/own.jpg', is_primary: false }), mockImage({ image_url: 'https://cdn.test/primary.jpg' })] })
    const other = mockVariant({ images: [mockImage({ image_url: 'https://cdn.test/other.jpg' })] })
    const bare = mockVariant({ images: [] })

    expect(productImage(mockProduct({ variants: [bare, other] }), own)?.image_url).toBe('https://cdn.test/primary.jpg')
    expect(productImage(mockProduct({ variants: [bare, other] }), bare)?.image_url).toBe('https://cdn.test/other.jpg')
    expect(productImage(mockProduct({ variants: [bare] }), bare)).toBeNull()
  })
})
