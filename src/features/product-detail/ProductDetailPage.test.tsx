import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'
import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/AppRouter'
import { DEMO_STORAGE_KEY } from '@/shared/storage/demoStorage'
import { saveAccountDraft, loadAccountDraft } from '@/features/checkout/model/accountCheckout'
import { paymentApi } from '@/features/payments/api/paymentClient'

let router: ReturnType<typeof createMemoryRouter>
afterEach(() => vi.restoreAllMocks())

function renderProductDetail(productId: string) {
  const database = createDemoSeed()

  window.localStorage.clear()
  window.localStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify({ ...database, session: { userId: 'usr-customer-01', persistent: true } }),
  )

  router = createMemoryRouter(appRoutes, { initialEntries: [`/products/${productId}`] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

function currentPath() {
  return router.state.location.pathname
}

describe('ProductDetailPage', () => {
  it('requires a size before adding a product to the cart', async () => {
    const user = userEvent.setup()
    renderProductDetail('prd-blouse-01')

    await user.click(await screen.findByRole('button', { name: 'Thêm vào giỏ' }))

    expect(screen.getByText('Vui lòng chọn kích thước')).toBeInTheDocument()
  })

  it('buy now keeps the cart unchanged and navigates to checkout', async () => {
    const user = userEvent.setup()
    renderProductDetail('prd-blouse-01')

    await user.click(await screen.findByRole('button', { name: 'Kích thước M' }))
    await user.click(screen.getByRole('button', { name: 'Mua ngay' }))

    await waitFor(() => expect(currentPath()).toBe('/checkout'))
    expect(screen.getByLabelText('Giỏ hàng (0 sản phẩm)')).toBeInTheDocument()
  })

  it('lets the customer buy again after the old QR was cancelled', async () => {
    const user = userEvent.setup()
    renderProductDetail('prd-blouse-01')
    saveAccountDraft('usr-customer-01', {
      checkoutKey: 'old-key', addressId: 'address', method: 'SEPAY_VIETQR', qrCheckoutId: 'old-qr',
      submitted: { checkout_key: 'old-key', shipping_address_id: 'address', payment_method: 'SEPAY_VIETQR' },
    })
    vi.spyOn(paymentApi, 'getQrCheckout').mockResolvedValue({
      checkoutId: 'old-qr', customerId: 'usr-customer-01', totalVnd: 30000, status: 'CANCELLED', expiresAt: '2026-11-11T01:08:39Z',
    })
    await user.click(await screen.findByRole('button', { name: 'Kích thước M' }))
    await user.click(screen.getByRole('button', { name: 'Mua ngay' }))
    await waitFor(() => expect(currentPath()).toBe('/checkout'))
    expect(loadAccountDraft('usr-customer-01').submitted).toBeUndefined()
    expect(loadAccountDraft('usr-customer-01').selection?.kind).toBe('buy-now')
  })
})
