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
})
