import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { createDemoSeed } from '@/app/data/demoSeed'
import { ToastProvider } from '@/shared/ui'
import { AdminOrdersPanel } from './AdminOrdersPanel'
import { AdminRequestsPanel } from './AdminRequestsPanel'
const api = vi.hoisted(() => ({ confirm: vi.fn(), reviewCancellation: vi.fn(), updateStatus: vi.fn() }))
vi.mock('@/api/commerce', () => ({ commerceApi: { orders: api } }))
const cod = vi.hoisted(() => vi.fn())
vi.mock('@/features/payments/api/paymentClient', () => ({ paymentApi: { confirmDeliveredCod: cod }, paymentErrorMessage: () => 'Chưa xác nhận thu COD.' }))
beforeEach(() => vi.resetAllMocks())
it.each([
 { status: 'confirmed' as const, confirmationState: 'UNCONFIRMED' as const, action: 'Xác nhận đơn' },
 { status: 'shipped' as const, confirmationState: 'CONFIRMED' as const, action: 'Đã giao hàng' },
])('blocks $action while the customer cancellation awaits review', async ({ status, confirmationState, action }) => {
 const database = createDemoSeed()
 const order = { ...database.orders[0], status, confirmationState, backendStatus: status === 'shipped' ? 'SHIPPED' : 'PLACED' }
 database.orders = [order]
 database.cancellationRequests = [{ id: 'pending-cancel', orderId: order.id, userId: order.userId, status: 'submitted', reason: 'Không cần nữa', createdAt: order.createdAt }]
 render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)
 expect(screen.getByText('Chờ duyệt hủy')).toBeVisible()
 await userEvent.click(screen.getByRole('button', { name: order.orderNumber ?? order.id }))
 expect(screen.getByRole('button', { name: action })).toBeDisabled()
 await userEvent.click(screen.getByRole('button', { name: action }))
 expect(api.confirm).not.toHaveBeenCalled()
 expect(api.updateStatus).not.toHaveBeenCalled()
})
it('does not offer COD collection after the server confirms payment on reload', () => {
 const database = createDemoSeed()
 database.cancellationRequests = []
 database.orders = [{ ...database.orders[0], status: 'completed', paymentMethod: 'cod', paymentStatus: 'paid', refundStatus: 'REFUNDED' } as typeof database.orders[number]]
 render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)
 expect(screen.queryByRole('button', { name: 'Xác nhận đã thu COD' })).not.toBeInTheDocument()
 expect(screen.getByText('Đã hoàn tiền')).toBeVisible()
})
it('records delivery through Commerce and reloads the server result', async () => {
 const database = createDemoSeed()
 database.cancellationRequests = []
 database.orders = [{ ...database.orders[0], status: 'shipped', paymentMethod: 'cod' }]
 const id = database.orders[0].id
 api.updateStatus.mockResolvedValue({ order_status: 'COMPLETED' })
 const reload = vi.fn()
 render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={vi.fn()} onReload={reload} /></ToastProvider></MemoryRouter>)
 await userEvent.click(screen.getByRole('button', { name: database.orders[0].orderNumber ?? id }))
 await userEvent.click(screen.getByRole('button', { name: 'Đã giao hàng' }))
 await waitFor(() => expect(api.updateStatus).toHaveBeenCalledWith(id, 'COMPLETED'))
 await waitFor(() => expect(reload).toHaveBeenCalled())
 expect(cod).not.toHaveBeenCalled()
})

it('keeps a completed COD order free of a second collection action', async () => {
 const database = createDemoSeed()
 database.cancellationRequests = []
 database.orders = [{ ...database.orders[0], status: 'completed', paymentMethod: 'cod' }]
 render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)
 await userEvent.click(screen.getByRole('button', { name: database.orders[0].orderNumber ?? database.orders[0].id }))
 expect(screen.queryByRole('button', { name: 'Xác nhận đã thu COD' })).not.toBeInTheDocument()
 expect(api.updateStatus).not.toHaveBeenCalled()
 expect(cod).not.toHaveBeenCalled()
})

it('preserves the current order when the delivery update fails', async () => {
 const database = createDemoSeed()
 database.cancellationRequests = []
 database.orders = [{ ...database.orders[0], status: 'shipped', paymentMethod: 'cod' }]
 api.updateStatus.mockRejectedValueOnce(new Error('Không thể cập nhật đơn'))
 const dispatch = vi.fn()
 render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={dispatch} /></ToastProvider></MemoryRouter>)
 await userEvent.click(screen.getByRole('button', { name: database.orders[0].orderNumber ?? database.orders[0].id }))
 await userEvent.click(screen.getByRole('button', { name: 'Đã giao hàng' }))
 expect(await screen.findByText('Không thể cập nhật đơn')).toBeVisible()
 expect(dispatch).not.toHaveBeenCalled()
 expect(cod).not.toHaveBeenCalled()
})

it('gọi API xác nhận đơn riêng rồi tải lại', async () => {
 const database = createDemoSeed(); database.orders[0] = { ...database.orders[0], confirmationState: 'UNCONFIRMED', backendStatus: 'PLACED' }
 database.cancellationRequests = []
 const reload = vi.fn(); api.confirm.mockResolvedValue({ order_status: 'PLACED', confirmation_state: 'CONFIRMED' })
 render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={vi.fn()} onReload={reload} /></ToastProvider></MemoryRouter>)
 await userEvent.click(screen.getByRole('button', { name: database.orders[0].orderNumber ?? database.orders[0].id }))
 await userEvent.click(screen.getByRole('button', { name: 'Xác nhận đơn' }))
 await waitFor(() => expect(api.confirm).toHaveBeenCalledWith(database.orders[0].id))
 expect(reload).toHaveBeenCalled()
})
it('yêu cầu lý do từ chối và gửi tới API', async () => {
 const database = createDemoSeed(); database.cancellationRequests = [{ id: 'request', orderId: 'order', userId: 'user', reason: 'Không cần nữa', status: 'submitted', createdAt: '2026-01-01' }]
 api.reviewCancellation.mockResolvedValue({ request_status: 'REJECTED' })
 render(<MemoryRouter><ToastProvider><AdminRequestsPanel database={database} dispatch={vi.fn()} reviewerId="admin" /></ToastProvider></MemoryRouter>)
 await userEvent.click(screen.getByRole('button', { name: 'Xem yêu cầu hủy request' }))
 await userEvent.click(screen.getByRole('button', { name: 'Từ chối' }))
 await userEvent.type(screen.getByLabelText('Lý do từ chối'), 'Đơn không đủ điều kiện')
 await userEvent.click(screen.getByRole('button', { name: 'Xác nhận từ chối' }))
 await waitFor(() => expect(api.reviewCancellation).toHaveBeenCalledWith('request', 'REJECTED', 'Đơn không đủ điều kiện'))
})

it('ghi nhận trạng thái chờ hoàn từ API khi admin duyệt hủy QR', async () => {
  const database = createDemoSeed()
  database.cancellationRequests = [{ id: 'qr-request', orderId: 'order', userId: 'user', reason: 'Không cần nữa', status: 'submitted', createdAt: '2026-01-01' }]
  const dispatch = vi.fn()
  api.reviewCancellation.mockResolvedValue({ request_status: 'APPROVED', refund_status: 'PENDING_REFUND' })
  render(<MemoryRouter><ToastProvider><AdminRequestsPanel database={database} dispatch={dispatch} reviewerId="admin" /></ToastProvider></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: 'Xem yêu cầu hủy qr-request' }))
  await userEvent.click(screen.getByRole('button', { name: 'Duyệt yêu cầu' }))
  await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
    type: 'admin/cancellationReviewed',
    payload: expect.objectContaining({ requestId: 'qr-request', refundStatus: 'PENDING_REFUND' }),
  })))
  expect(screen.getByText('Đã duyệt hủy đơn. Đã ghi nhận khoản chờ hoàn tiền.')).toBeInTheDocument()
})

it('rút gọn mã dài và cho mở mã đầy đủ trong yêu cầu hủy', async () => {
  const database = createDemoSeed()
  const requestId = 'af3fad59-bfec-4e66-94da-9a2271196487'
  const orderId = 'a86d9e41-92fc-4804-a2d8-6f5522a13681'
  database.cancellationRequests = [{ id: requestId, orderId, userId: 'user', reason: 'Không cần nữa', status: 'submitted', createdAt: '2026-01-01' }]
  render(<MemoryRouter><ToastProvider><AdminRequestsPanel database={database} dispatch={vi.fn()} reviewerId="admin" /></ToastProvider></MemoryRouter>)

  expect(screen.getByText('af3fad59…6487')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: `Xem yêu cầu hủy ${requestId}` }))
  const orderLink = screen.getByRole('link', { name: 'Xem đơn hàng' })
  expect(orderLink).toHaveAttribute('href', `/admin?section=orders&orderId=${orderId}`)
  await userEvent.click(screen.getByText('Mã đầy đủ'))
  expect(screen.getByText(requestId, { exact: true })).toBeVisible()
  expect(screen.getByText(orderId, { exact: true })).toBeVisible()
})

it('đặt lý do từ chối trong khung chi tiết và đóng biểu mẫu được', async () => {
  const database = createDemoSeed()
  database.cancellationRequests = [{ id: 'request', orderId: 'order', userId: 'user', reason: 'Không cần nữa', status: 'submitted', createdAt: '2026-01-01' }]
  render(<MemoryRouter><ToastProvider><AdminRequestsPanel database={database} dispatch={vi.fn()} reviewerId="admin" /></ToastProvider></MemoryRouter>)

  await userEvent.click(screen.getByRole('button', { name: 'Xem yêu cầu hủy request' }))
 await userEvent.click(screen.getByRole('button', { name: 'Từ chối' }))
  const reason = screen.getByLabelText('Lý do từ chối')
  expect(screen.getByRole('dialog')).toContainElement(reason)
  expect(screen.getByRole('button', { name: 'Xác nhận từ chối' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))
  expect(screen.queryByLabelText('Lý do từ chối')).not.toBeInTheDocument()
})

it.each(['vnpay', 'vietqr'] as const)('starts processing a confirmed paid %s order without reverting it to PLACED', async paymentMethod => {
  const database = createDemoSeed()
  database.cancellationRequests = []
  database.orders = [{ ...database.orders[0], paymentMethod, status: 'paid', backendStatus: 'PAID', confirmationState: 'CONFIRMED' }]
  const order = database.orders[0]
  api.updateStatus.mockResolvedValue({ order_status: 'PROCESSING' })
  render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: order.orderNumber ?? order.id }))
  expect(screen.queryByRole('button', { name: 'Xác nhận đơn' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu xử lý' }))
  await waitFor(() => expect(api.updateStatus).toHaveBeenCalledWith(order.id, 'PROCESSING'))
  expect(api.confirm).not.toHaveBeenCalled()
})
