import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import GuestPaymentView from '@/features/checkout/components/GuestPaymentView'
import type { OrderResponse } from '@/features/payments/api/types'

it.each(['guest', 'account'] as const)('shows successful delivery for %s while COD payment is synchronizing', ownerType => {
  const order = { order_id: 'order', order_number: 'SM-DELIVERED', order_status: 'COMPLETED', payment_status: 'UNPAID', payment_method: 'COD', accepted_total_vnd: 120000, items: [] } as unknown as OrderResponse
  render(<MemoryRouter><GuestPaymentView ownerType={ownerType} orderId="order" order={order} attempt={null}
    countdownSeconds={null} expired={false} showQr={false} pending={false} busy={false} error="" imageFailed={false}
    onImageError={vi.fn()} onRecover={vi.fn()} onRefresh={vi.fn()} /></MemoryRouter>)
  expect(screen.getByText('Đã giao hàng')).toBeVisible()
  expect(screen.getByText('Đơn hàng đã giao thành công')).toBeVisible()
  expect(screen.queryByText('Máy chủ đã xác nhận thanh toán.')).not.toBeInTheDocument()
})
