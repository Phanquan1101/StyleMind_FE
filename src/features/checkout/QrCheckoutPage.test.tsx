import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import QrCheckoutPage from './pages/QrCheckoutPage'
import { loadAccountDraft, saveAccountDraft } from './model/accountCheckout'

const api = vi.hoisted(() => ({ getQrCheckout: vi.fn(), getQrAttempt: vi.fn(), cancelQrCheckout: vi.fn() }))
const guestApi = vi.hoisted(() => ({ getQr: vi.fn(), qrAttempt: vi.fn(), cancelQr: vi.fn() }))
vi.mock('@/features/auth', () => ({ useAuth: () => ({ currentUser: { id: 'account' } }) }))
vi.mock('@/features/payments/api/paymentClient', () => ({ paymentApi: api, paymentErrorMessage: () => 'Chưa xác định được kết quả' }))
vi.mock('@/features/checkout/data/guestCheckoutApi', () => ({ guestCheckoutApi: guestApi }))
vi.mock('@/features/cart/model/guestSession', () => ({ readGuestSessionKey: () => 'guest-session' }))

const id = '11111111-1111-4111-8111-111111111111'
const state = { checkoutId: id, customerId: 'account', totalVnd: 199000, status: 'PREPARING', expiresAt: '2099-01-01T00:00:00Z' }
const attempt = { qrPayload: 'https://example.test/qr.png', transferContent: 'SMTEST' }
function page() {
  return render(<MemoryRouter initialEntries={[`/checkout/qr/${id}`]}><Routes>
    <Route path="/checkout/qr/:checkoutId" element={<QrCheckoutPage />} />
    <Route path="/orders" element={<p>Danh sách đơn hàng</p>} />
  </Routes></MemoryRouter>)
}
beforeEach(() => {
  localStorage.clear(); vi.resetAllMocks()
  api.getQrCheckout.mockResolvedValue(state)
  api.getQrAttempt.mockResolvedValue(attempt)
  api.cancelQrCheckout.mockResolvedValue({ ...state, status: 'CANCELLED' })
  guestApi.getQr.mockResolvedValue({ ...state, customerId: null })
  guestApi.qrAttempt.mockResolvedValue(attempt)
  guestApi.cancelQr.mockResolvedValue({ ...state, customerId: null, status: 'CANCELLED' })
})
afterEach(() => { vi.useRealTimers() })

it('hủy thanh toán và ẩn mã QR sau khi máy chủ xác nhận', async () => {
  page()
  expect(await screen.findByRole('img', { name: 'Mã VietQR để thanh toán' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Hủy thanh toán' }))
  expect(await screen.findByText('Thanh toán đã được hủy.')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(api.cancelQrCheckout).toHaveBeenCalledWith(id)
})

it('không hiển thị lại QR khi phản hồi tạo mã về sau khi hủy', async () => {
  let finish!: (value: typeof attempt) => void
  api.getQrAttempt.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  page()
  await screen.findByRole('button', { name: 'Hủy thanh toán' })
  fireEvent.click(screen.getByRole('button', { name: 'Hủy thanh toán' }))
  await screen.findByText('Thanh toán đã được hủy.')
  finish(attempt)
  await waitFor(() => expect(screen.queryByRole('img')).not.toBeInTheDocument())
})

it('keeps a newer checkout when an old QR page observes expiry', async () => {
  saveAccountDraft('account', { checkoutKey: 'new-key', addressId: 'address', method: 'COD' })
  api.getQrCheckout.mockResolvedValue({ ...state, status: 'EXPIRED' })
  page()
  expect(await screen.findByText('Phiên thanh toán đã hết hạn.')).toBeInTheDocument()
  expect(loadAccountDraft('account').checkoutKey).toBe('new-key')
})

it.each(['EXPIRED', 'CANCELLED', 'REQUIRES_RECONCILIATION', 'RECONCILIATION_REQUIRED'])('dừng polling khi BE trả %s', async status => {
  vi.useFakeTimers()
  api.getQrCheckout.mockResolvedValue({ ...state, status })
  page()
  await act(async () => {})
  expect(screen.getByRole('status')).toBeInTheDocument()
  await act(async () => { await vi.advanceTimersByTimeAsync(9000) })
  expect(api.getQrCheckout).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

it('chuyển sang đơn chỉ khi BE báo đã tạo đơn', async () => {
  api.getQrCheckout.mockResolvedValue({ ...state, status: 'ORDER_CREATED' })
  page()
  expect(await screen.findByText('Danh sách đơn hàng')).toBeInTheDocument()
  expect(loadAccountDraft('account').orderId).toBeUndefined()
})

it('tiếp tục polling sau lỗi và chuyển sang Đơn hàng khi ORDER_CREATED', async () => {
  vi.useFakeTimers()
  api.getQrCheckout.mockResolvedValueOnce(state)
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce({ ...state, status: 'ORDER_CREATED' })
  page()
  await act(async () => {})
  expect(screen.queryByText('Danh sách đơn hàng')).not.toBeInTheDocument()
  await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
  expect(screen.getByRole('alert')).toBeInTheDocument()
  await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
  expect(screen.getByText('Danh sách đơn hàng')).toBeInTheDocument()
  await act(async () => { await vi.advanceTimersByTimeAsync(9000) })
  expect(api.getQrCheckout).toHaveBeenCalledTimes(3)
})

it('không gửi request chồng nhau và hủy request khi rời trang', async () => {
  vi.useFakeTimers()
  api.getQrCheckout.mockImplementation(() => new Promise(() => {}))
  const view = page()
  await act(async () => { await vi.advanceTimersByTimeAsync(9000) })
  expect(api.getQrCheckout).toHaveBeenCalledTimes(1)
  const signal = api.getQrCheckout.mock.calls[0][1].signal as AbortSignal
  view.unmount()
  expect(signal.aborted).toBe(true)
})

it('vẫn chờ BE khi bộ đếm hết giờ', async () => {
  vi.useFakeTimers()
  api.getQrCheckout.mockResolvedValue({ ...state, expiresAt: new Date(Date.now() + 1000).toISOString() })
  page()
  await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
  expect(screen.queryByText('Danh sách đơn hàng')).not.toBeInTheDocument()
  expect(api.getQrCheckout).toHaveBeenCalledTimes(2)
})

it('khách vãng lai hủy phiên bằng mã phiên khách', async () => {
  render(<MemoryRouter initialEntries={[`/guest/checkout/qr/${id}`]}><Routes>
    <Route path="/guest/checkout/qr/:checkoutId" element={<QrCheckoutPage guest />} />
  </Routes></MemoryRouter>)
  expect(await screen.findByRole('img', { name: 'Mã VietQR để thanh toán' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Hủy thanh toán' }))
  expect(await screen.findByText('Thanh toán đã được hủy.')).toBeInTheDocument()
  expect(guestApi.cancelQr).toHaveBeenCalledWith('guest-session', id)
  expect(api.cancelQrCheckout).not.toHaveBeenCalled()
})
