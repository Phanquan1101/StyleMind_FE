import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDemoSeed } from '@/app/data/demoSeed'
import { AppProviders } from '@/app/providers/AppProviders'
import { appRoutes } from '@/app/router/AppRouter'
import { DEMO_STORAGE_KEY } from '@/shared/storage/demoStorage'
import { ToastProvider } from '@/shared/ui'
import { AdminNotificationsUnavailable } from '@/features/admin/components/AdminNotificationsUnavailable'

function renderCustomerNotifications() {
  const seed = createDemoSeed()
  const stored = { ...seed, session: { userId: 'usr-customer-01', persistent: true } }
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(stored))
  const router = createMemoryRouter(appRoutes, { initialEntries: ['/notifications'] })
  render(<AppProviders><RouterProvider router={router} /></AppProviders>)
  return { router, stored }
}

afterEach(() => { localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks() })

describe('Notifications with the current backend', () => {
  it('does not offer notifications: no bell in the header and a hand-typed URL shows a clean not-found page', async () => {
    renderCustomerNotifications()
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Thông báo' })).not.toBeInTheDocument()
  })

  it('shows unsupported feedback for admin notification actions', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><AdminNotificationsUnavailable /></ToastProvider>)
    expect(screen.getByText('Danh sách thông báo chưa được hỗ trợ.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Làm mới' }))
    expect(await screen.findByText('Chức năng chưa hỗ trợ.')).toBeInTheDocument()
  })

  it.each(['Tất cả', 'Đã gửi', 'Chờ gửi', 'Thất bại'])('reports unsupported admin filter %s', async label => {
    const user = userEvent.setup()
    render(<ToastProvider><AdminNotificationsUnavailable /></ToastProvider>)
    await user.click(screen.getByRole('button', { name: label }))
    expect(await screen.findByText('Chức năng chưa hỗ trợ.')).toBeInTheDocument()
  })
})
