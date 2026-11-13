import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { AdminRevenueMetrics, AdminRevenueReport } from '@/api/commerce.types'
import { AdminRevenuePage } from './AdminRevenuePage'

const mocks = vi.hoisted(() => ({ get: vi.fn(), exportCsv: vi.fn() }))
vi.mock('@/api/commerce', () => ({ commerceApi: { revenue: { get: mocks.get, exportCsv: mocks.exportCsv } } }))

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  mocks.get.mockReset()
  mocks.exportCsv.mockReset()
})

const metrics = (orders: number, revenue: number, refunded: number): AdminRevenueMetrics => ({ paid_order_count: orders, revenue_vnd: revenue, refunded_vnd: refunded, net_revenue_vnd: revenue - refunded })

const TOTAL = metrics(47, 81_979_000, 1_166_000)
const PREVIOUS = metrics(40, 70_000_000, 500_000)

function fixture(overrides: Partial<AdminRevenueReport> = {}): AdminRevenueReport {
  return {
    timezone: 'Asia/Ho_Chi_Minh', from: '2026-10-15', to: '2026-11-13', days: 30, previous_from: '2026-09-15', previous_to: '2026-10-14',
    group: 'week', generated_at: '2026-11-13T14:30:00Z',
    totals: { current: TOTAL, previous: PREVIOUS },
    periods: [
      { from: '2026-10-15', to: '2026-10-18', previous_from: '2026-09-15', previous_to: '2026-09-18', current: metrics(5, 6_585_000, 0), previous: metrics(4, 5_000_000, 0) },
      { from: '2026-10-19', to: '2026-10-25', previous_from: '2026-09-19', previous_to: '2026-09-25', current: metrics(42, 75_394_000, 1_166_000), previous: metrics(36, 65_000_000, 500_000) },
    ],
    by_category: [
      { category_id: 'c1', name: 'Áo', revenue_vnd: 61_957_000, quantity: 86 },
      { category_id: 'c2', name: 'Áo khoác', revenue_vnd: 20_019_000, quantity: 14 },
      { category_id: 'c3', name: 'Bộ đồ', revenue_vnd: 3_000, quantity: 3 },
    ],
    by_payment_method: [
      { payment_method: 'VNPAY', revenue_vnd: 35_789_000, refunded_vnd: 903_000, net_revenue_vnd: 34_886_000, paid_order_count: 18 },
      { payment_method: 'COD', revenue_vnd: 16_026_000, refunded_vnd: 0, net_revenue_vnd: 16_026_000, paid_order_count: 14 },
      { payment_method: 'SEPAY_VIETQR', revenue_vnd: 30_164_000, refunded_vnd: 263_000, net_revenue_vnd: 29_901_000, paid_order_count: 15 },
    ],
    top_products: Array.from({ length: 10 }, (_, index) => ({ product_id: `p${index}`, name: `Sản phẩm ${index + 1}`, image_url: null, quantity: 20 - index, revenue_vnd: 14_920_000 - index * 1_000_000 })),
    ...overrides,
  }
}

function Where() {
  const location = useLocation()
  return <output data-testid="where">{location.pathname}{location.search}</output>
}

function renderPage(url = '/admin?section=revenue') {
  return render(<MemoryRouter initialEntries={[url]}><AdminRevenuePage /><Where /></MemoryRouter>)
}

it('shows the four cards, chart, period table with a total row, two share tables and the top 10', async () => {
  mocks.get.mockResolvedValue(fixture())
  renderPage()
  expect(screen.getByRole('status', { name: 'Đang tải báo cáo doanh thu' })).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'Doanh thu' })).toBeInTheDocument()

  const cards = await screen.findByRole('region', { name: 'Chỉ số doanh thu' })
  expect(within(cards).getAllByRole('article')).toHaveLength(4)
  expect(within(cards).getByText('Doanh thu đã thu')).toBeInTheDocument()
  expect(within(cards).getByText('Tiền đã hoàn')).toBeInTheDocument()
  expect(within(cards).getByText('Thực thu')).toBeInTheDocument()
  expect(within(cards).getByText('Số đơn đã thanh toán')).toBeInTheDocument()
  expect(within(cards).getByText(/81,98 tr/)).toBeInTheDocument()
  expect(within(cards).getByText(/80,81 tr/)).toBeInTheDocument()
  expect(within(cards).getByLabelText('Thay đổi ▲ 17,1%')).toBeInTheDocument() // 81.979 vs 70 (gross)
  expect(within(cards).getByLabelText('Thay đổi ▲ 133,2%')).toBeInTheDocument() // refunds 1.166 vs 0.5
  expect(within(cards).getByLabelText('Thay đổi ▲ 17,5%')).toBeInTheDocument() // orders 47 vs 40
  expect(within(cards).getAllByText('so với 30 ngày trước')).toHaveLength(4)

  expect(screen.getByRole('img', { name: /Biểu đồ thực thu theo tuần/ })).toBeInTheDocument()
  expect(screen.getByText('Kỳ trước')).toBeInTheDocument()

  const table = screen.getByRole('heading', { name: 'Chi tiết theo kỳ' }).closest('section') as HTMLElement
  expect(within(table).getByText('15/10/2026 – 18/10/2026')).toBeInTheDocument()
  const rows = within(table).getAllByRole('row')
  expect(rows).toHaveLength(1 + 2 + 1) // header + periods + total
  const total = rows[rows.length - 1]
  expect(total).toHaveTextContent('Tổng')
  expect(total).toHaveTextContent('47')
  expect(total.textContent).toContain('81.979.000')
  expect(total.textContent).toContain('1.166.000')
  expect(total.textContent).toContain('80.813.000')
  expect(within(table).getByRole('button', { name: 'Xuất CSV' })).toBeInTheDocument()

  const categories = screen.getByRole('heading', { name: 'Theo danh mục' }).closest('section') as HTMLElement
  expect(within(categories).getByText('Áo khoác')).toBeInTheDocument()
  expect(within(categories).getByRole('img', { name: 'Áo: 75,6%' })).toBeInTheDocument()
  const methods = screen.getByRole('heading', { name: 'Theo phương thức thanh toán' }).closest('section') as HTMLElement
  expect(within(methods).getByText('COD đã thu')).toBeInTheDocument()
  expect(within(methods).getByRole('img', { name: 'VNPAY: 43,2%' })).toBeInTheDocument() // 34.886 / 80.813

  const top = screen.getByRole('heading', { name: 'Top 10 sản phẩm' }).closest('section') as HTMLElement
  expect(within(top).getAllByRole('row')).toHaveLength(11)
  expect(mocks.get).toHaveBeenCalledTimes(1)
})

it('requests the default range and keeps every filter in the URL', async () => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-13T09:00:00Z') })
  mocks.get.mockResolvedValue(fixture())
  const user = userEvent.setup({ advanceTimers: () => undefined })
  renderPage()
  await screen.findByRole('heading', { name: 'Doanh thu' })
  expect(mocks.get).toHaveBeenLastCalledWith({ from: '2026-10-15', to: '2026-11-13', group: 'day' })
  expect(screen.getByRole('button', { name: '30 ngày' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Ngày' })).toHaveAttribute('aria-pressed', 'true')

  await user.click(screen.getByRole('button', { name: '7 ngày' }))
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith({ from: '2026-11-07', to: '2026-11-13', group: 'day' }))
  await user.click(screen.getByRole('button', { name: '90 ngày' }))
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith({ from: '2026-08-16', to: '2026-11-13', group: 'day' }))
  await user.click(screen.getByRole('button', { name: 'Tháng này' }))
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith({ from: '2026-11-01', to: '2026-11-13', group: 'day' }))
  await user.click(screen.getByRole('button', { name: 'Tháng trước' }))
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-31', group: 'day' }))
  await user.click(screen.getByRole('button', { name: 'Tuần' }))
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-31', group: 'week' }))
  expect(screen.getByTestId('where')).toHaveTextContent('range=last-month')
  expect(screen.getByTestId('where')).toHaveTextContent('group=week')
  await user.click(screen.getByRole('button', { name: 'Tháng' }))
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-31', group: 'month' }))
})

it('restores range and grouping from the URL', async () => {
  mocks.get.mockResolvedValue(fixture())
  renderPage('/admin?section=revenue&range=custom&from=2026-10-01&to=2026-10-31&group=month')
  await screen.findByRole('heading', { name: 'Doanh thu' })
  expect(mocks.get).toHaveBeenCalledTimes(1)
  expect(mocks.get).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-31', group: 'month' })
  expect(screen.getByRole('button', { name: 'Tùy chọn' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Tháng' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByLabelText('Từ ngày')).toHaveValue('2026-10-01')
  expect(screen.getByLabelText('Đến ngày')).toHaveValue('2026-10-31')
  expect(screen.getByTestId('where')).toHaveTextContent('section=revenue') // other params survive
})

it('opens the custom range pre-filled and only asks the server for valid ranges', async () => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-13T09:00:00Z') })
  mocks.get.mockResolvedValue(fixture())
  const user = userEvent.setup({ advanceTimers: () => undefined })
  renderPage()
  await screen.findByRole('heading', { name: 'Doanh thu' })
  await user.click(screen.getByRole('button', { name: 'Tùy chọn' }))
  expect(screen.getByLabelText('Từ ngày')).toHaveValue('2026-10-15')
  expect(screen.getByLabelText('Đến ngày')).toHaveValue('2026-11-13')
  const calls = mocks.get.mock.calls.length

  const from = screen.getByLabelText('Từ ngày')
  await user.clear(from)
  expect(await screen.findByRole('alert')).toHaveTextContent('Chọn cả ngày bắt đầu và ngày kết thúc.')
  expect(mocks.get).toHaveBeenCalledTimes(calls) // nothing requested while the range is unusable
  expect(screen.getByRole('heading', { name: 'Chi tiết theo kỳ' })).toBeInTheDocument() // last numbers stay

  await user.type(from, '2026-11-20')
  expect(await screen.findByRole('alert')).toHaveTextContent('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.')
  expect(mocks.get).toHaveBeenCalledTimes(calls)

  await user.clear(from)
  await user.type(from, '2026-10-01')
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-11-13', group: 'day' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

it('keeps the same totals whatever the grouping', async () => {
  mocks.get.mockImplementation(async ({ group }: { group: AdminRevenueReport['group'] }) => group === 'month'
    ? fixture({ group: 'month', periods: [{ from: '2026-10-15', to: '2026-10-31', previous_from: '2026-09-15', previous_to: '2026-09-30', current: TOTAL, previous: PREVIOUS }] })
    : fixture({ group }))
  const user = userEvent.setup()
  renderPage('/admin?section=revenue&group=week')
  const totalOf = () => {
    const table = screen.getByRole('heading', { name: 'Chi tiết theo kỳ' }).closest('section') as HTMLElement
    const rows = within(table).getAllByRole('row')
    return rows[rows.length - 1].textContent
  }
  await screen.findByRole('heading', { name: 'Chi tiết theo kỳ' })
  const weekly = totalOf()
  await user.click(screen.getByRole('button', { name: 'Tháng' }))
  await waitFor(() => expect(within(screen.getByRole('heading', { name: 'Chi tiết theo kỳ' }).closest('section') as HTMLElement).getByText('Tháng 10/2026')).toBeInTheDocument())
  expect(totalOf()).toBe(weekly)
  await user.click(screen.getByRole('button', { name: 'Ngày' }))
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith(expect.objectContaining({ group: 'day' })))
  await waitFor(() => expect(totalOf()).toBe(weekly))
})

it('downloads the CSV for the current filters through the authenticated client', async () => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-13T09:00:00Z') })
  mocks.get.mockResolvedValue(fixture())
  mocks.exportCsv.mockResolvedValue(new Blob(['﻿sep=,\r\n'], { type: 'text/csv' }))
  const created = vi.fn(() => 'blob:revenue')
  const revoked = vi.fn()
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: created, revokeObjectURL: revoked }))
  const clicked: string[] = []
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { clicked.push(`${this.download} ${this.href}`) })
  const user = userEvent.setup({ advanceTimers: () => undefined })
  renderPage('/admin?section=revenue&group=week')
  await screen.findByRole('button', { name: 'Xuất CSV' })
  await user.click(screen.getByRole('button', { name: 'Xuất CSV' }))
  await waitFor(() => expect(clicked).toHaveLength(1))
  expect(mocks.exportCsv).toHaveBeenCalledWith({ from: '2026-10-15', to: '2026-11-13', group: 'week' })
  expect(clicked[0]).toBe('doanh-thu_2026-10-15_2026-11-13_week.csv blob:revenue')
  expect(created).toHaveBeenCalledTimes(1)
  click.mockRestore()
})

it('says so when the CSV cannot be produced and keeps the page usable', async () => {
  mocks.get.mockResolvedValue(fixture())
  mocks.exportCsv.mockRejectedValue(new Error('Máy chủ từ chối'))
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole('button', { name: 'Xuất CSV' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Không xuất được CSV: Máy chủ từ chối')
  expect(screen.getByRole('button', { name: 'Xuất CSV' })).toBeEnabled()
  expect(screen.getByRole('heading', { name: 'Top 10 sản phẩm' })).toBeInTheDocument()
})

it('shows friendly empty states when nothing was collected', async () => {
  const zero = metrics(0, 0, 0)
  mocks.get.mockResolvedValue(fixture({
    totals: { current: zero, previous: zero },
    periods: [{ from: '2026-10-15', to: '2026-10-15', previous_from: '2026-10-14', previous_to: '2026-10-14', current: zero, previous: zero }],
    by_category: [], top_products: [],
    by_payment_method: [{ payment_method: 'VNPAY', revenue_vnd: 0, refunded_vnd: 0, net_revenue_vnd: 0, paid_order_count: 0 }, { payment_method: 'COD', revenue_vnd: 0, refunded_vnd: 0, net_revenue_vnd: 0, paid_order_count: 0 }],
  }))
  renderPage()
  await screen.findByRole('heading', { name: 'Thực thu theo kỳ' })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getAllByText('Chưa có dữ liệu trong khoảng này')).toHaveLength(3) // chart + categories + methods
  expect(screen.getByText('Chưa có sản phẩm bán ra trong khoảng này')).toBeInTheDocument()
  expect(screen.getAllByLabelText('Thay đổi —')).toHaveLength(4)
  const table = screen.getByRole('heading', { name: 'Chi tiết theo kỳ' }).closest('section') as HTMLElement
  expect(within(table).getAllByRole('row')).toHaveLength(3) // header + one zero period + total
})

it('shows a retryable error and keeps the last numbers when a refresh fails', async () => {
  const user = userEvent.setup()
  mocks.get.mockRejectedValueOnce(new Error('Máy chủ không phản hồi')).mockResolvedValueOnce(fixture()).mockRejectedValueOnce(new Error('Mất kết nối'))
  renderPage()
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được báo cáo doanh thu. Máy chủ không phản hồi')
  expect(screen.getByRole('heading', { name: 'Doanh thu' })).toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Chỉ số doanh thu' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByRole('region', { name: 'Chỉ số doanh thu' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Làm mới' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('đang hiển thị dữ liệu lần trước')
  expect(screen.getByRole('region', { name: 'Chỉ số doanh thu' })).toBeInTheDocument()
})

it('turns a missing API client into the error state instead of crashing', async () => {
  mocks.get.mockImplementation(() => { throw new TypeError('boom') })
  renderPage()
  expect(await screen.findByRole('alert')).toHaveTextContent('boom')
})

it('keeps the other blocks when one block cannot render', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mocks.get.mockResolvedValue(fixture({ by_category: null as unknown as AdminRevenueReport['by_category'] }))
  renderPage()
  expect(await screen.findByRole('region', { name: 'Chỉ số doanh thu' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Chi tiết theo kỳ' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Top 10 sản phẩm' })).toBeInTheDocument()
  const broken = screen.getByRole('heading', { name: 'Theo danh mục' }).closest('section') as HTMLElement
  expect(within(broken).getByRole('alert')).toHaveTextContent('Không hiển thị được khối này')
})

it('ignores a late answer for filters that are no longer selected', async () => {
  let resolveFirst: (value: AdminRevenueReport) => void = () => undefined
  mocks.get.mockImplementationOnce(() => new Promise<AdminRevenueReport>(resolve => { resolveFirst = resolve }))
  mocks.get.mockResolvedValueOnce(fixture({ totals: { current: metrics(7, 7_000_000, 0), previous: PREVIOUS } }))
  const user = userEvent.setup()
  renderPage()
  await user.click(screen.getByRole('button', { name: '7 ngày' }))
  expect(await screen.findAllByText(/7,0 tr/)).not.toHaveLength(0)
  await act(async () => { resolveFirst(fixture({ totals: { current: metrics(99, 99_000_000, 0), previous: PREVIOUS } })) })
  expect(screen.queryByText(/99,0 tr/)).not.toBeInTheDocument()
})

it('does not lose the first date when both custom dates change back to back', async () => {
  mocks.get.mockResolvedValue(fixture())
  renderPage('/admin?section=revenue&range=custom&from=2026-08-16&to=2026-11-13')
  await screen.findByRole('heading', { name: 'Doanh thu' })
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-11-04' } })
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-11-10' } })
  })
  await waitFor(() => expect(mocks.get).toHaveBeenLastCalledWith({ from: '2026-11-04', to: '2026-11-10', group: 'day' }))
  expect(screen.getByTestId('where')).toHaveTextContent('from=2026-11-04')
  expect(screen.getByTestId('where')).toHaveTextContent('to=2026-11-10')
})
