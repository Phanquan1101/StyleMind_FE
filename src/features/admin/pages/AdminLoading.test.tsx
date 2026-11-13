import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { createDemoSeed } from '@/app/data/demoSeed'
import { ToastProvider } from '@/shared/ui'
import { AdminPage } from './AdminPage'

const mocks = vi.hoisted(() => ({ products: vi.fn(), categories: vi.fn(), orders: vi.fn(), dashboard: vi.fn(), dispatch: vi.fn() }))
vi.mock('@/api/commerce', () => ({ commerceApi: { categories: { listAdmin: mocks.categories }, orders: { listAdmin: mocks.orders }, products: { listAdmin: mocks.products }, dashboard: { get: mocks.dashboard } } }))
vi.mock('@/features/auth', () => ({ useAuth: () => ({ currentUser: { id: 'admin', role: 'admin', fullName: 'Admin', email: 'admin@example.test' }, logout: vi.fn() }) }))
vi.mock('@/app/store/DemoStoreProvider', () => ({ useDemoStore: () => ({ state: { ...createDemoSeed(), products: [], categories: [] }, dispatch: mocks.dispatch }) }))

it('offers retry and avoids showing an empty product list when loading fails', async () => {
  mocks.products.mockReset()
    .mockRejectedValueOnce(new Error('Không tải được dữ liệu'))
    .mockResolvedValue({ items: [], page: 0, size: 20, total_elements: 0, total_pages: 0 })
  mocks.categories.mockResolvedValue({ items: [] })
  render(<MemoryRouter initialEntries={['/admin?section=products']}><ToastProvider><AdminPage /></ToastProvider></MemoryRouter>)
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được dữ liệu')
  expect(screen.queryByText('Không có sản phẩm phù hợp.')).not.toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByText('Không có sản phẩm phù hợp.')).toBeInTheDocument()
  expect(mocks.products).toHaveBeenCalledTimes(2)
})

it('loads the overview from one aggregate dashboard request without downloading orders or products', async () => {
  mocks.categories.mockResolvedValue({ items: [] })
  mocks.orders.mockReset()
  mocks.products.mockReset()
  const zero = { revenue_vnd: 0, placed_order_count: 0, paid_order_count: 0, average_order_value_vnd: 0 }
  mocks.dashboard.mockReset().mockResolvedValue({
    timezone: 'Asia/Ho_Chi_Minh', from: '2026-10-15', to: '2026-11-13', days: 30, previous_from: '2026-09-15', previous_to: '2026-10-14', generated_at: '2026-11-13T14:30:00Z',
    kpis: { current: { ...zero, revenue_vnd: 6_000_000, placed_order_count: 6, paid_order_count: 6, average_order_value_vnd: 1_000_000 }, previous: zero },
    revenue_by_day: [], orders_by_status: [], revenue_by_payment_method: [], top_products: [], recent_orders: [],
    pending: { awaiting_confirmation_orders: 0, pending_cancellation_requests: 0, low_stock_variants: 0 },
  })
  render(<MemoryRouter initialEntries={['/admin']}><ToastProvider><AdminPage /></ToastProvider></MemoryRouter>)
  expect(await screen.findByRole('region', { name: 'Chỉ số chính' })).toHaveTextContent('Doanh thu đã thu')
  expect(mocks.dashboard).toHaveBeenCalledTimes(1)
  expect(mocks.orders).not.toHaveBeenCalled()
  expect(mocks.products).not.toHaveBeenCalled()
  expect(screen.getAllByText('Tài khoản').length).toBeGreaterThan(0)
})
