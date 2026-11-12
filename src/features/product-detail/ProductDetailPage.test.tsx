import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'
import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/AppRouter'
import { DEMO_STORAGE_KEY } from '@/shared/storage/demoStorage'

let router: ReturnType<typeof createMemoryRouter>

function renderProductDetail(productId: string, body: { heightCm?: number; weightKg?: number; usualTopSize?: string } = {}) {
  const database = createDemoSeed()
  // The demo customer has height/weight; tests control it explicitly because it drives the size suggestion.
  database.users = database.users.map(user => (user.id === 'usr-customer-01' ? { ...user, heightCm: undefined, weightKg: undefined, ...body } : user))

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

  it('pre-selects the size saved in the profile and says why', async () => {
    renderProductDetail('prd-blouse-01', { usualTopSize: 'M' })

    expect(await screen.findByText('Gợi ý cho bạn: M (theo hồ sơ)')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kích thước M' })).toHaveAttribute('aria-pressed', 'true'))
  })

  it('estimates from height/weight when the profile has no size and keeps the choice the customer makes', async () => {
    const user = userEvent.setup()
    renderProductDetail('prd-blouse-01', { heightCm: 165, weightKg: 58 })

    expect(await screen.findByText(/ước lượng từ chiều cao\/cân nặng.*chỉ mang tính tham khảo/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kích thước M' })).toHaveAttribute('aria-pressed', 'true'))
    await user.click(screen.getByRole('button', { name: 'Kích thước L' }))
    expect(screen.getByRole('button', { name: 'Kích thước L' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows selected variant stock and keeps the description in the lower details section', async () => {
    const user = userEvent.setup()
    renderProductDetail('prd-blouse-01')

    await user.click(await screen.findByRole('button', { name: 'Kích thước M' }))
    expect(screen.getByText(/^Còn \d+ sản phẩm$/)).toBeInTheDocument()
    expect(screen.queryByText(/Thêm chiều cao, cân nặng/)).not.toBeInTheDocument()
    for (const removedLabel of ['Phom dáng', 'Họa tiết', 'Phong cách', 'Dịp sử dụng']) {
      expect(screen.queryByText(removedLabel)).not.toBeInTheDocument()
    }

    const material = screen.getByText('Chất liệu')
    const descriptionHeading = screen.getByRole('heading', { name: 'Mô tả sản phẩm' })
    expect(material.compareDocumentPosition(descriptionHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('buy now keeps the cart unchanged and navigates to checkout', async () => {
    const user = userEvent.setup()
    renderProductDetail('prd-blouse-01')

    await user.click(await screen.findByRole('button', { name: 'Kích thước M' }))
    await user.click(screen.getByRole('button', { name: 'Mua ngay' }))

    await waitFor(() => expect(currentPath()).toBe('/checkout'))
    expect(screen.getByLabelText('Giỏ hàng (0 sản phẩm)')).toBeInTheDocument()
  })
})
