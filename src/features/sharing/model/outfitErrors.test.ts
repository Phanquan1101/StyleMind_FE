import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api/http'

import { OUTFIT_ERROR_MESSAGES, outfitErrorMessage } from './outfitErrors'

describe('outfitErrorMessage', () => {
  it('has a Vietnamese text for every outfit error code, never the English server detail', () => {
    for (const code of ['OUTFIT_LAST_ITEM', 'OUTFIT_ITEM_LIMIT_REACHED', 'OUTFIT_ITEM_DUPLICATE', 'OUTFIT_ITEM_UNAVAILABLE', 'OUTFIT_LIMIT_REACHED', 'VARIANT_NOT_ACTIVE', 'INVALID_REQUEST', 'CATALOG_UNAVAILABLE', 'RESOURCE_NOT_FOUND', 'REQUEST_TIMEOUT']) {
      expect(OUTFIT_ERROR_MESSAGES[code], code).toMatch(/[À-ỹ]/u)
      expect(outfitErrorMessage(new ApiError(409, code, 'English detail from the server'))).toBe(OUTFIT_ERROR_MESSAGES[code])
    }
  })

  it('falls back to a Vietnamese sentence for an unknown code with an English detail', () => {
    expect(outfitErrorMessage(new ApiError(500, 'SOMETHING_NEW', 'Internal error'))).toBe('Không thể cập nhật outfit. Vui lòng thử lại.')
    expect(outfitErrorMessage(new ApiError(500, 'SOMETHING_NEW', 'Internal error'), 'Không lưu được outfit.')).toBe('Không lưu được outfit.')
  })

  it('keeps Vietnamese messages written by the API client and plain Error messages', () => {
    expect(outfitErrorMessage(new ApiError(0, 'NETWORK_UNAVAILABLE', 'Không kết nối được Gateway. Kiểm tra backend đang chạy và thử lại.'))).toContain('Không kết nối được Gateway')
    expect(outfitErrorMessage(new Error('Không lưu được outfit'))).toBe('Không lưu được outfit')
    expect(outfitErrorMessage('boom')).toBe('Không thể cập nhật outfit. Vui lòng thử lại.')
  })
})
