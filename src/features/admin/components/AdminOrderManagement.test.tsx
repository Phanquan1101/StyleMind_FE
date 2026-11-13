import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, expect, it, vi } from "vitest"
import { createDemoSeed } from "@/app/data/demoSeed"
import { ToastProvider } from "@/shared/ui"
import { returnsApi, type ReturnRequest } from "@/features/returns/returnsApi"
import { AdminOrdersPanel } from "./AdminOrdersPanel"
import { AdminRequestsPanel } from "./AdminRequestsPanel"
import AdminReturnsPanel from "./AdminReturnsPanel"

afterEach(() => vi.restoreAllMocks())

it('shows live return work and the VNPAY method while giving cancellation priority', () => {
  const database = createDemoSeed()
  const template = database.orders[0]
  database.orders = [
    { ...template, id: 'return-order', orderNumber: 'SM-RETURN', paymentMethod: 'vnpay', status: 'completed' },
    { ...template, id: 'cancel-order', orderNumber: 'SM-CANCEL', paymentMethod: 'vnpay', status: 'confirmed', confirmationState: 'UNCONFIRMED' },
  ]
  database.cancellationRequests = [{ id: 'cancel-request', orderId: 'cancel-order', userId: template.userId, status: 'submitted', reason: 'Không cần nữa', createdAt: template.createdAt }]
  const returnStatuses = new Map([['return-order', 'PICKUP_APPROVED'], ['cancel-order', 'REQUESTED']])
  render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={vi.fn()} returnStatuses={returnStatuses} /></ToastProvider></MemoryRouter>)
  const returned = screen.getByRole('row', { name: /SM-RETURN/ })
  expect(within(returned).getByText('Chờ lấy hàng')).toBeVisible()
  expect(within(returned).getByText('VNPAY')).toBeVisible()
  const cancelled = screen.getByRole('row', { name: /SM-CANCEL/ })
  expect(within(cancelled).getByText('Chờ duyệt hủy')).toBeVisible()
  expect(within(cancelled).queryByText('Chờ duyệt trả hàng')).not.toBeInTheDocument()
})

it('opens the cancellation selected by a link from order detail', () => {
  const database = createDemoSeed()
  database.cancellationRequests = [{
    id: 'linked-request', orderId: database.orders[0].id, userId: database.orders[0].userId,
    reason: 'Yêu cầu từ chi tiết đơn', status: 'submitted', createdAt: '2026-11-12T00:00:00Z',
  }]
  render(<MemoryRouter initialEntries={['/admin?section=requests&requestId=linked-request']}>
    <ToastProvider><AdminRequestsPanel database={database} dispatch={vi.fn()} reviewerId="admin" /></ToastProvider>
  </MemoryRouter>)
  const detail = screen.getByRole('dialog')
  expect(detail).toHaveTextContent('Yêu cầu từ chi tiết đơn')
  expect(within(detail).getByRole('link', { name: 'Xem đơn hàng' })).toHaveAttribute(
    'href', `/admin?section=orders&orderId=${database.orders[0].id}`,
  )
})

function ordersDatabase() {
  const database = createDemoSeed()
  const template = database.orders[0]
  database.orders = Array.from({ length: 18 }, (_, index) => ({
    ...template,
    id: `order-${index}`,
    orderNumber: `SM-TEST-${index.toString().padStart(2, "0")}`,
    createdAt: new Date(2026, 10, index + 1, 12).toISOString(),
    status: "confirmed" as const,
    backendStatus: "PLACED",
    confirmationState: "UNCONFIRMED" as const,
  }))
  return database
}

it('lets admin ship an automatically prepared VietQR order without another confirmation', async () => {
  const user = userEvent.setup()
  const database = ordersDatabase()
  database.orders = [{ ...database.orders[0], paymentMethod: 'vietqr', paymentStatus: 'paid', status: 'processing', backendStatus: 'PROCESSING', confirmationState: 'AUTO_CONFIRMED' }]
  render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Chi tiết đơn SM-TEST-00' }))
  expect(screen.getByText('Đang chuẩn bị')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Xác nhận đơn' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Bắt đầu giao hàng' })).toBeVisible()
})

it('uses the server confirmation state for both the pending filter and queue', async () => {
  const user = userEvent.setup()
  const database = ordersDatabase()
  database.orders[0] = { ...database.orders[0], status: 'cancelled', backendStatus: 'CANCELLED' }
  database.orders[1] = { ...database.orders[1], confirmationState: 'CONFIRMED' }
  render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)
  await user.selectOptions(screen.getByLabelText('Trạng thái'), 'pending')
  expect(screen.getByText('1–15 trong 16 kết quả')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'SM-TEST-00' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'SM-TEST-01' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
  await user.click(screen.getByRole('button', { name: /Chờ xác nhận\s*16/ }))
  expect(screen.getByText('1–15 trong 16 kết quả')).toBeVisible()
})

it("paginates orders and preserves filters when returning from order detail", async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <ToastProvider>
        <AdminOrdersPanel database={ordersDatabase()} dispatch={vi.fn()} />
      </ToastProvider>
    </MemoryRouter>,
  )
  const table = screen.getByRole("region", { name: "Bảng đơn hàng" })
  expect(within(table).getAllByRole("row")).toHaveLength(16)
  expect(
    screen.queryByRole("button", { name: "Xác nhận đơn" }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Trang sau" }))
  expect(within(table).getAllByRole("row")).toHaveLength(4)
  await user.type(screen.getByLabelText("Tìm đơn hàng"), "SM-TEST-03")
  expect(screen.getByText("Trang 1 / 1")).toBeVisible()
  await user.click(
    screen.getByRole("button", { name: "Chi tiết đơn SM-TEST-03" }),
  )
  expect(screen.getByRole("heading", { name: "SM-TEST-03" })).toBeVisible()
  expect(screen.getByRole("button", { name: "Xác nhận đơn" })).toBeVisible()
  await user.click(
    screen.getByRole("button", { name: "Quay lại danh sách đơn hàng" }),
  )
  expect(screen.getByLabelText("Tìm đơn hàng")).toHaveValue("SM-TEST-03")
  expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2)
})

it("combines order queues with date and payment filters", async () => {
  const user = userEvent.setup()
  const database = ordersDatabase()
  database.orders[3] = {
    ...database.orders[3],
    status: "shipped",
    paymentMethod: "vietqr",
    confirmationState: "CONFIRMED",
  }
  render(
    <MemoryRouter>
      <ToastProvider>
        <AdminOrdersPanel database={database} dispatch={vi.fn()} />
      </ToastProvider>
    </MemoryRouter>,
  )
  await user.click(screen.getByRole("button", { name: /Đang giao\s*1/ }))
  expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2)
  await user.selectOptions(screen.getByLabelText("Thanh toán"), "cod")
  expect(screen.getByText("Không có đơn hàng phù hợp.")).toBeVisible()
  await user.click(screen.getByRole("button", { name: "Xóa bộ lọc" }))
  await user.type(screen.getByLabelText("Từ ngày"), "2026-11-04")
  await user.type(screen.getByLabelText("Đến ngày"), "2026-11-04")
  expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2)
  expect(
    screen.getByRole("button", { name: "SM-TEST-03" }),
  ).toBeVisible()
})

it("filters and paginates cancellations and restores focus after closing detail", async () => {
  const user = userEvent.setup()
  const database = ordersDatabase()
  database.cancellationRequests = database.orders.map((order, index) => ({
    id: `request-${index}`,
    orderId: order.id,
    userId: order.userId,
    reason: `Lý do ${index}`,
    status: index === 0 ? "rejected" as const : "submitted" as const,
    createdAt: order.createdAt,
  }))
  render(
    <MemoryRouter>
      <ToastProvider>
        <AdminRequestsPanel
          database={database}
          dispatch={vi.fn()}
          reviewerId="admin"
        />
      </ToastProvider>
    </MemoryRouter>,
  )
  expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(16)
  await user.click(screen.getByRole("button", { name: "Trang sau" }))
  await user.selectOptions(
    screen.getByLabelText("Trạng thái yêu cầu"),
    "rejected",
  )
  const opener = screen.getByRole("button", {
    name: "Xem yêu cầu hủy request-0",
  })
  await user.click(opener)
  expect(screen.getByRole("dialog")).toHaveTextContent("Lý do 0")
  expect(
    within(screen.getByRole("dialog")).queryByRole("button", {
      name: "Duyệt yêu cầu",
    }),
  ).not.toBeInTheDocument()
  await user.keyboard("{Escape}")
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})

it("loads all server return pages for searching, then opens the selected return drawer", async () => {
  const user = userEvent.setup()
  const records: ReturnRequest[] = Array.from({ length: 22 }, (_, index) => ({
    return_id: `return-${index}`,
    order_id: `order-${index}`,
    order_number: `SM-RETURN-${index}`,
    status: index === 21 ? "MORE_IMAGES_REQUESTED" : "REQUESTED",
    reason: `Yêu cầu kiểm thử ${index}`,
    amount_vnd: 120000,
    created_at: "2026-11-12T00:00:00Z",
    items: [],
    evidence: [],
    history: [],
  }))
  const list = vi
    .spyOn(returnsApi, "adminList")
    .mockImplementation(async (page) => ({
      items: records.slice(page * 20, (page + 1) * 20),
      page,
      size: 20,
      total_elements: 22,
      total_pages: 2,
    }))
  render(
    <MemoryRouter>
      <AdminReturnsPanel />
    </MemoryRouter>,
  )
  await screen.findByRole("button", { name: "Xem yêu cầu SM-RETURN-0" })
  expect(list).toHaveBeenCalledWith(1, expect.any(AbortSignal))
  expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(16)
  await user.click(screen.getByRole("button", { name: "Trang sau" }))
  expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(8)
  await user.type(screen.getByLabelText("Tìm yêu cầu"), "SM-RETURN-21")
  await user.click(
    screen.getByRole("button", { name: "Xem yêu cầu SM-RETURN-21" }),
  )
  expect(screen.getByRole("dialog")).toHaveTextContent(
    "Đang chờ khách gửi thêm ảnh.",
  )
  await user.click(screen.getByRole("button", { name: "Đóng hộp thoại" }))
  expect(screen.getByLabelText("Tìm yêu cầu")).toHaveValue("SM-RETURN-21")
  expect(screen.getByText("Trang 1 / 1")).toBeVisible()
  list.mockRejectedValueOnce(new Error("Không thể kết nối"))
  await user.click(screen.getByRole("button", { name: "Tải lại yêu cầu" }))
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Không thể kết nối"),
  )
})
