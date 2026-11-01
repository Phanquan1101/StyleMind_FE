import { IdentityApiError, identityErrorMessage, jsonRequest, performRequest } from './identityApi'

/** wardrobe-community-service through the gateway; auth, refresh and Problem Details parsing come from identityApi. */
const OUTFITS_PATH = '/wardrobe-community/api/v1/me/outfits'

export type OutfitCreationSource = 'MANUAL' | 'AI'

export interface OutfitSummary {
  outfit_id: string
  name: string
  creation_source: OutfitCreationSource
  item_count: number
  created_at: string
  updated_at: string
}

export interface OutfitListResponse {
  items: OutfitSummary[]
  page: number
  size: number
  total_elements: number
  total_pages: number
}

/** Product fields are null when Commerce no longer returns the variant; available is then false. */
export interface OutfitItemView {
  outfit_item_id: string
  variant_id: string
  display_order: number
  product_id: string | null
  product_name: string | null
  color: string | null
  size: string | null
  unit_price_vnd: number | null
  image_url: string | null
  available: boolean
}

export interface OutfitDetailResponse {
  outfit_id: string
  name: string
  creation_source: OutfitCreationSource
  created_at: string
  updated_at: string
  items: OutfitItemView[]
}

function outfitPath(outfitId: string): string {
  return `${OUTFITS_PATH}/${encodeURIComponent(outfitId)}`
}

export const wardrobeApi = {
  listOutfits(page = 0, size = 20) {
    return performRequest<OutfitListResponse>(`${OUTFITS_PATH}?page=${page}&size=${size}`, { method: 'GET' }, true, true)
  },
  getOutfit(outfitId: string) {
    return performRequest<OutfitDetailResponse>(outfitPath(outfitId), { method: 'GET' }, true, true)
  },
  renameOutfit(outfitId: string, name: string) {
    return performRequest<OutfitSummary>(outfitPath(outfitId), jsonRequest('PATCH', { name }), true, true)
  },
  deleteOutfit(outfitId: string) {
    return performRequest<void>(outfitPath(outfitId), { method: 'DELETE' }, true, true)
  },
  removeOutfitItem(outfitId: string, outfitItemId: string) {
    return performRequest<void>(`${outfitPath(outfitId)}/items/${encodeURIComponent(outfitItemId)}`, { method: 'DELETE' }, true, true)
  },
}

const wardrobeMessages: Record<string, string> = {
  INVALID_REQUEST: 'Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.',
  RESOURCE_NOT_FOUND: 'Không tìm thấy outfit.',
  ACCESS_DENIED: 'Tài khoản của bạn không có quyền dùng Tủ đồ.',
  OUTFIT_LIMIT_REACHED: 'Bạn đã đạt số outfit tối đa.',
  OUTFIT_ITEM_LIMIT_REACHED: 'Outfit đã đủ số món tối đa.',
  OUTFIT_ITEM_DUPLICATE: 'Món này đã có trong outfit.',
  OUTFIT_ITEM_UNAVAILABLE: 'Món này đã ngừng bán. Hãy xóa món rồi thêm lại món khác.',
  OUTFIT_LAST_ITEM: 'Outfit phải còn ít nhất một món. Hãy xóa cả outfit nếu không cần nữa.',
  VARIANT_NOT_ACTIVE: 'Phiên bản sản phẩm này hiện không còn bán.',
  CATALOG_UNAVAILABLE: 'Không tải được thông tin sản phẩm lúc này. Vui lòng thử lại sau.',
}

/** Wardrobe-specific messages first, then the shared identity messages (auth, network, 5xx). */
export function wardrobeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof IdentityApiError && error.code && wardrobeMessages[error.code]) {
    return wardrobeMessages[error.code]
  }
  return identityErrorMessage(error, fallback)
}
