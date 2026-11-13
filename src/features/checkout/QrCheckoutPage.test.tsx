import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import QrCheckoutPage from './pages/QrCheckoutPage'
import { loadAccountDraft, saveAccountDraft } from './model/accountCheckout'
import { loadGuestDraft, saveGuestDraft } from './model/guestCheckout'

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
    <Route path="/payments/:orderId" element={<p>Đơn đã được tạo</p>} />
  </Routes></MemoryRouter>)
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); vi.resetAllMocks()
  api.getQrCheckout.mockResolvedValue(state)
  api.getQrAttempt.mockResolvedValue(attempt)
  api.cancelQrCheckout.mockResolvedValue({ ...state, status: 'CANCELLED' })
  guestApi.getQr.mockResolvedValue({ ...state, customerId: null })
  guestApi.qrAttempt.mockResolvedValue(attempt)
  guestApi.cancelQr.mockResolvedValue({ ...state, customerId: null, status: 'CANCELLED' })
})

it('hủy thanh toán và ẩn mã QR sau khi máy chủ xác nhận', async () => {
  saveAccountDraft('account', { checkoutKey: 'original-key', qrCheckoutId: id, addressId: 'address', method: 'SEPAY_VIETQR' })
  page()
  expect(await screen.findByRole('img', { name: 'Mã VietQR để thanh toán' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Hủy thanh toán' }))
  expect(await screen.findByText('Thanh toán đã được hủy.')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(api.cancelQrCheckout).toHaveBeenCalledWith(id)
  expect(loadAccountDraft('account')).toMatchObject({ addressId: 'address', method: 'SEPAY_VIETQR' })
  expect(loadAccountDraft('account').checkoutKey).not.toBe('original-key')
  expect(loadAccountDraft('account').qrCheckoutId).toBeUndefined()
})

it('VNPAY chưa thanh toán hiển thị phiên và cho hủy mà không hiện mã VietQR', async () => {
  api.getQrCheckout.mockResolvedValue({ ...state, paymentMethod: 'VNPAY' })
  api.getQrAttempt.mockResolvedValue({ ...attempt, method: 'VNPAY', qrPayload: null, transferContent: null, paymentUrl: 'https://sandbox.vnpay.test/pay' })
  api.cancelQrCheckout.mockResolvedValue({ ...state, paymentMethod: 'VNPAY', status: 'CANCELLED' })
  page()
  expect(await screen.findByRole('heading', { name: 'Thanh toán VNPAY' })).toBeInTheDocument()
  expect(screen.queryByRole('img', { name: 'Mã VietQR để thanh toán' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Hủy thanh toán' }))
  expect(await screen.findByText('Thanh toán đã được hủy.')).toBeInTheDocument()
  expect(api.cancelQrCheckout).toHaveBeenCalledWith(id)
})

it('không báo đã hủy khi máy chủ vẫn đang chờ thanh toán', async () => {
  api.cancelQrCheckout.mockResolvedValue({ ...state, status: 'AWAITING_PAYMENT' })
  page()
  await screen.findByRole('img', { name: 'Mã VietQR để thanh toán' })
  fireEvent.click(screen.getByRole('button', { name: 'Hủy thanh toán' }))
  expect(await screen.findByRole('alert')).toBeVisible()
  expect(screen.queryByText('Thanh toán đã được hủy.')).not.toBeInTheDocument()
})

it('mở phiên đã hủy không xóa phiên thanh toán mới hơn', async () => {
  saveAccountDraft('account', { checkoutKey: 'new-key', qrCheckoutId: 'new-checkout', addressId: 'address', method: 'SEPAY_VIETQR' })
  api.getQrCheckout.mockResolvedValue({ ...state, status: 'CANCELLED' })
  page()
  await screen.findByText('Thanh toán đã được hủy.')
  expect(loadAccountDraft('account').qrCheckoutId).toBe('new-checkout')
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

it('cập nhật trạng thái đối soát nếu tiền đến sau khi hủy', async () => {
  page()
  await screen.findByRole('img', { name: 'Mã VietQR để thanh toán' })
  fireEvent.click(screen.getByRole('button', { name: 'Hủy thanh toán' }))
  await screen.findByText('Thanh toán đã được hủy.')
  api.getQrCheckout.mockResolvedValue({ ...state, status: 'RECONCILIATION_REQUIRED' })
  expect(await screen.findByText('Giao dịch đang được cửa hàng đối soát.', {}, { timeout: 5000 })).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

it('chuyển sang đơn chỉ khi BE báo đã tạo đơn', async () => {
  api.getQrCheckout.mockResolvedValue({ ...state, status: 'ORDER_CREATED' })
  page()
  expect(await screen.findByText('Đơn đã được tạo')).toBeInTheDocument()
})

it.each([false, true])('preserves a newer draft when an older QR becomes an order (guest=%s)', async guest => {
  const draft = { checkoutKey: 'new-key', qrCheckoutId: 'new-checkout', method: 'SEPAY_VIETQR' as const, selection: { kind: 'buy-now' as const, variant_id: 'new-variant', quantity: 2 } }
  if (guest) saveGuestDraft({ ...loadGuestDraft(), ...draft, method: 'vietqr' })
  else saveAccountDraft('account', { ...draft, addressId: 'new-address' })
  const before = guest ? loadGuestDraft() : loadAccountDraft('account')
  api.getQrCheckout.mockResolvedValue({ ...state, status: 'ORDER_CREATED' })
  guestApi.getQr.mockResolvedValue({ ...state, customerId: null, status: 'ORDER_CREATED' })
  render(<MemoryRouter initialEntries={[`/checkout/qr/${id}`]}><Routes>
    <Route path="/checkout/qr/:checkoutId" element={<QrCheckoutPage guest={guest} />} />
    <Route path="/payments/:orderId" element={<p>Đơn đã được tạo</p>} />
    <Route path="/guest/orders/:orderId" element={<p>Đơn đã được tạo</p>} />
  </Routes></MemoryRouter>)
  expect(await screen.findByText('Đơn đã được tạo')).toBeInTheDocument()
  expect(guest ? loadGuestDraft() : loadAccountDraft('account')).toEqual(before)
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

it('hết hạn: nhắc người đã chuyển khoản liên hệ cửa hàng và hiện mã tham chiếu đã nhớ', async () => {
  localStorage.setItem(`stylemind.qr.payment.${id}`, JSON.stringify({ reference: 'SMREF123456AB', amountVnd: 199000, transferContent: 'SMREF123456AB' }))
  api.getQrCheckout.mockResolvedValue({ ...state, status: 'EXPIRED' })
  api.getQrAttempt.mockRejectedValue(Object.assign(new Error('not payable'), { code: 'CHECKOUT_NOT_PAYABLE', status: 409 }))
  page()
  expect(await screen.findByText('Mã thanh toán đã hết hạn.')).toBeInTheDocument()
  expect(screen.getByText(/Nếu bạn đã chuyển khoản/)).toBeInTheDocument()
  expect(screen.getAllByText('SMREF123456AB').length).toBeGreaterThan(0)
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Quay lại giỏ hàng' })).toBeInTheDocument()
})

it('đang chờ nhưng khoản chuyển không khớp: chuyển sang trạng thái đối soát và lưu mã tham chiếu', async () => {
  api.getQrAttempt.mockResolvedValue({ ...attempt, reference: 'SMREF999999ZZ', amountVnd: 199000, status: 'PENDING' })
  api.getQrCheckout.mockResolvedValue({ ...state, status: 'RECONCILIATION_REQUIRED' })
  page()
  expect(await screen.findByText('Giao dịch đang được cửa hàng đối soát.')).toBeInTheDocument()
  expect(await screen.findByText('SMREF999999ZZ')).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem(`stylemind.qr.payment.${id}`) ?? '{}').reference).toBe('SMREF999999ZZ')
})
