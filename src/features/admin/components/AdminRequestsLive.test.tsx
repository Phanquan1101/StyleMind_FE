import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import type { DemoDatabase } from '@/app/store/types'
import { ToastProvider } from '@/shared/ui'
import { saveApiSession } from '@/test/communitySession'
import { AdminRequestsPanel } from './AdminRequestsPanel'

const id = '10000000-0000-0000-0000-000000000003'
const orderId = '10000000-0000-0000-0000-000000000001'
const commerce = '/commerce/api/v1/admin/returns'
const refunds = '/payment/api/v1/refunds/RETURN/' + id
const adminRefunds = '/payment/api/v1/admin/refunds/RETURN/' + id
const request = { return_id: id, order_id: orderId, order_number: 'SM-1001', status: 'REQUESTED', reason: 'Sản phẩm bị lỗi', decision_reason: null, created_at: '2026-11-11T01:00:00Z', items: [], evidence: [], history: [], amount_vnd: 240000 }
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
const database = { cancellationRequests: [], returnRequests: [{ id: 'demo-return', status: 'submitted', createdAt: '2026-01-01' }], users: [] } as unknown as DemoDatabase
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear() })

it('hiển thị yêu cầu từ máy chủ và xử lý duyệt lấy hàng cùng kiểm định', async () => {
  saveApiSession('admin-token', Date.now() + 60000)
  let status = 'REQUESTED'
  const decisions: string[] = []
  const fetcher = vi.fn(async (url, options) => {
    if (url === commerce + '?page=0&size=20') return json({ items: [{ ...request, status }], page: 0, size: 20, total_elements: 1, total_pages: 1 })
    if (url === commerce + '/' + id + '/decision') {
      const payload = JSON.parse(options.body)
      decisions.push(payload.action)
      status = payload.action === 'REQUEST_IMAGES' ? 'MORE_IMAGES_REQUESTED' : payload.action === 'APPROVE_PICKUP' ? 'PICKUP_APPROVED' : 'PENDING_REFUND'
      return json({ ...request, status })
    }
    if (url === refunds) return json({ refund_id: 'refund', source_type: 'RETURN', source_id: id, order_id: orderId, status: 'AWAITING_DETAILS', amount_vnd: 240000 })
    throw new Error('Unexpected endpoint ' + url)
  })
  vi.stubGlobal('fetch', fetcher)
  const dispatch = vi.fn()
  const user = userEvent.setup()
  render(<MemoryRouter><ToastProvider><AdminRequestsPanel database={database} dispatch={dispatch} reviewerId="admin" /></ToastProvider></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Đổi/trả' }))
  expect(await screen.findByRole('link', { name: 'SM-1001' })).toBeVisible()
  expect(screen.queryByText('demo-return')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Yêu cầu thêm ảnh' }))
  await user.type(screen.getByLabelText('Lý do'), 'Vui lòng chụp ảnh nhãn')
  await user.click(screen.getByRole('button', { name: 'Xác nhận yêu cầu thêm ảnh' }))
  expect(await screen.findByText('Cần bổ sung ảnh')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Duyệt lấy hàng' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Từ chối trả hàng' })).not.toBeInTheDocument()
  status = 'REQUESTED'
  await user.click(screen.getByRole('button', { name: 'Tải lại yêu cầu' }))
  expect(await screen.findByText('Đang chờ duyệt trả hàng')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Duyệt lấy hàng' }))
  await user.click(screen.getByRole('button', { name: 'Xác nhận duyệt lấy hàng' }))
  await user.click(await screen.findByRole('button', { name: 'Kiểm định đạt' }))
  await user.click(screen.getByRole('button', { name: 'Xác nhận kiểm định đạt' }))
  expect(await screen.findByText('Đang chờ tài khoản nhận tiền')).toBeVisible()
  expect(decisions).toEqual(['REQUEST_IMAGES', 'APPROVE_PICKUP', 'PASS_INSPECTION'])
  expect(dispatch).not.toHaveBeenCalled()
})

it('chỉ hiển thị tài khoản đã được máy chủ cấp và xác nhận chuyển khoản với mã đối soát', async () => {
  saveApiSession('admin-token', Date.now() + 60000)
  const refund = { refund_id: 'refund', source_type: 'RETURN', source_id: id, order_id: orderId, amount_vnd: 240000, transfer_reference: null, failure_reason: null, refunded_at: null }
  let payload: unknown
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (url === commerce + '?page=0&size=20') return json({ items: [{ ...request, status: 'PENDING_REFUND' }], page: 0, size: 20, total_elements: 1, total_pages: 1 })
    if (url === refunds) return json({ ...refund, status: 'PENDING' })
    if (url === adminRefunds + '/start' && options.method === 'POST') return json({ ...refund, status: 'PROCESSING' })
    if (url === adminRefunds + '/destination' && options.method === 'GET') return json({ bank_name: 'Vietcombank', account_number: '0123456789', account_holder: 'NGUYEN VAN A' })
    if (url === adminRefunds + '/complete' && options.method === 'POST') {
      payload = JSON.parse(options.body)
      return json({ ...refund, status: 'REFUNDED', transfer_reference: 'FT123', refunded_at: '2026-11-11T03:00:00Z' })
    }
    throw new Error('Unexpected endpoint ' + url)
  }))
  const user = userEvent.setup()
  render(<MemoryRouter><ToastProvider><AdminRequestsPanel database={database} dispatch={vi.fn()} reviewerId="admin" /></ToastProvider></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Đổi/trả' }))
  expect(screen.queryByText('0123456789')).not.toBeInTheDocument()
  await user.click(await screen.findByRole('button', { name: 'Bắt đầu hoàn tiền' }))
  await user.click(await screen.findByRole('button', { name: 'Xem tài khoản nhận tiền' }))
  expect(await screen.findByText('0123456789')).toBeVisible()
  await user.type(screen.getByLabelText('Mã giao dịch chuyển khoản'), 'FT123')
  await user.type(screen.getByLabelText('Mã chứng từ'), 'PROOF123')
  await user.click(screen.getByRole('button', { name: 'Xác nhận đã chuyển khoản' }))
  expect(await screen.findByText('Đã hoàn tiền')).toBeVisible()
  expect(screen.queryByText('0123456789')).not.toBeInTheDocument()
  expect(payload).toEqual({ transfer_reference: 'FT123', proof_reference: 'PROOF123' })
})
