import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import AccountOrdersPage from './pages/AccountOrdersPage'

const mocks = vi.hoisted(() => ({ list: vi.fn(), unpaid: vi.fn() }))
vi.mock('@/features/payments/api/paymentClient', () => ({ paymentApi: { listOrders: mocks.list, listUnpaidQrCheckouts: mocks.unpaid }, paymentErrorMessage: () => 'Không tải được đơn hàng' }))
vi.mock('@/features/auth', () => ({ useAuth: () => ({ currentUser: { id: 'user' } }) }))

it('loads real account orders and filters using server status', async () => {
  mocks.list.mockResolvedValue({ items: [{ order_id: '123', order_number: 'SM001', order_status: 'SHIPPED', accepted_total_vnd: 120000, placed_at: '2026-01-01T00:00:00Z' }], page: 0, total_pages: 1, total_elements: 1 })
  render(<MemoryRouter><AccountOrdersPage /></MemoryRouter>)
  expect(await screen.findByText('SM001')).toBeInTheDocument()
  expect(screen.getAllByText('Đang giao hàng').length).toBeGreaterThan(0)
  fireEvent.change(screen.getByLabelText('Lọc trạng thái đơn'), { target: { value: 'SHIPPED' } })
  await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith({ page: 0, size: 10, status: 'SHIPPED' }, expect.any(Object)))
})

it('lists pending and expired QR checkouts above the orders, with a way to continue paying', async () => {
  mocks.list.mockResolvedValue({ items: [], page: 0, total_pages: 0, total_elements: 0 })
  const soon = new Date(Date.now() + 5 * 60_000).toISOString()
  mocks.unpaid.mockResolvedValue({ items: [
    { checkoutId: 'aaaaaaaa-1111-4111-8111-111111111111', status: 'AWAITING_PAYMENT', totalVnd: 350000, createdAt: soon, expiresAt: soon },
    { checkoutId: 'bbbbbbbb-2222-4222-8222-222222222222', status: 'EXPIRED', totalVnd: 120000, createdAt: soon, expiresAt: '2026-01-01T00:00:00Z' },
    { checkoutId: 'cccccccc-3333-4333-8333-333333333333', status: 'CANCELLED', totalVnd: 120000, createdAt: soon, expiresAt: '2026-01-01T00:00:00Z' },
  ] })
  render(<MemoryRouter><AccountOrdersPage /></MemoryRouter>)
  expect(await screen.findByLabelText('Thanh toán đang chờ')).toBeInTheDocument()
  expect(screen.getByText('Đã hết hạn')).toBeInTheDocument()
  expect(screen.getByText('Đã hủy phiên thanh toán')).toBeVisible()
  expect(screen.getByText(/Còn 4 phút|Còn 5 phút/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Tiếp tục thanh toán' })).toHaveAttribute('href', '/checkout/qr/aaaaaaaa-1111-4111-8111-111111111111')
  expect(screen.getAllByRole('link', { name: 'Tiếp tục thanh toán' })).toHaveLength(1)
  expect(screen.queryByText('Chưa có đơn hàng phù hợp.')).not.toBeInTheDocument()
})

it('still shows the orders when the unpaid checkout list cannot be loaded', async () => {
  mocks.unpaid.mockRejectedValue(new Error('down'))
  mocks.list.mockResolvedValue({ items: [{ order_id: '9', order_number: 'SM009', order_status: 'SHIPPED', accepted_total_vnd: 1000, placed_at: null }], page: 0, total_pages: 1, total_elements: 1 })
  render(<MemoryRouter><AccountOrdersPage /></MemoryRouter>)
  expect(await screen.findByText('SM009')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Tiếp tục thanh toán' })).not.toBeInTheDocument()
})

it('shows the refund result and amount alongside delivery status', async () => {
  mocks.list.mockResolvedValue({ items: [{ order_id: 'refunded-order', order_number: 'SM-REFUND', order_status: 'COMPLETED', refund_status: 'PARTIALLY_REFUNDED', refunded_amount_vnd: 60000, accepted_total_vnd: 120000, placed_at: '2026-11-11T00:00:00Z' }], page: 0, total_pages: 1, total_elements: 1 })
  mocks.unpaid.mockResolvedValue({ items: [] })
  render(<MemoryRouter><AccountOrdersPage /></MemoryRouter>)
  expect(await screen.findByText('Đã hoàn tiền một phần')).toBeVisible()
  expect(screen.getByText('Giao hàng: Đã giao hàng')).toBeVisible()
  expect(screen.getByText(/Đã hoàn: 60\.000/)).toBeVisible()
})
