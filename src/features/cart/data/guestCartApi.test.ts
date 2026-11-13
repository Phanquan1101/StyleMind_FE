import { describe, expect, it } from 'vitest'

import { PaymentApiError } from '@/features/payments/api/paymentApi'

import { guestCartErrorMessage } from './guestCartApi'

describe('guestCartErrorMessage', () => {
  it('explains when the quantity already in the cart reaches available stock', () => {
    const error = new PaymentApiError(409, {
      code: 'INSUFFICIENT_STOCK',
      detail: 'Requested quantity exceeds available stock',
    })

    expect(guestCartErrorMessage(error)).toBe('Số lượng sản phẩm này trong giỏ đã đạt giới hạn tồn kho.')
  })
})
