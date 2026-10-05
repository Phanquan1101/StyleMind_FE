import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'
import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/AppRouter'
import type { DemoDatabase } from '@/app/store/types'
import { DEMO_STORAGE_KEY } from '@/shared/storage/demoStorage'

let router: ReturnType<typeof createMemoryRouter>

function persistDatabase(database: DemoDatabase) {
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(database))
}

function getDatabase() {
  const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
  if (!raw) throw new Error('Expected demo database in localStorage')
  return JSON.parse(raw) as DemoDatabase
}

function renderAt(initialEntry: string, database: DemoDatabase) {
  window.localStorage.clear()
  persistDatabase(database)
  router = createMemoryRouter(appRoutes, { initialEntries: [initialEntry] })

  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )

  return router
}

function adminDatabase(): DemoDatabase {
  return {
    ...createDemoSeed(),
    session: { userId: 'usr-admin-01', persistent: true },
  }
}

function customerDatabase(): DemoDatabase {
  return {
    ...createDemoSeed(),
    session: { userId: 'usr-customer-01', persistent: true },
  }
}

function currentPath() {
  return router.state.location.pathname
}

function currentSearch() {
  return router.state.location.search
}

describe('AdminPage', () => {
  it('renders the admin dashboard for an authenticated admin', async () => {
    renderAt('/admin', adminDatabase())

    expect(await screen.findByRole('heading', { name: 'Tổng quan quản trị' })).toBeInTheDocument()
    expect(screen.getByText('Doanh thu')).toBeInTheDocument()
    expect(screen.getByText('Yêu cầu cần duyệt')).toBeInTheDocument()
  })

  it('redirects a customer away from the admin route', async () => {
    renderAt('/admin', customerDatabase())

    await waitFor(() => expect(currentPath()).toBe('/shop'))
  })

  it('logs out from the admin shell', async () => {
    const user = userEvent.setup()
    renderAt('/admin', adminDatabase())

    await user.click(await screen.findByRole('button', { name: 'Đăng xuất' }))

    await waitFor(() => expect(currentPath()).toBe('/login'))
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument()
  })

  it('opens the products section from the sidebar query navigation', async () => {
    const user = userEvent.setup()
    renderAt('/admin', adminDatabase())

    await user.click(await screen.findByRole('link', { name: 'Sản phẩm' }))

    await waitFor(() => expect(currentSearch()).toBe('?section=products'))
    expect(await screen.findByRole('heading', { name: 'Quản lý sản phẩm' })).toBeInTheDocument()
  })

  it('filters products and toggles a product inactive', async () => {
    const user = userEvent.setup()
    renderAt('/admin?section=products', adminDatabase())

    await user.type(await screen.findByLabelText('Tìm sản phẩm'), 'blouse')
    expect(screen.getByText('prd-blouse-01')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Tắt sản phẩm prd-blouse-01' }))

    await waitFor(() => {
      const product = getDatabase().products.find(item => item.id === 'prd-blouse-01')
      expect(product?.active).toBe(false)
    })
  })

  it('creates a product with a color image URL', async () => {
    const user = userEvent.setup()
    renderAt('/admin?section=products', adminDatabase())

    await user.click(await screen.findByRole('button', { name: 'Thêm sản phẩm' }))
    await user.type(screen.getByLabelText('ID sản phẩm'), 'prd-admin-test')
    await user.type(screen.getByLabelText('Tên sản phẩm'), 'Áo linen test')
    await user.type(screen.getByLabelText('Thương hiệu'), 'Studio Test')
    await user.selectOptions(screen.getByLabelText('Danh mục'), 'tops')
    await user.type(screen.getByLabelText('Giá cơ bản'), '580000')
    await user.type(screen.getByLabelText('Mô tả'), 'Sản phẩm demo cho admin')
    await user.type(screen.getByLabelText('Chất liệu'), 'Linen')
    await user.type(screen.getByLabelText('Phom dáng'), 'Dáng vừa')
    await user.type(screen.getByLabelText('Họa tiết'), 'Trơn')
    await user.type(screen.getByLabelText('Màu'), 'Trắng')
    await user.type(screen.getByLabelText('Mã màu'), '#FFFFFF')
    await user.selectOptions(screen.getByLabelText('Size'), 'M')
    await user.type(screen.getByLabelText('URL ảnh'), 'https://images.unsplash.com/photo-test?w=900')
    await user.click(screen.getByRole('button', { name: 'Lưu sản phẩm' }))

    expect(await screen.findByText('prd-admin-test')).toBeInTheDocument()
    await waitFor(() => {
      const product = getDatabase().products.find(item => item.id === 'prd-admin-test')
      expect(product?.variants[0]?.images[0]).toMatchObject({
        url: 'https://images.unsplash.com/photo-test?w=900',
        isPrimary: true,
      })
    })
  })

  it('toggles a variant active state', async () => {
    const user = userEvent.setup()
    renderAt('/admin?section=products', adminDatabase())

    await user.click(await screen.findByRole('button', { name: 'Tắt biến thể var-blouse-white-m' }))

    await waitFor(() => {
      const variant = getDatabase().products
        .find(item => item.id === 'prd-blouse-01')
        ?.variants.find(item => item.id === 'var-blouse-white-m')
      expect(variant?.active).toBe(false)
    })
  })

  it('creates and deactivates a clothing category', async () => {
    const user = userEvent.setup()
    renderAt('/admin?section=categories', adminDatabase())

    await user.click(await screen.findByRole('button', { name: 'Thêm danh mục' }))
    await user.type(screen.getByLabelText('ID danh mục'), 'ao-dai')
    await user.type(screen.getByLabelText('Tên danh mục'), 'Áo dài')
    await user.type(screen.getByLabelText('Mô tả danh mục'), 'Trang phục áo dài nữ')
    await user.type(screen.getByLabelText('Thứ tự hiển thị'), '8')
    await user.click(screen.getByRole('button', { name: 'Lưu danh mục' }))

    expect(await screen.findByText('Áo dài')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tắt danh mục ao-dai' }))

    await waitFor(() => {
      const category = getDatabase().categories.find(item => item.id === 'ao-dai')
      expect(category).toMatchObject({ label: 'Áo dài', active: false })
    })
  })
})
