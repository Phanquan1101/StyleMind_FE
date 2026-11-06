import { vi } from 'vitest'

import type { OutfitCreationSource, OutfitItemView } from '@/shared/api/wardrobeApi'

import { lookupMockVariant } from './commerceMockBackend'

/**
 * In-memory stand-in for wardrobe-community-service (gateway prefix /wardrobe-community).
 * It wraps whatever `fetch` stub is installed first (the identity mock), so requests for other
 * services still reach it. Rules follow the real API: owner-scoped data, 403 for ADMIN, 404 for
 * unknown outfits, 409 OUTFIT_LAST_ITEM, name 1..100 characters, at most 10 items and 100 outfits.
 * Products for create/add/change come from the commerce mock, like the real service reads Commerce.
 */

const PREFIX = '/wardrobe-community/api/v1/me/outfits'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_ITEMS = 10
const MAX_OUTFITS = 100

export interface MockOutfit {
  outfit_id: string
  name: string
  creation_source: OutfitCreationSource
  created_at: string
  updated_at: string
  items: OutfitItemView[]
}

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

const outfitsByOwner = new Map<string, MockOutfit[]>()
const failures: MockFailure[] = []
const gates: Array<{ method: string; path: RegExp; promise: Promise<void> }> = []
const calls: MockCall[] = []
const unauthorizedOnce = new Set<string>()

function jsonResponse(status: number, body?: unknown, contentType = 'application/json') {
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': contentType } })
}

function problem(status: number, code: string, detail = code) {
  return jsonResponse(status, { type: 'about:blank', title: code, status, detail, code }, 'application/problem+json')
}

function tokenClaims(headers: Headers): { sub: string; roles: string[] } | null {
  const authorization = headers.get('Authorization') ?? ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))
    const bytes = Uint8Array.from(decoded, character => character.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as { sub?: unknown; roles?: unknown }
    if (typeof claims.sub !== 'string') return null
    const roles = Array.isArray(claims.roles) ? claims.roles.filter((role): role is string => typeof role === 'string') : []
    return { sub: claims.sub, roles }
  } catch {
    return null
  }
}

function summary(outfit: MockOutfit) {
  return {
    outfit_id: outfit.outfit_id,
    name: outfit.name,
    creation_source: outfit.creation_source,
    item_count: outfit.items.length,
    created_at: outfit.created_at,
    updated_at: outfit.updated_at,
  }
}

function detail(outfit: MockOutfit) {
  return { ...outfit, public_token: null }
}

function ownedOutfits(ownerId: string): MockOutfit[] {
  return outfitsByOwner.get(ownerId) ?? []
}

function parsePagination(url: URL): { page: number; size: number } | null {
  const allowed = new Set(['page', 'size'])
  for (const key of url.searchParams.keys()) if (!allowed.has(key)) return null
  const page = Number(url.searchParams.get('page') ?? '0')
  const size = Number(url.searchParams.get('size') ?? '20')
  if (!Number.isInteger(page) || !Number.isInteger(size) || page < 0 || size < 1 || size > 100) return null
  return { page, size }
}

function onlyKeys(body: Record<string, unknown> | undefined, keys: string[]): body is Record<string, unknown> {
  if (!body) return false
  const actual = Object.keys(body)
  return actual.length === keys.length && keys.every(key => actual.includes(key))
}

function isVariantId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

/** Builds an outfit item from the commerce mock; available is false for an inactive variant or product. */
function itemFromCatalog(variantId: string, displayOrder: number, outfitItemId: string): OutfitItemView | null {
  const found = lookupMockVariant(variantId)
  if (!found) return null
  const { product, variant } = found
  const image = variant.images.find(candidate => candidate.is_primary) ?? variant.images[0]
  return {
    outfit_item_id: outfitItemId,
    variant_id: variantId,
    display_order: displayOrder,
    product_id: product.product_id,
    product_name: product.name,
    color: variant.color,
    size: variant.size,
    unit_price_vnd: variant.unit_price_vnd,
    image_url: image?.image_url ?? null,
    available: product.product_status === 'ACTIVE' && variant.variant_status === 'ACTIVE',
  }
}

function purchasable(variantId: string): OutfitItemView | null {
  const item = itemFromCatalog(variantId, 0, 'unused')
  return item?.available ? item : null
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

  if (unauthorizedOnce.delete(`${method} ${path}`)) return problem(401, 'INVALID_BEARER_TOKEN')

  const gate = gates.find(candidate => candidate.method === method && candidate.path.test(path))
  if (gate) await gate.promise

  const failure = failures.find(candidate => candidate.method === method && candidate.path.test(path))
  if (failure) return problem(failure.status, failure.code)

  const claims = tokenClaims(headers)
  if (!claims) return problem(401, 'AUTHENTICATION_REQUIRED')
  if (!claims.roles.includes('CUSTOMER')) return problem(403, 'ACCESS_DENIED')

  const rest = path.slice(PREFIX.length)
  if (rest === '' && method === 'GET') {
    const pagination = parsePagination(url)
    if (!pagination) return problem(400, 'INVALID_REQUEST')
    const all = [...ownedOutfits(claims.sub)].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    const start = pagination.page * pagination.size
    return jsonResponse(200, {
      items: all.slice(start, start + pagination.size).map(summary),
      page: pagination.page,
      size: pagination.size,
      total_elements: all.length,
      total_pages: all.length === 0 ? 0 : Math.ceil(all.length / pagination.size),
    })
  }

  if (rest === '' && method === 'POST') {
    if (!onlyKeys(body, ['name', 'creation_source', 'items'])) return problem(400, 'INVALID_REQUEST')
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const items = body.items
    if (!name || Array.from(name).length > 100) return problem(400, 'INVALID_REQUEST')
    if (body.creation_source !== 'MANUAL' && body.creation_source !== 'AI') return problem(400, 'INVALID_REQUEST')
    if (!Array.isArray(items) || items.length < 1 || items.length > MAX_ITEMS) return problem(400, 'INVALID_REQUEST')
    const variantIds: string[] = []
    for (const entry of items as unknown[]) {
      const record = entry as Record<string, unknown>
      if (!onlyKeys(record, ['variant_id']) || !isVariantId(record.variant_id)) return problem(400, 'INVALID_REQUEST')
      variantIds.push(record.variant_id)
    }
    if (new Set(variantIds).size !== variantIds.length) return problem(400, 'INVALID_REQUEST')

    const owned = ownedOutfits(claims.sub)
    if (owned.length >= MAX_OUTFITS) return problem(409, 'OUTFIT_LIMIT_REACHED')
    if (variantIds.some(variantId => !purchasable(variantId))) return problem(409, 'VARIANT_NOT_ACTIVE')

    const now = new Date().toISOString()
    const created: MockOutfit = {
      outfit_id: crypto.randomUUID(),
      name,
      creation_source: body.creation_source,
      created_at: now,
      updated_at: now,
      items: variantIds.map((variantId, index) => itemFromCatalog(variantId, index, crypto.randomUUID())!),
    }
    outfitsByOwner.set(claims.sub, [...owned, created])
    return jsonResponse(201, detail(created))
  }

  const match = /^\/([^/]+)(\/items)?(?:\/([^/]+))?$/.exec(rest)
  if (!match) return problem(404, 'RESOURCE_NOT_FOUND')
  const [, outfitId, itemsSegment, itemId] = match
  if (!UUID_PATTERN.test(outfitId) || (itemId !== undefined && !UUID_PATTERN.test(itemId))) return problem(400, 'INVALID_REQUEST')
  if (itemId !== undefined && itemsSegment === undefined) return problem(404, 'RESOURCE_NOT_FOUND')

  const owned = ownedOutfits(claims.sub)
  const outfit = owned.find(candidate => candidate.outfit_id === outfitId)
  if (!outfit) return problem(404, 'RESOURCE_NOT_FOUND')

  if (itemsSegment === undefined) {
    if (method === 'GET') return jsonResponse(200, detail(outfit))
    if (method === 'DELETE') {
      outfitsByOwner.set(claims.sub, owned.filter(candidate => candidate.outfit_id !== outfitId))
      return jsonResponse(204)
    }
    if (method === 'PATCH') {
      const name = onlyKeys(body, ['name']) && typeof body.name === 'string' ? body.name.trim() : ''
      if (!name || Array.from(name).length > 100) return problem(400, 'INVALID_REQUEST')
      outfit.name = name
      outfit.updated_at = new Date().toISOString()
      return jsonResponse(200, summary(outfit))
    }
    return problem(405, 'METHOD_NOT_ALLOWED')
  }

  if (itemId === undefined) {
    if (method !== 'POST') return problem(405, 'METHOD_NOT_ALLOWED')
    if (!onlyKeys(body, ['variant_id']) || !isVariantId(body.variant_id)) return problem(400, 'INVALID_REQUEST')
    const variantId = body.variant_id
    if (outfit.items.length >= MAX_ITEMS) return problem(409, 'OUTFIT_ITEM_LIMIT_REACHED')
    if (outfit.items.some(item => item.variant_id === variantId)) return problem(409, 'OUTFIT_ITEM_DUPLICATE')
    if (!purchasable(variantId)) return problem(409, 'VARIANT_NOT_ACTIVE')
    const order = outfit.items.reduce((max, item) => Math.max(max, item.display_order), -1) + 1
    outfit.items = [...outfit.items, itemFromCatalog(variantId, order, crypto.randomUUID())!]
    outfit.updated_at = new Date().toISOString()
    return jsonResponse(201, detail(outfit))
  }

  const item = outfit.items.find(candidate => candidate.outfit_item_id === itemId)
  if (!item) return problem(404, 'RESOURCE_NOT_FOUND')

  if (method === 'DELETE') {
    if (outfit.items.length <= 1) return problem(409, 'OUTFIT_LAST_ITEM')
    outfit.items = outfit.items.filter(candidate => candidate.outfit_item_id !== itemId)
    outfit.updated_at = new Date().toISOString()
    return jsonResponse(204)
  }

  if (method === 'PATCH') {
    if (!onlyKeys(body, ['variant_id']) || !isVariantId(body.variant_id)) return problem(400, 'INVALID_REQUEST')
    const variantId = body.variant_id
    if (item.variant_id === variantId) return jsonResponse(200, detail(outfit))
    const current = lookupMockVariant(item.variant_id)
    if (!current) return problem(409, 'OUTFIT_ITEM_UNAVAILABLE')
    const next = purchasable(variantId)
    if (!next) return problem(409, 'VARIANT_NOT_ACTIVE')
    if (next.product_id !== current.product.product_id) return problem(400, 'INVALID_REQUEST')
    if (outfit.items.some(other => other.variant_id === variantId)) return problem(409, 'OUTFIT_ITEM_DUPLICATE')
    outfit.items = outfit.items.map(candidate =>
      candidate.outfit_item_id === itemId
        ? { ...next, outfit_item_id: candidate.outfit_item_id, display_order: candidate.display_order }
        : candidate,
    )
    outfit.updated_at = new Date().toISOString()
    return jsonResponse(200, detail(outfit))
  }
  return problem(405, 'METHOD_NOT_ALLOWED')
}

export function installWardrobeMockBackend() {
  const inner = globalThis.fetch
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin)
    if (!url.pathname.startsWith(PREFIX)) return inner(input, init)
    return handle(url, input, init)
  })
}

export function resetWardrobeMockBackend() {
  outfitsByOwner.clear()
  failures.length = 0
  gates.length = 0
  calls.length = 0
  unauthorizedOnce.clear()
}

/** Replaces the outfits of one account (the account id is the JWT subject, i.e. the demo user id in tests). */
export function seedWardrobeOutfits(ownerId: string, outfits: MockOutfit[]) {
  outfitsByOwner.set(ownerId, outfits.map(outfit => ({ ...outfit, items: outfit.items.map(item => ({ ...item })) })))
}

export function getWardrobeMockOutfits(ownerId: string): MockOutfit[] {
  return ownedOutfits(ownerId)
}

/** The next request for this method and path answers 401 once, to exercise the shared token refresh. */
export function expireNextWardrobeRequest(method: string, path: string) {
  unauthorizedOnce.add(`${method.toUpperCase()} ${path}`)
}

export function getWardrobeMockCalls() {
  return [...calls]
}

/** Makes every matching request answer with a Problem Details error until the next reset. */
export function failWardrobeRequest(method: string, path: RegExp, status: number, code: string) {
  failures.push({ method: method.toUpperCase(), path, status, code })
}

/** Holds matching requests until the returned function is called, to observe the "waiting" UI state. */
export function holdWardrobeRequests(method: string, path: RegExp): () => void {
  let release: () => void = () => undefined
  const promise = new Promise<void>(resolve => {
    release = resolve
  })
  gates.push({ method: method.toUpperCase(), path, promise })
  return release
}

export function mockOutfitItem(overrides: Partial<OutfitItemView> & Pick<OutfitItemView, 'outfit_item_id' | 'variant_id'>): OutfitItemView {
  return {
    display_order: 0,
    product_id: 'a0000000-0000-4000-8000-000000000001',
    product_name: 'Áo blouse cổ vuông',
    color: 'Trắng',
    size: 'M',
    unit_price_vnd: 450000,
    image_url: 'https://res.cloudinary.com/demo/image/upload/blouse.jpg',
    available: true,
    ...overrides,
  }
}
