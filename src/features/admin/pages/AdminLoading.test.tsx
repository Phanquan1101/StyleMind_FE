import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { createDemoSeed } from '@/app/data/demoSeed'
import { ToastProvider } from '@/shared/ui'
import { AdminPage } from './AdminPage'

const mocks = vi.hoisted(() => ({ products: vi.fn(), categories: vi.fn(), orders: vi.fn(), dispatch: vi.fn() }))
vi.mock('@/api/commerce', () => ({ commerceApi: { categories: { listAdmin: mocks.categories }, orders: { listAdmin: mocks.orders }, products: { listAdmin: mocks.products } } }))
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

it('shows server totals on the overview without downloading orders or products', async () => {
  mocks.categories.mockResolvedValue({ items: [] })
  mocks.orders.mockReset().mockResolvedValue({ items: [], page: 0, size: 1, total_elements: 6, total_pages: 6 })
  mocks.products.mockReset().mockResolvedValue({ items: [], page: 0, size: 1, total_elements: 203, total_pages: 203 })
  render(<MemoryRouter initialEntries={['/admin']}><ToastProvider><AdminPage /></ToastProvider></MemoryRouter>)
  expect(await screen.findByText('Tổng đơn hàng')).toBeInTheDocument()
  expect(await screen.findByText('6')).toBeInTheDocument()
  expect(await screen.findByText('203')).toBeInTheDocument()
  expect(mocks.orders).toHaveBeenCalledWith({ page: 0, size: 1 })
  expect(screen.getAllByText('Tài khoản').length).toBeGreaterThan(0)
})
