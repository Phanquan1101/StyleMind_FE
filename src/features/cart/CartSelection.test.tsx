import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import GuestCartPage from './pages/GuestCartPage'
import { loadAccountDraft, saveAccountDraft } from '@/features/checkout/model/accountCheckout'
import { paymentApi } from '@/features/payments/api/paymentClient'

vi.mock('@/api/commerce', () => ({ commerceApi: { products: { lookupVariants: vi.fn().mockResolvedValue({ items: [{ variant_id: 'v1', available_quantity: 5 }, { variant_id: 'v2', available_quantity: 5 }] }) } } }))
vi.mock('@/features/auth', () => ({ useAuth: () => ({ currentUser: { id: 'user' } }) }))
vi.mock('@/features/cart/model/AccountCommerceProvider', () => ({ useActiveCommerce: () => ({
  cart: { items: [{ cart_item_id: 'i1', variant_id: 'v1', product_name: 'Áo', quantity: 1, line_total_vnd: 100 }, { cart_item_id: 'i2', variant_id: 'v2', product_name: 'Quần', quantity: 1, line_total_vnd: 200 }], total_vnd: 300 },
  cartLoading: false, cartError: '', busy: false, products: [], refreshCart: vi.fn(),
}) }))
vi.mock('@/app/store/DemoStoreProvider', () => ({ useDemoStore: () => ({ state: { cartLines: [] } }) }))
beforeEach(() => { localStorage.clear(); sessionStorage.clear() })
afterEach(() => vi.restoreAllMocks())

it('submits only the items the customer selected into the checkout draft', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><GuestCartPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tiến hành thanh toán' })).toBeEnabled())
  await user.click(screen.getByRole('checkbox', { name: /Chọn Quần/ }))
  await user.click(screen.getByRole('button', { name: 'Tiến hành thanh toán' }))
  expect(loadAccountDraft('user').selection).toEqual({ kind: 'selected', cart_item_ids: ['i1'] })
})

it('opens checkout again after a previous QR has expired', async () => {
  saveAccountDraft('user', {
    checkoutKey: 'old-key', addressId: 'address', method: 'SEPAY_VIETQR', qrCheckoutId: 'old-qr',
    submitted: { checkout_key: 'old-key', shipping_address_id: 'address', payment_method: 'SEPAY_VIETQR' },
  })
  vi.spyOn(paymentApi, 'getQrCheckout').mockResolvedValue({
    checkoutId: 'old-qr', customerId: 'user', totalVnd: 300, status: 'EXPIRED', expiresAt: '2026-11-11T01:08:39Z',
  })
  const user = userEvent.setup()
  render(<MemoryRouter><GuestCartPage /></MemoryRouter>)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Tiến hành thanh toán' })).toBeEnabled())
  await user.click(screen.getByRole('button', { name: 'Tiến hành thanh toán' }))
  await waitFor(() => expect(loadAccountDraft('user').submitted).toBeUndefined())
  expect(loadAccountDraft('user').selection).toEqual({ kind: 'selected', cart_item_ids: ['i1', 'i2'] })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
