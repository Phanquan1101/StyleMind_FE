import { beforeEach, describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'
import { checkOutfitName, isUuid, mergeOutfitPage, outfitTotal } from '@/features/wardrobe/model/backendOutfit'
import { IdentityApiError, identityErrorMessage } from '@/shared/api/identityApi'
import { wardrobeApi, wardrobeErrorMessage, type OutfitSummary } from '@/shared/api/wardrobeApi'
import { commerceImageUrl } from '@/shared/lib/commerceImageUrl'
import { mockProduct, seedCommerceCatalog } from '@/test/commerceMockBackend'
import { getIdentityMockCalls, seedIdentitySession } from '@/test/identityMockBackend'
import {
  expireNextWardrobeRequest,
  getWardrobeMockCalls,
  mockOutfitItem,
  seedWardrobeOutfits,
} from '@/test/wardrobeMockBackend'

const DEMO_STORAGE_KEY = 'stylemind.demo.database'
const OUTFIT_ID = '11111111-1111-4111-8111-111111111111'
const ITEM_ID = '21111111-1111-4111-8111-111111111111'
const OTHER_ITEM_ID = '21111111-1111-4111-8111-222222222222'

function signIn(userId: string) {
  const database = createDemoSeed()
  database.session = { userId, persistent: true }
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(database))
  seedIdentitySession(userId)
}

function seedOneOutfit() {
  seedWardrobeOutfits('usr-customer-01', [
    {
      outfit_id: OUTFIT_ID,
      name: 'Đi làm',
      creation_source: 'MANUAL',
      created_at: '2026-10-01T08:00:00Z',
      updated_at: '2026-10-02T08:00:00Z',
      items: [
        mockOutfitItem({ outfit_item_id: ITEM_ID, variant_id: '31111111-1111-4111-8111-111111111111' }),
        mockOutfitItem({ outfit_item_id: OTHER_ITEM_ID, variant_id: '31111111-1111-4111-8111-222222222222', display_order: 1 }),
      ],
    },
  ])
}

describe('Wardrobe API client', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('calls the outfit endpoints under the gateway prefix with the bearer token', async () => {
    signIn('usr-customer-01')
    seedOneOutfit()

    await wardrobeApi.listOutfits(0, 20)
    await wardrobeApi.getOutfit(OUTFIT_ID)
    await wardrobeApi.renameOutfit(OUTFIT_ID, 'Đi làm mới')
    await wardrobeApi.removeOutfitItem(OUTFIT_ID, ITEM_ID)
    await wardrobeApi.deleteOutfit(OUTFIT_ID)

    const calls = getWardrobeMockCalls()
    expect(calls.map(call => `${call.method} ${call.path}`)).toEqual([
      'GET /wardrobe-community/api/v1/me/outfits?page=0&size=20',
      `GET /wardrobe-community/api/v1/me/outfits/${OUTFIT_ID}`,
      `PATCH /wardrobe-community/api/v1/me/outfits/${OUTFIT_ID}`,
      `DELETE /wardrobe-community/api/v1/me/outfits/${OUTFIT_ID}/items/${ITEM_ID}`,
      `DELETE /wardrobe-community/api/v1/me/outfits/${OUTFIT_ID}`,
    ])
    expect(calls[2].body).toEqual({ name: 'Đi làm mới' })
    calls.forEach(call => expect(call.headers.get('Authorization')).toMatch(/^Bearer /))
  })

  it('creates an outfit and adds or changes items with the documented request bodies', async () => {
    signIn('usr-customer-01')
    const product = mockProduct({}, [{ color: 'Trắng', size: 'M' }, { color: 'Đen', size: 'M' }, { color: 'Đỏ', size: 'S' }])
    const [first, second, third] = product.variants.map(variant => variant.variant_id)
    seedCommerceCatalog({ products: [product] })

    const created = await wardrobeApi.createOutfit({ name: 'Mới', creation_source: 'MANUAL', items: [{ variant_id: first }] })
    const added = await wardrobeApi.addOutfitItem(created.outfit_id, second)
    const changed = await wardrobeApi.changeOutfitItemVariant(created.outfit_id, added.items[1].outfit_item_id, third)

    expect(changed.items.map(item => item.variant_id)).toEqual([first, third])
    const calls = getWardrobeMockCalls()
    expect(calls.map(call => `${call.method} ${call.path}`)).toEqual([
      'POST /wardrobe-community/api/v1/me/outfits',
      `POST /wardrobe-community/api/v1/me/outfits/${created.outfit_id}/items`,
      `PATCH /wardrobe-community/api/v1/me/outfits/${created.outfit_id}/items/${added.items[1].outfit_item_id}`,
    ])
    expect(calls[0].body).toEqual({ name: 'Mới', creation_source: 'MANUAL', items: [{ variant_id: first }] })
    expect(calls[1].body).toEqual({ variant_id: second })
    expect(calls[2].body).toEqual({ variant_id: third })
    calls.forEach(call => expect(call.headers.get('Authorization')).toMatch(/^Bearer /))
  })

  it('reuses the identity token refresh when the access token is rejected', async () => {
    signIn('usr-customer-01')
    seedOneOutfit()
    expireNextWardrobeRequest('GET', `/wardrobe-community/api/v1/me/outfits/${OUTFIT_ID}`)

    const detail = await wardrobeApi.getOutfit(OUTFIT_ID)

    expect(detail.outfit_id).toBe(OUTFIT_ID)
    expect(getIdentityMockCalls().filter(call => call.path === '/api/v1/auth/refresh')).toHaveLength(1)
    expect(getWardrobeMockCalls().filter(call => call.method === 'GET' && call.path.endsWith(OUTFIT_ID))).toHaveLength(2)
  })

  it('raises Problem Details errors with their status and code', async () => {
    signIn('usr-customer-01')
    seedOneOutfit()

    await expect(wardrobeApi.getOutfit('11111111-1111-4111-8111-999999999999')).rejects.toMatchObject({
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
    })
    signIn('usr-admin-01')
    await expect(wardrobeApi.listOutfits()).rejects.toMatchObject({ status: 403, code: 'ACCESS_DENIED' })
  })
})

describe('Wardrobe error messages', () => {
  it('maps wardrobe codes and falls back to the identity messages', () => {
    const wardrobeCodes = [
      'OUTFIT_LIMIT_REACHED',
      'OUTFIT_ITEM_LIMIT_REACHED',
      'OUTFIT_ITEM_DUPLICATE',
      'OUTFIT_ITEM_UNAVAILABLE',
      'OUTFIT_LAST_ITEM',
      'VARIANT_NOT_ACTIVE',
      'CATALOG_UNAVAILABLE',
    ]
    wardrobeCodes.forEach(code => {
      const message = wardrobeErrorMessage(new IdentityApiError('raw', 409, code), 'fallback')
      expect(message).not.toBe('raw')
      expect(message).not.toBe('fallback')
    })

    const identityOnly = new IdentityApiError('raw', 401, 'INVALID_BEARER_TOKEN')
    expect(wardrobeErrorMessage(identityOnly, 'fallback')).toBe(identityErrorMessage(identityOnly, 'fallback'))
    expect(wardrobeErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
    expect(wardrobeErrorMessage('not an error', 'fallback')).toBe(identityErrorMessage('not an error', 'fallback'))
  })
})

describe('Commerce image URLs', () => {
  it('keeps absolute URLs and prefixes relative paths with /commerce', () => {
    expect(commerceImageUrl('https://res.cloudinary.com/demo/image/upload/a.jpg')).toBe('https://res.cloudinary.com/demo/image/upload/a.jpg')
    expect(commerceImageUrl('http://cdn.example.test/a.jpg')).toBe('http://cdn.example.test/a.jpg')
    expect(commerceImageUrl('/api/v1/variant-images/abc/content')).toBe('/commerce/api/v1/variant-images/abc/content')
    expect(commerceImageUrl(null)).toBeNull()
    expect(commerceImageUrl('')).toBeNull()
  })
})

describe('Backend outfit helpers', () => {
  it('recognizes backend UUID ids and not demo ids', () => {
    expect(isUuid(OUTFIT_ID)).toBe(true)
    expect(isUuid('outfit-manual-1760000000000')).toBe(false)
    expect(isUuid(undefined)).toBe(false)
  })

  it('does not count discontinued items in the total', () => {
    const items = [
      mockOutfitItem({ outfit_item_id: 'a', variant_id: 'a', unit_price_vnd: 400000 }),
      mockOutfitItem({ outfit_item_id: 'b', variant_id: 'b', unit_price_vnd: 250000 }),
      mockOutfitItem({ outfit_item_id: 'c', variant_id: 'c', unit_price_vnd: 999000, available: false }),
      mockOutfitItem({ outfit_item_id: 'd', variant_id: 'd', unit_price_vnd: null, available: false }),
    ]
    expect(outfitTotal(items)).toBe(650000)
  })

  it('validates the outfit name after trimming, counting characters', () => {
    expect(checkOutfitName('   ')).toEqual({ ok: false, message: 'Vui lòng nhập tên outfit' })
    expect(checkOutfitName('  Đi làm  ')).toEqual({ ok: true, name: 'Đi làm' })
    expect(checkOutfitName('x'.repeat(100)).ok).toBe(true)
    expect(checkOutfitName('x'.repeat(101))).toEqual({ ok: false, message: 'Tên outfit tối đa 100 ký tự' })
    // 100 emoji are 100 characters (200 UTF-16 units).
    expect(checkOutfitName('😀'.repeat(100)).ok).toBe(true)
  })

  it('de-duplicates a loaded page by outfit_id and keeps the existing order', () => {
    const outfit = (id: string, name: string): OutfitSummary => ({
      outfit_id: id,
      name,
      creation_source: 'MANUAL',
      item_count: 1,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    })
    const merged = mergeOutfitPage([outfit('a', 'A'), outfit('b', 'B')], [outfit('b', 'B2'), outfit('c', 'C')])
    expect(merged.map(item => item.outfit_id)).toEqual(['a', 'b', 'c'])
    expect(merged[1].name).toBe('B2')
  })
})
