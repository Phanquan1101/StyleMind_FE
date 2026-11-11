import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import AccountOrdersPage from './pages/AccountOrdersPage'

const mocks = vi.hoisted(() => ({ list: vi.fn(), pendingQr: vi.fn() }))
vi.mock('@/features/payments/api/paymentClient', () => ({ paymentApi: { listOrders: mocks.list, listPendingQrCheckouts: mocks.pendingQr }, paymentErrorMessage: () => 'Không kết nối được máy chủ' }))
vi.mock('@/features/auth', () => ({ useAuth: () => ({ currentUser: { id: 'user' } }) }))

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  mocks.list.mockResolvedValue({ items: [], page: 0, total_pages: 0, total_elements: 0 })
  mocks.pendingQr.mockResolvedValue({ items: [], page: 0, size: 10, total_pages: 0, total_elements: 0 })
})

it('shows refund results separately from completed delivery for partial returns', async () => {
  mocks.list.mockResolvedValue({ items: [{ order_id: '123', order_number: 'SM001', order_status: 'COMPLETED', refund_status: 'PARTIALLY_REFUNDED', refunded_amount_vnd: 60000, accepted_total_vnd: 120000 }], total_pages: 1, total_elements: 1 })
  render(<MemoryRouter><AccountOrdersPage /></MemoryRouter>)
  expect(await screen.findByText(/Đã hoàn tiền một phần/)).toBeVisible()
  expect(screen.getByText(/Đã hoàn: 60.000/)).toBeVisible()
})

it('loads real account orders and filters using server status', async () => {
  mocks.list.mockResolvedValue({ items: [{ order_id: '123', order_number: 'SM001', order_status: 'SHIPPED', accepted_total_vnd: 120000, placed_at: '2026-01-01T00:00:00Z' }], page: 0, total_pages: 1, total_elements: 1 })
  render(<MemoryRouter><AccountOrdersPage /></MemoryRouter>)
  expect(await screen.findByText('SM001')).toBeInTheDocument()
  expect(screen.getAllByText('Đang giao hàng').length).toBeGreaterThan(0)
  fireEvent.change(screen.getByLabelText('Lọc trạng thái đơn'), { target: { value: 'SHIPPED' } })
  await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith({ page: 0, size: 10, status: 'SHIPPED' }, expect.any(Object)))
})

const pendingQr = {
  checkoutId: '11111111-1111-4111-8111-111111111111', status: 'AWAITING_PAYMENT',
  totalVnd: 30000, createdAt: '2026-11-11T01:00:00Z', expiresAt: '2026-11-11T01:15:00Z',
}

it('shows server-side QR sessions under pending payments without an order or local draft', async () => {
  mocks.pendingQr.mockResolvedValue({ items: [pendingQr], page: 0, size: 10, total_pages: 1, total_elements: 1 })
  render(<MemoryRouter><AccountOrdersPage /></MemoryRouter>)
  const session = await screen.findByRole('link', { name: /Phiên QR-11111111/ })
  expect(session).toHaveAttribute('href', '/checkout/qr/' + pendingQr.checkoutId)
  expect(session).toHaveTextContent('30.000')
  expect(session).toHaveTextContent('Tiếp tục thanh toán')
  fireEvent.change(screen.getByLabelText('Lọc trạng thái đơn'), { target: { value: 'PENDING_PAYMENT' } })
  expect(await screen.findByRole('link', { name: /Phiên QR-11111111/ })).toBeVisible()
  expect(screen.queryByText('Chưa có đơn hàng phù hợp.')).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Lọc trạng thái đơn'), { target: { value: 'CANCELLED' } })
  await waitFor(() => expect(screen.queryByRole('link', { name: /Phiên QR-/ })).not.toBeInTheDocument())
})

it('pages QR sessions independently and removes them when the server reports no pending checkout', async () => {
  mocks.pendingQr.mockResolvedValueOnce({ items: [pendingQr], page: 0, size: 10, total_pages: 2, total_elements: 11 })
    .mockResolvedValueOnce({ items: [{ ...pendingQr, checkoutId: '22222222-2222-4222-8222-222222222222' }], page: 1, size: 10, total_pages: 2, total_elements: 11 })
    .mockResolvedValue({ items: [], page: 1, size: 10, total_pages: 0, total_elements: 0 })
  render(<MemoryRouter><AccountOrdersPage /></MemoryRouter>)
  await screen.findByRole('link', { name: /Phiên QR-11111111/ })
  fireEvent.click(screen.getByRole('button', { name: 'Phiên sau' }))
  await screen.findByRole('link', { name: /Phiên QR-22222222/ })
  expect(mocks.pendingQr).toHaveBeenLastCalledWith({ page: 1, size: 10 }, expect.any(Object))
  fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
  expect(await screen.findByText('Chưa có đơn hàng phù hợp.')).toBeVisible()
  expect(screen.queryByRole('link', { name: /Phiên QR-/ })).not.toBeInTheDocument()
})

it('reports a pending-session API error while keeping the loaded orders visible', async () => {
  mocks.list.mockResolvedValue({ items: [{ order_id: 'order', order_number: 'SM001', order_status: 'PLACED', accepted_total_vnd: 100000 }], total_pages: 1, total_elements: 1 })
  mocks.pendingQr.mockRejectedValue(new Error('Unavailable'))
  render(<MemoryRouter><AccountOrdersPage /></MemoryRouter>)
  expect(await screen.findByText('SM001')).toBeVisible()
  expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được phiên VietQR chờ thanh toán.')
  expect(screen.queryByText('Chưa có đơn hàng phù hợp.')).not.toBeInTheDocument()
})
