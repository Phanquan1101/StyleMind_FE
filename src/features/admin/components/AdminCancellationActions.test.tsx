import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { createDemoSeed } from '@/app/data/demoSeed'
import { ToastProvider } from '@/shared/ui'
import { AdminOrdersPanel } from './AdminOrdersPanel'
import { AdminRequestsPanel } from './AdminRequestsPanel'
const api = vi.hoisted(() => ({ confirm: vi.fn(), reviewCancellation: vi.fn(), updateStatus: vi.fn() }))
const cod = vi.hoisted(() => vi.fn())
vi.mock('@/features/payments/api/paymentClient', () => ({ paymentApi: { confirmDeliveredCod: cod }, paymentErrorMessage: () => 'Chưa xác nhận thu COD.' }))
vi.mock('@/api/commerce', () => ({ commerceApi: { orders: api } }))
it('hoàn tất giao COD rồi ghi nhận thu tiền trên cùng đơn', async () => {
 const database = createDemoSeed()
 database.orders = [{ ...database.orders[0], status: 'shipped', paymentMethod: 'cod' }]
 const id = database.orders[0].id
 api.updateStatus.mockResolvedValue({ order_status: 'COMPLETED' })
 cod.mockResolvedValue({ orderId: id, method: 'COD', status: 'PAID' })
 const reload = vi.fn()
 render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={vi.fn()} onReload={reload} /></ToastProvider></MemoryRouter>)
 await userEvent.click(screen.getByRole('button', { name: 'Giao thành công và thu COD' }))
 await waitFor(() => expect(cod).toHaveBeenCalledWith(id))
 expect(api.updateStatus).toHaveBeenCalledWith(id, 'COMPLETED')
 expect(api.updateStatus.mock.invocationCallOrder.at(-1)!).toBeLessThan(cod.mock.invocationCallOrder.at(-1)!)
 await waitFor(() => expect(reload).toHaveBeenCalled())
})

it('đơn COD cũ được xác nhận thu tiền mà không chuyển trạng thái lần nữa', async () => {
 const database = createDemoSeed()
 database.orders = [{ ...database.orders[0], status: 'completed', paymentMethod: 'cod' }]
 const id = database.orders[0].id
 cod.mockResolvedValue({ orderId: id, method: 'COD', status: 'PAID' })
 const before = api.updateStatus.mock.calls.length
 render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={vi.fn()} /></ToastProvider></MemoryRouter>)
 await userEvent.click(screen.getByRole('button', { name: 'Xác nhận đã thu COD' }))
 await waitFor(() => expect(screen.queryByRole('button', { name: 'Xác nhận đã thu COD' })).not.toBeInTheDocument())
 expect(api.updateStatus.mock.calls).toHaveLength(before)
})

it('không báo hoàn tất nếu khoản thu COD chưa được xác nhận', async () => {
 const database = createDemoSeed()
 database.orders = [{ ...database.orders[0], status: 'shipped', paymentMethod: 'cod' }]
 api.updateStatus.mockResolvedValue({ order_status: 'COMPLETED' })
 cod.mockRejectedValueOnce(new Error('Network unavailable'))
 const dispatch = vi.fn()
 render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={dispatch} /></ToastProvider></MemoryRouter>)
 await userEvent.click(screen.getByRole('button', { name: 'Giao thành công và thu COD' }))
 expect(await screen.findByText(/Đã lưu giao hàng thành công nhưng chưa xác nhận thu COD/)).toBeVisible()
 expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ status: 'completed' }) }))
 expect(screen.queryByText('Đã cập nhật trạng thái đơn hàng.')).not.toBeInTheDocument()
})
it('gọi API xác nhận đơn riêng rồi tải lại', async () => {
 const database = createDemoSeed(); database.orders[0] = { ...database.orders[0], confirmationState: 'UNCONFIRMED', backendStatus: 'PLACED' }
 const reload = vi.fn(); api.confirm.mockResolvedValue({ order_status: 'PLACED', confirmation_state: 'CONFIRMED' })
 render(<MemoryRouter><ToastProvider><AdminOrdersPanel database={database} dispatch={vi.fn()} onReload={reload} /></ToastProvider></MemoryRouter>)
 const row = screen.getByText(database.orders[0].id).closest('tr')!
 await userEvent.click(within(row).getByRole('button', { name: 'Xác nhận đơn' }))
 await waitFor(() => expect(api.confirm).toHaveBeenCalledWith(database.orders[0].id))
 expect(reload).toHaveBeenCalled()
})
it('yêu cầu lý do từ chối và gửi tới API', async () => {
 const database = createDemoSeed(); database.cancellationRequests = [{ id: 'request', orderId: 'order', userId: 'user', reason: 'Không cần nữa', status: 'submitted', createdAt: '2026-01-01' }]
 api.reviewCancellation.mockResolvedValue({ request_status: 'REJECTED' })
 render(<MemoryRouter><ToastProvider><AdminRequestsPanel database={database} dispatch={vi.fn()} reviewerId="admin" /></ToastProvider></MemoryRouter>)
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
  const orderLink = screen.getByRole('link', { name: `Xem đơn hàng ${orderId}` })
  expect(orderLink).toHaveTextContent('a86d9e41…3681')
  expect(orderLink).toHaveAttribute('href', `/admin?section=orders&orderId=${orderId}`)
  await userEvent.click(screen.getByText('Xem mã đầy đủ'))
  expect(screen.getByText(requestId, { exact: true })).toBeVisible()
  expect(screen.getByText(orderId, { exact: true })).toBeVisible()
})

it('đặt lý do từ chối ở hàng riêng thay vì mở rộng cột thao tác', async () => {
  const database = createDemoSeed()
  database.cancellationRequests = [{ id: 'request', orderId: 'order', userId: 'user', reason: 'Không cần nữa', status: 'submitted', createdAt: '2026-01-01' }]
  render(<MemoryRouter><ToastProvider><AdminRequestsPanel database={database} dispatch={vi.fn()} reviewerId="admin" /></ToastProvider></MemoryRouter>)

  const actionRow = screen.getByRole('button', { name: 'Từ chối' }).closest('tr')
  await userEvent.click(screen.getByRole('button', { name: 'Từ chối' }))
  const reason = screen.getByLabelText('Lý do từ chối')
  expect(reason.closest('tr')).not.toBe(actionRow)
  expect(reason.closest('td')).toHaveAttribute('colspan', '7')
  expect(screen.getByRole('button', { name: 'Xác nhận từ chối' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Đóng' }))
  expect(screen.queryByLabelText('Lý do từ chối')).not.toBeInTheDocument()
})
