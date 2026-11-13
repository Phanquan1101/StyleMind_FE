import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { AdminDashboard as DashboardData } from '@/api/commerce.types'
import { AdminDashboard } from './AdminDashboard'
import { useAdminNavBadges } from './useAdminDashboard'

const dashboardGet = vi.hoisted(() => vi.fn())
vi.mock('@/api/commerce', () => ({ commerceApi: { dashboard: { get: dashboardGet } } }))

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  dashboardGet.mockReset()
})

const day = (index: number, revenue: number, paid: number, placed: number) => ({
  date: `2026-11-${String(index + 1).padStart(2, '0')}`, revenue_vnd: revenue, paid_order_count: paid, placed_order_count: placed,
})

function fixture(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    timezone: 'Asia/Ho_Chi_Minh', from: '2026-11-01', to: '2026-11-07', days: 7, previous_from: '2026-10-25', previous_to: '2026-10-31',
    generated_at: '2026-11-13T14:30:00Z',
    kpis: {
      current: { revenue_vnd: 48_650_000, placed_order_count: 62, paid_order_count: 62, average_order_value_vnd: 784_700 },
      previous: { revenue_vnd: 43_280_000, placed_order_count: 57, paid_order_count: 50, average_order_value_vnd: 864_000 },
    },
    revenue_by_day: [day(0, 1_000_000, 1, 2), day(1, 0, 0, 0), day(2, 2_940_000, 4, 5), day(3, 500_000, 1, 1), day(4, 0, 0, 0), day(5, 1_200_000, 2, 2), day(6, 900_000, 1, 1)],
    orders_by_status: [
      { status: 'COMPLETED', count: 31 }, { status: 'SHIPPED', count: 12 }, { status: 'AWAITING_CONFIRMATION', count: 9 },
      { status: 'CONFIRMED', count: 2 }, { status: 'PROCESSING', count: 3 }, { status: 'CANCELLED', count: 10 },
    ],
    revenue_by_payment_method: [
      { payment_method: 'VNPAY', revenue_vnd: 21_400_000 }, { payment_method: 'COD', revenue_vnd: 17_900_000 }, { payment_method: 'SEPAY_VIETQR', revenue_vnd: 9_350_000 },
    ],
    top_products: [
      { product_id: 'p1', name: 'Áo ba lỗ cổ tròn ôm dáng', image_url: 'https://img.test/1.jpg', quantity: 14, revenue_vnd: 9_000_000 },
      { product_id: 'p2', name: 'Quần váy đắp chéo', image_url: null, quantity: 9, revenue_vnd: 6_900_000 },
    ],
    pending: { awaiting_confirmation_orders: 3, pending_cancellation_requests: 1, low_stock_variants: 4 },
    recent_orders: [
      { order_id: 'o1', order_number: 'SM-DF3596C8', customer_name: 'An', total_vnd: 875_000, order_status: 'PAID', confirmation_state: 'UNCONFIRMED', paid: true, placed_at: '2026-11-13T08:50:00Z' },
      { order_id: 'o2', order_number: 'SM-63FB28FC', customer_name: null, total_vnd: 1_290_000, order_status: 'SHIPPED', confirmation_state: 'CONFIRMED', paid: true, placed_at: '2026-11-12T07:00:00Z' },
    ],
    ...overrides,
  }
}

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.pathname}{location.search}</output>
}

function renderPage(url = '/admin', fetchExceptions: () => Promise<number> = () => Promise.resolve(2)) {
  return render(<MemoryRouter initialEntries={[url]}><AdminDashboard fetchExceptions={fetchExceptions} /><Where /></MemoryRouter>)
}

it('shows every block of design A with the numbers from one dashboard request', async () => {
  dashboardGet.mockResolvedValue(fixture())
  renderPage()
  expect(screen.getByRole('status', { name: 'Đang tải tổng quan' })).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'Tổng quan quản trị' })).toBeInTheDocument()

  const kpis = await screen.findByRole('region', { name: 'Chỉ số chính' })
  expect(within(kpis).getAllByRole('article')).toHaveLength(3)
  expect(within(kpis).getByText('Doanh thu đã thu')).toBeInTheDocument()
  expect(within(kpis).getByText(/48,65 tr/)).toBeInTheDocument()
  expect(within(kpis).getByText('62')).toBeInTheDocument()
  expect(within(kpis).getByLabelText('Thay đổi ▲ 12,4%')).toBeInTheDocument() // 48.65 vs 43.28
  expect(within(kpis).getByLabelText('Thay đổi ▼ 9,2%')).toBeInTheDocument() // average value fell
  expect(within(kpis).getAllByText('so với 7 ngày trước')).toHaveLength(3)

  expect(screen.getByRole('heading', { name: 'Doanh thu theo ngày' })).toBeInTheDocument()
  expect(screen.getByText('Chỉ tính tiền đã thu · theo ngày nhận tiền')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: /Biểu đồ doanh thu 7 ngày/ })).toBeInTheDocument()

  const donut = screen.getByRole('img', { name: 'Tỷ lệ trạng thái đơn, tổng 67 đơn' })
  expect(donut).toBeInTheDocument()
  expect(screen.getByText('Hoàn tất').closest('li')).toHaveTextContent('31')
  expect(screen.getByText('Đang xử lý').closest('li')).toHaveTextContent('5') // CONFIRMED + PROCESSING
  expect(screen.getByText('Đã hủy').closest('li')).toHaveTextContent('10')

  expect(screen.getByRole('heading', { name: 'Việc cần xử lý' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Top 5 sản phẩm bán chạy' })).toBeInTheDocument()
  expect(screen.getByText('Áo ba lỗ cổ tròn ôm dáng')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Theo phương thức thanh toán' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'VNPAY: 44%' })).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'COD đã thu: 37%' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Đơn gần đây' })).toBeInTheDocument()
  expect(screen.getByText('Cập nhật lúc 21:30')).toBeInTheDocument()
  expect(dashboardGet).toHaveBeenCalledTimes(1)
})

it('links each to-do and recent order to the right place', async () => {
  dashboardGet.mockResolvedValue(fixture())
  renderPage()
  const todo = (await screen.findByRole('heading', { name: 'Việc cần xử lý' })).closest('section') as HTMLElement
  expect(within(todo).getByRole('link', { name: /3\s*Đơn chờ xác nhận/ })).toHaveAttribute('href', '/admin?section=orders&queue=confirmation')
  expect(within(todo).getByRole('link', { name: /1\s*Yêu cầu hủy đơn/ })).toHaveAttribute('href', '/admin?section=requests')
  expect(await within(todo).findByRole('link', { name: /2\s*Ngoại lệ thanh toán/ })).toHaveAttribute('href', '/admin?section=payments')
  expect(within(todo).getByRole('link', { name: /4\s*Biến thể sắp hết hàng/ })).toHaveAttribute('href', '/admin?section=products')

  const recent = screen.getByRole('heading', { name: 'Đơn gần đây' }).closest('section') as HTMLElement
  expect(within(recent).getByRole('link', { name: /SM-DF3596C8/ })).toHaveAttribute('href', '/admin?section=orders&orderId=o1')
  expect(within(recent).getByText('Đã thanh toán')).toBeInTheDocument()
  expect(within(recent).getByText('Đang giao')).toBeInTheDocument()
  expect(within(recent).getByText('Khách hàng')).toBeInTheDocument() // no recipient name
  expect(within(recent).getByRole('link', { name: 'Xem tất cả →' })).toHaveAttribute('href', '/admin?section=orders')
})

it('shows a dash for payment exceptions until known and when that service fails', async () => {
  dashboardGet.mockResolvedValue(fixture())
  renderPage('/admin', () => Promise.reject(new Error('payment down')))
  const todo = (await screen.findByRole('heading', { name: 'Việc cần xử lý' })).closest('section') as HTMLElement
  expect(within(todo).getByRole('link', { name: /—\s*Ngoại lệ thanh toán/ })).toBeInTheDocument()
  expect(within(todo).getByRole('link', { name: /3\s*Đơn chờ xác nhận/ })).toBeInTheDocument() // other counters unaffected
})

it('switches the range, keeps it in the URL and asks the server for those shop days', async () => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-13T09:00:00Z') })
  dashboardGet.mockResolvedValue(fixture())
  const user = userEvent.setup({ advanceTimers: () => undefined })
  renderPage()
  await screen.findByRole('heading', { name: 'Tổng quan quản trị' })
  expect(dashboardGet).toHaveBeenLastCalledWith({ from: '2026-10-15', to: '2026-11-13' })
  expect(screen.getByRole('button', { name: '30 ngày' })).toHaveAttribute('aria-pressed', 'true')

  await user.click(screen.getByRole('button', { name: '7 ngày' }))
  await waitFor(() => expect(dashboardGet).toHaveBeenLastCalledWith({ from: '2026-11-07', to: '2026-11-13' }))
  expect(screen.getByTestId('where')).toHaveTextContent('/admin?range=7')
  expect(screen.getByRole('button', { name: '7 ngày' })).toHaveAttribute('aria-pressed', 'true')

  await user.click(screen.getByRole('button', { name: 'Hôm nay' }))
  await waitFor(() => expect(dashboardGet).toHaveBeenLastCalledWith({ from: '2026-11-13', to: '2026-11-13' }))
  await user.click(screen.getByRole('button', { name: '90 ngày' }))
  await waitFor(() => expect(dashboardGet).toHaveBeenLastCalledWith({ from: '2026-08-16', to: '2026-11-13' }))
})

it('restores the range from the URL and refreshes on demand', async () => {
  dashboardGet.mockResolvedValue(fixture())
  const user = userEvent.setup()
  renderPage('/admin?range=90')
  await screen.findByRole('heading', { name: 'Tổng quan quản trị' })
  expect(screen.getByRole('button', { name: '90 ngày' })).toHaveAttribute('aria-pressed', 'true')
  expect(dashboardGet).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: 'Làm mới' }))
  await waitFor(() => expect(dashboardGet).toHaveBeenCalledTimes(2))
})

it('shows friendly empty states instead of errors when there are no orders at all', async () => {
  const zero = { revenue_vnd: 0, placed_order_count: 0, paid_order_count: 0, average_order_value_vnd: 0 }
  dashboardGet.mockResolvedValue(fixture({
    kpis: { current: zero, previous: zero },
    revenue_by_day: [day(0, 0, 0, 0), day(1, 0, 0, 0)], orders_by_status: [],
    revenue_by_payment_method: [{ payment_method: 'VNPAY', revenue_vnd: 0 }, { payment_method: 'COD', revenue_vnd: 0 }, { payment_method: 'SEPAY_VIETQR', revenue_vnd: 0 }],
    top_products: [], recent_orders: [], pending: { awaiting_confirmation_orders: 0, pending_cancellation_requests: 0, low_stock_variants: 0 },
  }))
  renderPage()
  await screen.findByRole('heading', { name: 'Doanh thu theo ngày' })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getAllByText('Chưa có dữ liệu trong khoảng này')).toHaveLength(3) // chart, donut, payment methods
  expect(screen.getByText('Chưa có sản phẩm bán ra trong khoảng này')).toBeInTheDocument()
  expect(screen.getByText('Chưa có đơn hàng nào')).toBeInTheDocument()
  expect(screen.getAllByLabelText('Thay đổi —')).toHaveLength(3)
})

it('shows a retryable error without a page and keeps the last numbers when a refresh fails', async () => {
  const user = userEvent.setup()
  dashboardGet.mockRejectedValueOnce(new Error('Máy chủ không phản hồi')).mockResolvedValueOnce(fixture()).mockRejectedValueOnce(new Error('Mất kết nối'))
  renderPage()
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được dữ liệu tổng quan. Máy chủ không phản hồi')
  expect(screen.getByRole('heading', { name: 'Tổng quan quản trị' })).toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Chỉ số chính' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByRole('region', { name: 'Chỉ số chính' })).toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Làm mới' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('đang hiển thị dữ liệu lần trước')
  expect(screen.getByRole('region', { name: 'Chỉ số chính' })).toBeInTheDocument()
})

it('turns a missing API client into the error state instead of crashing the page', async () => {
  dashboardGet.mockImplementation(() => { throw new TypeError('boom') })
  renderPage()
  expect(await screen.findByRole('alert')).toHaveTextContent('boom')
})

it('keeps the other blocks when one block cannot render', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  dashboardGet.mockResolvedValue(fixture({ top_products: null as unknown as DashboardData['top_products'] }))
  renderPage()
  expect(await screen.findByRole('region', { name: 'Chỉ số chính' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Đơn gần đây' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Trạng thái đơn' })).toBeInTheDocument()
  const broken = screen.getByRole('heading', { name: 'Top 5 sản phẩm bán chạy' }).closest('section') as HTMLElement
  expect(within(broken).getByRole('alert')).toHaveTextContent('Không hiển thị được khối này')
})

it('ignores a late answer for a range that is no longer selected', async () => {
  let resolveFirst: (value: DashboardData) => void = () => undefined
  dashboardGet.mockImplementationOnce(() => new Promise<DashboardData>(resolve => { resolveFirst = resolve }))
  dashboardGet.mockResolvedValueOnce(fixture({ days: 7, kpis: { current: { revenue_vnd: 7_000_000, placed_order_count: 7, paid_order_count: 7, average_order_value_vnd: 1_000_000 }, previous: { revenue_vnd: 0, placed_order_count: 0, paid_order_count: 0, average_order_value_vnd: 0 } } }))
  const user = userEvent.setup()
  renderPage()
  await user.click(screen.getByRole('button', { name: '7 ngày' }))
  expect(await screen.findByText(/7,0 tr/)).toBeInTheDocument()
  await act(async () => { resolveFirst(fixture({ kpis: { current: { revenue_vnd: 99_000_000, placed_order_count: 1, paid_order_count: 1, average_order_value_vnd: 1 }, previous: fixture().kpis.previous } })) })
  expect(screen.queryByText(/99,0 tr/)).not.toBeInTheDocument()
  expect(screen.getByText(/7,0 tr/)).toBeInTheDocument()
})

it('feeds the sidebar badges from the server and refreshes them on a timer', async () => {
  vi.useFakeTimers()
  const pending = vi.fn()
    .mockResolvedValueOnce({ awaiting_confirmation_orders: 3, pending_cancellation_requests: 0, low_stock_variants: 1 })
    .mockResolvedValueOnce({ awaiting_confirmation_orders: 4, pending_cancellation_requests: 1, low_stock_variants: 1 })
    .mockRejectedValue(new Error('offline'))
  const exceptions = vi.fn().mockResolvedValue(2)
  const { result } = renderHook(() => useAdminNavBadges({ enabled: true, intervalMs: 30_000, fetchPending: pending, fetchExceptions: exceptions }))
  expect(result.current).toEqual({ orders: 0, payments: 0, requests: 0 })
  await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  expect(result.current).toEqual({ orders: 3, payments: 2, requests: 0 })
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
  expect(result.current).toEqual({ orders: 4, payments: 2, requests: 1 }) // a customer sent a cancellation request
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })
  expect(result.current).toEqual({ orders: 4, payments: 2, requests: 1 }) // failing source keeps the last value
})

it('does not poll when disabled', async () => {
  const pending = vi.fn()
  const { result } = renderHook(() => useAdminNavBadges({ enabled: false, fetchPending: pending, fetchExceptions: vi.fn() }))
  expect(result.current).toEqual({ orders: 0, payments: 0, requests: 0 })
  expect(pending).not.toHaveBeenCalled()
})
