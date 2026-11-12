import { ApiError } from '@/shared/api/http'

/** Vietnamese texts for every error code the outfit endpoints (builder, detail page, list) can return. */
export const OUTFIT_ERROR_MESSAGES: Record<string, string> = {
  OUTFIT_LAST_ITEM: 'Outfit phải giữ lại ít nhất một món.',
  OUTFIT_ITEM_LIMIT_REACHED: 'Mỗi outfit tối đa 10 món.',
  OUTFIT_ITEM_DUPLICATE: 'Phiên bản này đã có trong outfit.',
  OUTFIT_ITEM_UNAVAILABLE: 'Món này không còn khả dụng. Bạn có thể xóa và thêm món khác.',
  OUTFIT_LIMIT_REACHED: 'Bạn đã đạt số outfit tối đa. Hãy xóa bớt outfit cũ rồi thử lại.',
  VARIANT_NOT_ACTIVE: 'Có món trong outfit không còn bán. Hãy đổi màu/size hoặc xóa món đó rồi lưu lại.',
  INVALID_REQUEST: 'Thông tin outfit chưa hợp lệ. Hãy kiểm tra tên outfit và các món (tối đa 10 món, không trùng phiên bản).',
  CATALOG_UNAVAILABLE: 'Danh mục sản phẩm tạm thời chưa dùng được. Vui lòng thử lại sau ít phút.',
  RESOURCE_NOT_FOUND: 'Outfit không còn tồn tại.',
  REQUEST_TIMEOUT: 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.',
}

export const OUTFIT_GENERIC_ERROR = 'Không thể cập nhật outfit. Vui lòng thử lại.'

/**
 * Message to show for a failed outfit call, never raw server English text.
 * Known codes get their own sentence; Vietnamese messages already produced by the API client are kept.
 */
export function outfitErrorMessage(error: unknown, fallback = OUTFIT_GENERIC_ERROR): string {
  if (error instanceof ApiError) {
    const known = OUTFIT_ERROR_MESSAGES[error.code]
    if (known) return known
    // The API client already writes Vietnamese texts for network/session problems; server details are English.
    return /[À-ỹ]/u.test(error.message) ? error.message : fallback
  }
  return error instanceof Error && error.message ? error.message : fallback
}
